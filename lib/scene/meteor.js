// Procedural "mineral relic" meteors.
//
// 1. 126 well-spaced points on a sphere → convex hull → its dual gives
//    Goldberg-like polygonal cells.
// 2. Each cell becomes a beveled plate (dark gap → facet ring → raised top
//    with a soft apex). Plates near a fracture band become pale crystal.
// 3. Edges crossing the fracture/seam fields get thin emissive veins.
// 4. The closed meteor is then split into six "petals" that can open like a
//    pearl shell when a project is focused, revealing a halo and the logo.
import {
  AdditiveBlending,
  Box3,
  BufferGeometry,
  Color,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Quaternion,
  RingGeometry,
  ShaderMaterial,
  Vector3,
  MathUtils,
} from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import { TAU, mulberry32 } from "./timeline";

const vec = (x = 0, y = 0, z = 0) => new Vector3(x, y, z);

/** Flat-shaded triangle soup with per-face normals and colours. */
class GeometryBuilder {
  positions = [];
  normals = [];
  colors = [];

  tri(a, b, c, color) {
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    for (const v of [a, b, c]) {
      this.positions.push(v.x, v.y, v.z);
      this.normals.push(normal.x, normal.y, normal.z);
      this.colors.push(color.r, color.g, color.b);
    }
  }

  quad(a, b, c, d, color) {
    this.tri(a, b, c, color);
    this.tri(a, c, d, color);
  }

  geometry() {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute("normal", new Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute("color", new Float32BufferAttribute(this.colors, 3));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

/** Furthest visible vertex from an object's origin, in its local space. */
export function maxLocalRadius(object) {
  object.updateWorldMatrix(true, true);
  const inverse = object.matrixWorld.clone().invert();
  const relative = new Matrix4();
  const point = new Vector3();
  let max = 0;
  object.traverseVisible((child) => {
    if (!(child instanceof Mesh)) return;
    relative.multiplyMatrices(inverse, child.matrixWorld);
    const position = child.geometry.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(relative);
      max = Math.max(max, point.lengthSq());
    }
  });
  return Math.sqrt(max);
}

const petalOf = (direction, offset) =>
  Math.floor((((Math.atan2(direction.y, direction.x) - offset + Math.PI / 6 + 2 * TAU) % TAU) / TAU) * 6) % 6;

const colorKey = (attribute, index) => `${attribute.getX(index)},${attribute.getY(index)},${attribute.getZ(index)}`;

/** Dual of a convex hull of spaced sphere points: cells + their corner directions. */
function sphereCells(random) {
  const points = [];
  for (let attempt = 0; points.length < 126 && attempt < 4000; attempt++) {
    const z = 2 * random() - 1;
    const phi = random() * TAU;
    const r = Math.sqrt(1 - z * z);
    const point = vec(r * Math.cos(phi), r * Math.sin(phi), z);
    if (points.every((other) => other.distanceToSquared(point) > 0.029)) points.push(point);
  }

  const hull = new ConvexGeometry(points);
  const position = hull.getAttribute("position");
  const lookup = new Map();
  const directions = [];
  const triangles = [];
  const orientation = new Quaternion().setFromEuler(new Euler(1.7 * random(), random() * TAU, 1.3 * random()));
  for (let i = 0; i < position.count; i += 3) {
    const triangle = [];
    for (let k = 0; k < 3; k++) {
      const v = vec(position.getX(i + k), position.getY(i + k), position.getZ(i + k));
      const key = `${Math.round(1e5 * v.x)},${Math.round(1e5 * v.y)},${Math.round(1e5 * v.z)}`;
      let index = lookup.get(key);
      if (index === undefined) {
        index = directions.length;
        lookup.set(key, index);
        directions.push(v.normalize().applyQuaternion(orientation));
      }
      triangle.push(index);
    }
    triangles.push(triangle);
  }
  hull.dispose();

  const dualDirections = triangles.map(([a, b, c]) => directions[a].clone().add(directions[b]).add(directions[c]).normalize());
  const rings = directions.map(() => []);
  triangles.forEach((triangle, t) => triangle.forEach((v) => rings[v].push(t)));
  directions.forEach((direction, v) => {
    const tangent = (Math.abs(direction.y) < 0.9 ? vec(0, 1, 0) : vec(1, 0, 0)).cross(direction).normalize();
    const bitangent = direction.clone().cross(tangent);
    const angle = (t) => Math.atan2(dualDirections[t].dot(bitangent), dualDirections[t].dot(tangent));
    rings[v].sort((a, b) => angle(a) - angle(b));
  });
  return { directions, dualDirections, rings };
}

function addVein(builder, start, end, width, color) {
  const along = end.clone().sub(start).normalize();
  const out = start.clone().add(end).normalize();
  const side = along.clone().cross(out).normalize();
  const a = start.clone().addScaledVector(out, 0.027);
  const b = end.clone().addScaledVector(out, 0.027);
  const profile = [
    [-0.5, -0.15],
    [-0.5, 0.15],
    [0.5, 0.15],
    [0.5, -0.15],
  ];
  const ring = (center) => profile.map(([s, n]) => center.clone().addScaledVector(side, s * width).addScaledVector(out, n * width));
  const ra = ring(a);
  const rb = ring(b);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    builder.quad(ra[i], ra[j], rb[j], rb[i], color);
  }
  builder.quad(ra[3], ra[2], ra[1], ra[0], color);
  builder.quad(rb[0], rb[1], rb[2], rb[3], color);
}

function addCrystal(builder, center, radius, random) {
  const geometry = new IcosahedronGeometry(radius, 0);
  const position = geometry.getAttribute("position");
  const rotation = new Quaternion().setFromEuler(new Euler(random() * TAU, random() * TAU, random() * TAU));
  const stretch = vec(0.8 + 0.35 * random(), 0.7 + 0.6 * random(), 0.68 + 0.25 * random());
  const color = new Color("#d9e4ef");
  for (let i = 0; i < position.count; i += 3) {
    const corner = (k) => vec(position.getX(k), position.getY(k), position.getZ(k)).multiply(stretch).applyQuaternion(rotation).add(center);
    builder.tri(corner(i), corner(i + 1), corner(i + 2), color);
  }
  geometry.dispose();
}

/** Builds the closed meteor body for one project. */
function buildRelic(project) {
  const config = project.meteor;
  const random = mulberry32(config.seed >>> 0);
  const accent = new Color(config.accent);
  const { directions, dualDirections, rings } = sphereCells(random);

  const phase = random() * TAU;
  const dentA = vec(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
  const dentB = vec(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
  const corners = dualDirections.map((e) => {
    const bulge =
      1 +
      (0.12 * Math.sin(3.3 * e.x + 2.1 * e.y + phase) +
        0.085 * Math.cos(4.4 * e.z - 1.7 * e.x + 0.7 * phase) +
        0.05 * Math.sin(5.3 * e.y + 2.8 * e.z - phase)) -
      (0.23 * Math.exp(-8 * (1 - e.dot(dentA))) + 0.16 * Math.exp(-12 * (1 - e.dot(dentB))));
    return vec(
      (e.x * bulge + 0.07 * e.y * e.z) * config.scale[0],
      e.y * bulge * config.scale[1],
      (e.z * bulge + 0.05 * e.x * e.y) * config.scale[2],
    );
  });

  const crust = new GeometryBuilder();
  const veins = new GeometryBuilder();
  const crystal = new GeometryBuilder();
  const fractureNormal = vec(0.72 + 0.2 * random(), 0.22 + 0.35 * random(), -0.3 + 0.6 * random()).normalize();
  const fracture = (n) => n.dot(fractureNormal) + 0.17 * Math.sin(7.2 * n.y + 4.3 * n.z + phase) - 0.04;
  const seam = (n) => 0.78 * n.y - 0.51 * n.z + 0.14 * Math.sin(8 * n.x + phase);
  const plateBase = new Color("#404953");
  const facetBase = new Color("#818995");
  const gapColor = new Color("#242c34");
  const crystalColor = new Color("#e8edf2");
  const centers = [];
  const seamCells = [];
  const edges = new Map();

  for (let cell = 0; cell < rings.length; cell++) {
    const ring = rings[cell];
    const normal = directions[cell];
    const polygon = ring.map((i) => corners[i]);
    const center = polygon.reduce((sum, p) => sum.add(p), vec()).multiplyScalar(1 / polygon.length);
    centers.push(center);

    const lift = 0.014 + 0.065 * random();
    const inset = 0.8 + 0.13 * random();
    const tilt = normal
      .clone()
      .add(vec((random() - 0.5) * 0.09, (random() - 0.5) * 0.09, (random() - 0.5) * 0.09))
      .normalize();
    const apex = center.clone().addScaledVector(normal, lift);
    const rim = polygon.map((p) => center.clone().lerp(p, 0.966).addScaledVector(normal, 0.011));
    const top = polygon.map((p) => {
      const t = center.clone().lerp(p, inset);
      return t.addScaledVector(tilt, apex.clone().sub(t).dot(tilt));
    });
    const middle = top.map((p) => apex.clone().lerp(p, 0.58).addScaledVector(tilt, 0.004));
    const peak = apex.clone().addScaledVector(tilt, 0.004);
    const plateColor = plateBase.clone().multiplyScalar(0.62 + 0.73 * random()).lerp(accent, 0.14 + 0.12 * random());
    const facetColor = facetBase.clone().multiplyScalar(0.62 + 0.35 * random()).lerp(accent, 0.12);
    const isCrystal = Math.abs(fracture(normal)) < 0.13 && normal.z > -0.42 && cell % 3 !== 0;
    if (Math.abs(fracture(normal)) < 0.23 && Math.abs(normal.x) > 0.42 && normal.z < 0.55) seamCells.push(cell);

    for (let i = 0; i < ring.length; i++) {
      const j = (i + 1) % ring.length;
      crust.quad(polygon[i], polygon[j], rim[j], rim[i], gapColor);
      crust.quad(rim[i], rim[j], top[j], top[i], facetColor);
      const target = isCrystal ? crystal : crust;
      const color = isCrystal ? crystalColor : plateColor;
      target.quad(top[i], top[j], middle[j], middle[i], color);
      target.tri(peak, middle[i], middle[j], color);

      const a = Math.min(ring[i], ring[j]);
      const b = Math.max(ring[i], ring[j]);
      const key = `${a}:${b}`;
      const edge = edges.get(key);
      if (edge) edge.cells.push(cell);
      else edges.set(key, { a, b, cells: [cell] });
    }
  }

  let fractureEdges = 0;
  for (const edge of edges.values()) {
    if (edge.cells.length !== 2) continue;
    const [c1, c2] = edge.cells;
    const n1 = directions[c1];
    const n2 = directions[c2];
    const crossesFracture = fracture(n1) * fracture(n2) < 0;
    const crossesSeam = seam(n1) * seam(n2) < 0 && (n1.x + n2.x) * 0.5 > -0.1;
    if (crossesFracture || crossesSeam) {
      const width = (crossesFracture ? 0.019 : 0.009) * (0.75 + 0.5 * random());
      addVein(veins, corners[edge.a], corners[edge.b], width, crystalColor);
      fractureEdges++;
    }
  }

  for (let i = 0; i < 3; i++) {
    const cell = seamCells[Math.floor(((i + 0.35) / 3) * seamCells.length)] ?? 17 * i;
    const center = centers[cell].clone().addScaledVector(directions[cell], i === 2 ? 0.08 : 0.045);
    const radius = 0.067 + 0.035 * random();
    addCrystal(crystal, center, radius, random);
  }

  const crustMaterial = new MeshPhysicalMaterial({
    name: "Meteor crust",
    color: "#ffffff",
    vertexColors: true,
    metalness: 0.76,
    roughness: 0.22,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.7,
  });
  const veinMaterial = new MeshStandardMaterial({
    name: "Meteor veins",
    color: accent.clone().multiplyScalar(0.2),
    emissive: accent,
    emissiveIntensity: 2.1,
    roughness: 0.3,
    metalness: 0.18,
  });
  const crystalMaterial = new MeshPhysicalMaterial({
    name: "Meteor crystal",
    color: accent.clone().multiplyScalar(0.9),
    vertexColors: true,
    emissive: accent.clone(),
    emissiveIntensity: 0.08,
    metalness: 0.32,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.07,
    envMapIntensity: 1.4,
    iridescence: 0.32,
    iridescenceThicknessMinimum: 150,
    iridescenceThicknessMaximum: 380,
    transmission: 0,
  });

  const relic = new Group();
  relic.name = `${project.id} mineral relic`;
  const add = (name, builder, material, contactSurface) => {
    const mesh = new Mesh(builder.geometry(), material);
    mesh.name = name;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData = { contactSurface };
    if (!contactSurface) mesh.raycast = () => {};
    relic.add(mesh);
    return mesh;
  };
  add("Meteor crust", crust, crustMaterial, true);
  add("Meteor veins", veins, veinMaterial, false);
  add("Meteor crystal", crystal, crystalMaterial, true);
  relic.updateMatrixWorld(true);

  // Normalise to a 2.4-unit bounding box centred on the origin.
  const box = new Box3().setFromObject(relic);
  const center = box.getCenter(vec());
  const size = box.getSize(vec());
  const scale = 2.4 / Math.max(size.x, size.y, size.z);
  let bodyRadius = 0;
  relic.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.geometry.translate(-center.x, -center.y, -center.z).scale(scale, scale, scale);
    child.geometry.computeBoundingBox();
    child.geometry.computeBoundingSphere();
    if (child.userData.contactSurface) {
      const position = child.geometry.getAttribute("position");
      for (let i = 0; i < position.count; i++) {
        bodyRadius = Math.max(bodyRadius, Math.hypot(position.getX(i), position.getY(i), position.getZ(i)));
      }
    }
  });

  relic.userData = {
    original: true,
    artifactKind: project.id,
    focusRadius: Math.max(1.55, 1.18 * bodyRadius),
    bodyRadius,
    logoFacing: [0, 0, 1],
    plateCount: rings.length,
    fractureEdges,
    seed: config.seed,
  };
  return relic;
}

/** Re-discovers the plates of the crust by its colour runs (gap → facet). */
function recoverPlates(geometry, offset) {
  const position = geometry.getAttribute("position");
  const color = geometry.getAttribute("color");
  if (!color || geometry.index) return [];
  const triangleCount = position.count / 3;
  const gap = colorKey(color, 0);
  const starts = [];
  for (let t = 0; t < triangleCount; t++) {
    if (colorKey(color, 3 * t) === gap && (t === 0 || colorKey(color, (t - 1) * 3) !== gap)) starts.push(t);
  }
  const plates = [];
  let previous = "";
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = starts[i + 1] ?? triangleCount;
    if (end - start < 4) return [];
    const facet = colorKey(color, (start + 2) * 3);
    if (facet !== previous) plates.push({ triangles: [], center: new Vector3(), petal: 0 });
    previous = facet;
    const plate = plates[plates.length - 1];
    for (let t = start; t < end; t++) plate.triangles.push(t);
    plate.center.add(new Vector3().fromBufferAttribute(position, 3 * start));
  }
  for (const plate of plates) {
    plate.center.normalize();
    plate.petal = petalOf(plate.center, offset);
  }
  return plates;
}

/** Assigns every connected piece of a mesh to the nearest plate's petal. */
function petalsByConnectivity(geometry, plates, offset) {
  const position = geometry.getAttribute("position");
  const triangleCount = position.count / 3;
  const parent = new Int32Array(triangleCount);
  const firstAt = new Map();
  for (let t = 0; t < triangleCount; t++) parent[t] = t;
  const find = (t) => {
    let root = t;
    while (parent[root] !== root) root = parent[root];
    while (parent[t] !== t) {
      const next = parent[t];
      parent[t] = root;
      t = next;
    }
    return root;
  };
  for (let t = 0; t < triangleCount; t++) {
    for (let k = 0; k < 3; k++) {
      const v = 3 * t + k;
      const key = `${position.getX(v)},${position.getY(v)},${position.getZ(v)}`;
      const other = firstAt.get(key);
      if (other === undefined) firstAt.set(key, t);
      else parent[find(t)] = find(other);
    }
  }
  const sums = new Map();
  const centroid = new Vector3();
  for (let t = 0; t < triangleCount; t++) {
    const root = find(t);
    let sum = sums.get(root);
    if (!sum) {
      sum = new Vector3();
      sums.set(root, sum);
    }
    const i = 3 * t;
    centroid.set(
      (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3,
      (position.getY(i) + position.getY(i + 1) + position.getY(i + 2)) / 3,
      (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3,
    );
    sum.add(centroid);
  }
  const petalForRoot = new Map();
  for (const [root, sum] of sums) {
    sum.normalize();
    let petal = petalOf(sum, offset);
    let best = -Infinity;
    for (const plate of plates) {
      const dot = sum.dot(plate.center);
      if (dot > best) {
        best = dot;
        petal = plate.petal;
      }
    }
    petalForRoot.set(root, petal);
  }
  const result = new Int8Array(triangleCount);
  for (let t = 0; t < triangleCount; t++) result[t] = petalForRoot.get(find(t));
  return result;
}

function splitByPetal(geometry, petals) {
  const attributes = Object.entries(geometry.attributes);
  const buckets = Array.from({ length: 6 }, () => attributes.map(() => []));
  for (let t = 0; t < petals.length; t++) {
    const bucket = buckets[petals[t]];
    for (let a = 0; a < attributes.length; a++) {
      const attribute = attributes[a][1];
      for (let v = 0; v < 3; v++) {
        for (let c = 0; c < attribute.itemSize; c++) bucket[a].push(attribute.getComponent(3 * t + v, c));
      }
    }
  }
  return buckets.map((bucket) => {
    if (!bucket[0].length) return null;
    const part = new BufferGeometry();
    attributes.forEach(([name, attribute], a) => part.setAttribute(name, new Float32BufferAttribute(bucket[a], attribute.itemSize)));
    part.computeBoundingBox();
    part.computeBoundingSphere();
    return part;
  });
}

/**
 * Builds a project meteor that can open into six petals.
 * Returns `{ root, update(open, hover, time), innerRadius }`.
 */
export function createMeteor(project) {
  const relic = buildRelic(project);
  relic.updateMatrixWorld(true);
  const closedRadius = maxLocalRadius(relic);
  const closedSize = new Box3().setFromObject(relic, true).getSize(new Vector3());

  const root = new Group();
  root.name = `${relic.name} / orbital reveal`;
  root.userData = { ...relic.userData, revealStyle: "six mineral petals", closedBodyRadius: closedRadius, petalCount: 6 };
  const offset = 0.16 + (Number(relic.userData.seed) % 13) * 0.009;
  relic.name = "Meteor closed display";

  const display = new Group();
  display.name = "Meteor orbital display";
  root.add(relic, display);
  const petals = Array.from({ length: 6 }, (_, i) => {
    const petal = new Group();
    petal.name = `Mineral petal ${i + 1}`;
    petal.userData.pearlPetal = i;
    display.add(petal);
    return petal;
  });

  const meshes = [];
  relic.traverse((child) => {
    if (child instanceof Mesh) meshes.push(child);
  });
  const crustMesh = meshes.find((mesh) => mesh.material instanceof MeshPhysicalMaterial && mesh.material.name === "Meteor crust");
  const plates = crustMesh ? recoverPlates(crustMesh.geometry, offset) : [];
  const haloAccent = new Color("#83c9e5");
  const identity = new Matrix4();
  let shellTriangles = 0;
  let petalMeshes = 0;

  for (const mesh of meshes) {
    mesh.userData = { ...mesh.userData, originalClosedSurface: true, alternateSurface: false };
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (material.name === "Meteor veins" && material instanceof MeshStandardMaterial) haloAccent.copy(material.emissive);
    }
    let geometry = mesh.geometry;
    if (geometry.index) geometry = geometry.toNonIndexed();
    if (!mesh.matrixWorld.equals(identity)) {
      const moved = geometry.clone().applyMatrix4(mesh.matrixWorld);
      if (geometry !== mesh.geometry) geometry.dispose();
      geometry = moved;
    }
    const petalIndex = new Int8Array(geometry.getAttribute("position").count / 3);
    if (mesh === crustMesh && plates.length) {
      for (const plate of plates) for (const t of plate.triangles) petalIndex[t] = plate.petal;
    } else {
      petalIndex.set(petalsByConnectivity(geometry, plates, offset));
    }
    const parts = splitByPetal(geometry, petalIndex);
    for (let p = 0; p < 6; p++) {
      const part = parts[p];
      if (!part) continue;
      const shell = new Mesh(part, mesh.material);
      shell.name = mesh.name;
      shell.userData = { ...mesh.userData, pearlShell: "petal", pearlPetal: p, originalClosedSurface: true, alternateSurface: true };
      shell.castShadow = mesh.castShadow;
      shell.receiveShadow = mesh.receiveShadow;
      shell.frustumCulled = mesh.frustumCulled;
      if (mesh.raycast !== Mesh.prototype.raycast) shell.raycast = mesh.raycast;
      petals[p].add(shell);
      shellTriangles += part.getAttribute("position").count / 3;
      petalMeshes++;
    }
    if (geometry !== mesh.geometry) geometry.dispose();
  }

  const halo = new Mesh(
    new RingGeometry(0.2, 0.46, 72),
    new ShaderMaterial({
      name: "Pearl light halo",
      uniforms: { accent: { value: haloAccent.clone() } },
      vertexShader: "varying vec2 vLocal; void main(){vLocal=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader: /* glsl */ `uniform vec3 accent; varying vec2 vLocal;
        void main(){float r=length(vLocal); float soft=exp(-pow((r-.325)/.081,2.0));
        float rim=exp(-pow((r-.326)/.009,2.0)); gl_FragColor=vec4(accent*(.65+rim*.6),soft*.20+rim*.27);}`,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      forceSinglePass: true,
      toneMapped: false,
    }),
  );
  halo.name = "Pearl light halo";
  halo.userData = { contactSurface: false, pearlInterior: true };
  halo.raycast = () => {};
  display.add(halo);

  const motion = petals.map((_, i) => {
    const angle = offset + (i * TAU) / 6;
    return {
      x: Math.cos(angle),
      y: Math.sin(angle),
      axis: new Vector3(-Math.sin(angle), Math.cos(angle), 0),
      travel: 0.6 + 0.027 * Math.sin(2.4 * i + offset),
      tilt: 0.1 + 0.018 * Math.cos(1.8 * i),
      depth: -0.09 + 0.024 * Math.sin(2.1 * i),
    };
  });
  const pearlCenter = [0, 0, 0.15];
  Object.assign(root.userData, {
    pearlCenter,
    innerRadius: 0,
    closedDimensions: closedSize.toArray(),
    closedMaxSpan: Math.max(closedSize.x, closedSize.y, closedSize.z),
    openHingeRadians: 0,
    recoveredMineralPlates: plates.length,
    closedMeshDraws: meshes.length,
    petalMeshDraws: petalMeshes,
    shellTriangles,
    logoClearRadius: 0.39,
    hoverEnvelopePadding: 0.13,
    maxHoverRadius: closedRadius + 0.13,
  });

  let lastOpen = -1;
  let lastHover = -1;
  let lastTime = -1;
  const update = (open, hover = 0, time = 0) => {
    const o = Number.isFinite(open) ? Math.max(0, Math.min(1, open)) : 0;
    const h = (Number.isFinite(hover) ? Math.max(0, Math.min(1, hover)) : 0) * (1 - MathUtils.smoothstep(o, 0, 0.22));
    const hoverEase = h * h * (3 - 2 * h);
    const t = Number.isFinite(time) ? time % 1e5 : 0;
    if (o === lastOpen && h === lastHover && (h === 0 || t === lastTime)) return;
    lastOpen = o;
    lastHover = h;
    lastTime = t;

    const openEase = o * o * (3 - 2 * o);
    relic.visible = o <= 0.001 && h <= 0.001;
    display.visible = !relic.visible;
    const shared = 0.0023 * Math.sin(17 * t + offset);
    for (let i = 0; i < 6; i++) {
      const petal = petals[i];
      const m = motion[i];
      const breathe =
        hoverEase *
        (0.105 + 0.009 * Math.sin(2.4 * i + offset) + 0.0025 * Math.sin(2.7 * t + 0.32 * i) + shared + 0.0012 * Math.sin(23 * t + 0.83 * i));
      const sway = hoverEase * Math.sin(19 * t + offset + 0.61 * i) * 0.0025;
      const bob = hoverEase * Math.sin(15 * t + offset + 0.74 * i) * 0.003;
      const hinge = m.tilt * openEase + hoverEase * Math.sin(17 * t + 0.7 * i) * 0.002;
      petal.position.set(
        m.x * m.travel * openEase + m.x * breathe - m.y * sway,
        m.y * m.travel * openEase + m.y * breathe + m.x * sway,
        m.depth * openEase + bob,
      );
      petal.quaternion.setFromAxisAngle(m.axis, hinge);
      petal.scale.setScalar(1 - 0.14 * openEase);
    }
    const haloScale = Math.max(0, Math.min(1, (openEase - 0.08) / 0.72));
    halo.visible = o > 0.001;
    halo.scale.setScalar(haloScale);
    halo.position.z = 0.115 + 0.1 * openEase;
    pearlCenter[2] = 0.15 + 0.1 * openEase;
    root.userData.openAmount = openEase;
    root.userData.hoverAmount = hoverEase;
  };

  update(1);
  root.updateMatrixWorld(true);
  const openBox = new Box3().setFromObject(display, true);
  root.userData.fullyOpenDimensions = openBox.getSize(new Vector3()).toArray();
  root.userData.maxOpenRadius = closedRadius + Math.max(...motion.map((m) => Math.hypot(m.travel, m.depth)));
  update(0);
  root.updateMatrixWorld(true);

  root.traverse((child) => {
    if (child instanceof Mesh) child.raycast = () => {};
  });
  return { root, update, innerRadius: 0 };
}

/** Disposes every geometry, material and texture under an object. */
export function disposeObject(object) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    geometries.add(child.geometry);
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  textures.forEach((t) => t.dispose());
  materials.forEach((m) => m.dispose());
  geometries.forEach((g) => g.dispose());
}
