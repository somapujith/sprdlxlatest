// Smaller scene pieces: cratered project moons, constellation lines from the
// light axis to each meteor, embedded logo badges and the studio environment
// map used for reflections.
import {
  AdditiveBlending,
  BufferAttribute,
  CanvasTexture,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  EquirectangularReflectionMapping,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PMREMGenerator,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  BufferGeometry,
} from "three";

/* ------------------------------------------------------------------ moons */

function moonGeometry() {
  const craters = Array.from({ length: 11 }, (_, t) => {
    const n = 1 - ((t + 0.5) * 2) / 11;
    const angle = 2.399963 * t;
    const ring = Math.sqrt(1 - n * n);
    return { direction: new Vector3(Math.cos(angle) * ring, n, Math.sin(angle) * ring), size: 0.15 + (t % 4) * 0.052 };
  });
  const surface = (dir) => {
    let radius = 0.96 + 0.025 * Math.sin(8 * dir.x + 4 * dir.z) * Math.cos(7 * dir.y - 3 * dir.z);
    let rim = 0;
    for (const crater of craters) {
      const d = dir.distanceTo(crater.direction) / crater.size;
      if (d > 1.7) continue;
      radius -= 0.074 * Math.exp(-d * d * 2.8);
      const lip = Math.exp(-Math.pow((d - 0.95) * 6, 2));
      radius += 0.024 * lip;
      rim = Math.max(rim, lip);
    }
    const grain = Math.sin(47 * dir.x + 19 * dir.y) * Math.sin(39 * dir.y - 29 * dir.z) * Math.cos(53 * dir.z + 11 * dir.x);
    return { radius: radius + 0.006 * grain, shade: 0.38 + 0.045 * grain + 0.23 * rim };
  };

  const geometry = new SphereGeometry(1, 40, 28);
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const dir = new Vector3();
  const color = new Color();
  let max = 0;
  for (let i = 0; i < position.count; i++) {
    dir.fromBufferAttribute(position, i).normalize();
    const { radius, shade } = surface(dir);
    max = Math.max(max, radius);
    position.setXYZ(i, dir.x * radius, dir.y * radius, dir.z * radius);
    color.setRGB(0.9 * shade, 0.96 * shade, shade);
    color.toArray(colors, i * 3);
  }
  geometry.scale(1 / max, 1 / max, 1 / max);
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  // Two thin luminous mineral seams wrapping around each moon.
  const seamPositions = [];
  const a = new Vector3();
  const b = new Vector3();
  const onSurface = (lon, polar, out) => {
    out.set(Math.sin(polar) * Math.cos(lon), Math.cos(polar), Math.sin(polar) * Math.sin(lon));
    return out.multiplyScalar((surface(out).radius + 0.006) / max);
  };
  for (let s = 0; s < 2; s++) {
    for (let t = 0; t < 22; t++) {
      const quad = [];
      for (const i of [t / 22, (t + 1) / 22]) {
        const lon = 0.3 + 2.8 * s + 1.1 * i;
        const polar = 0.5 + 0.85 * i + 0.022 * Math.sin(19 * i);
        onSurface(lon, polar - 0.0028, a);
        onSurface(lon, polar + 0.0028, b);
        quad.push(a.toArray(), b.toArray());
      }
      for (const k of [0, 1, 2, 2, 1, 3]) seamPositions.push(...quad[k]);
    }
  }
  const seams = new BufferGeometry();
  seams.setAttribute("position", new Float32BufferAttribute(seamPositions, 3));
  seams.computeBoundingSphere();
  return { geometry, seams };
}

export function createMoons(colors) {
  const { geometry, seams } = moonGeometry();
  const surfaceMaterial = new MeshStandardMaterial({ color: "#edf2fa", vertexColors: true, metalness: 0.48, roughness: 0.48 });
  const seamMaterial = new MeshBasicMaterial({ color: "#b8dfeb", side: DoubleSide });
  const bodies = new InstancedMesh(geometry, surfaceMaterial, 2 * colors.length);
  const lines = new InstancedMesh(seams, seamMaterial, 2 * colors.length);
  bodies.name = "Cratered moon surfaces";
  lines.name = "Exposed mineral seams";
  const root = new Group();
  root.name = "Project moons";
  root.add(bodies, lines);

  const meshes = [bodies, lines];
  const dummy = new Object3D();
  const tint = new Color();
  for (const mesh of meshes) {
    mesh.frustumCulled = false;
    mesh.raycast = () => {};
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    for (let n = 0; n < colors.length; n++) {
      for (let i = 0; i < 2; i++) {
        mesh.setColorAt(2 * n + i, tint.set("#d3dae5").lerp(colors[n], mesh === lines ? 0.65 : 0.24));
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(2 * n + i, dummy.matrix);
      }
    }
  }

  return {
    root,
    /** Two moons circle each visible meteor (one on phones). */
    update(index, host, radius, time, presence, mobile) {
      for (let s = 0; s < 2; s++) {
        const angle = time * (s ? -0.23 : 0.19) + 1.7 * index + 2.7 * s;
        const distance = radius + 0.38 + 0.14 * s;
        dummy.position.set(Math.cos(angle) * distance, Math.sin(angle) * distance * 0.96, Math.sin(angle + index) * distance * 0.2);
        dummy.position.multiplyScalar(host.scale.x).add(host.position);
        const shown = host.visible && (!mobile || s === 0);
        dummy.scale.setScalar(shown ? (s ? 0.085 : 0.13) * host.scale.x * presence : 0);
        dummy.rotation.set(0.12 * time + index, angle, 0.3 * index);
        dummy.updateMatrix();
        for (const mesh of meshes) mesh.setMatrixAt(2 * index + s, dummy.matrix);
      }
    },
    flush() {
      for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
      seams.dispose();
      surfaceMaterial.dispose();
      seamMaterial.dispose();
      meshes.forEach((mesh) => mesh.dispose());
    },
  };
}

/* ------------------------------------------------------- constellation */

export function createConstellation(count) {
  const positions = new Float32Array(24 * count * 6);
  const colors = new Float32Array(positions.length);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage));
  geometry.setAttribute("color", new BufferAttribute(colors, 3).setUsage(DynamicDrawUsage));
  const material = new LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    toneMapped: false,
    blending: AdditiveBlending,
  });
  const lines = new LineSegments(geometry, material);
  lines.frustumCulled = false;
  lines.raycast = () => {};
  return {
    lines,
    /** Arcing gradient tether from a station on the axis to its meteor. */
    update(index, from, to, colorA, colorB, intensity, time) {
      for (let u = 0; u < 24; u++) {
        for (let c = 0; c < 2; c++) {
          const h = (u + c) / 24;
          const i = (24 * index * 2 + 2 * u + c) * 3;
          positions[i] = MathUtils.lerp(from.x, to.x, h);
          positions[i + 1] = MathUtils.lerp(from.y, to.y, h) + Math.sin(h * Math.PI) * (0.32 + 0.06 * Math.sin(0.45 * time + index + h * Math.PI * 2));
          positions[i + 2] = MathUtils.lerp(from.z, to.z, h) + 0.25 * Math.sin(h * Math.PI);
          const pulse = 0.82 + 0.18 * Math.pow(0.5 + 0.5 * Math.sin(12 * h - 0.8 * time + index), 8);
          colors[i] = MathUtils.lerp(colorA.r, colorB.r, h) * intensity * pulse;
          colors[i + 1] = MathUtils.lerp(colorA.g, colorB.g, h) * intensity * pulse;
          colors[i + 2] = MathUtils.lerp(colorA.b, colorB.b, h) * intensity * pulse;
        }
      }
    },
    commit() {
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/* ----------------------------------------------------------- logo badge */

/**
 * A camera-facing logo plate embedded in each meteor. Draws the project logo
 * (or its title) onto a canvas texture over a soft dark disc.
 */
export function createLogoBadge(host, project, onChange) {
  const canvas = document.createElement("canvas");
  const compact = matchMedia("(max-width: 700px), (pointer: coarse)").matches;
  canvas.width = canvas.height = compact ? 512 : 1024;
  const context = canvas.getContext("2d");
  if (compact) context.scale(0.5, 0.5);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;

  const group = new Group();
  group.scale.setScalar(0.7);
  const backdrop = new Mesh(
    new PlaneGeometry(1.32, 1.32),
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uPresence: { value: 1 } },
      vertexShader: /* glsl */ `varying vec2 vUv;
        void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: /* glsl */ `uniform float uPresence; varying vec2 vUv;
        void main(){float r=length(vUv-.5)*2.;
          float a=(1.-smoothstep(.22,.98,r))*.66*uPresence;
          if(a<.001)discard;gl_FragColor=vec4(.006,.012,.018,a);
          #include <colorspace_fragment>
        }`,
    }),
  );
  const face = new Mesh(new PlaneGeometry(0.94, 0.94), new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }));
  face.position.z = 0.006;
  for (const mesh of [backdrop, face]) mesh.raycast = () => {};
  group.add(backdrop, face);
  group.name = `embedded-logo-${project.id}`;
  host.add(group);

  let disposed = false;
  const drawTitle = () => {
    if (disposed) return;
    context.clearRect(0, 0, 1024, 1024);
    context.fillStyle = "#f1f4f2";
    context.font = "500 100px Manrope, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(project.title, 512, 512, 900);
    texture.needsUpdate = true;
  };
  drawTitle();

  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });
  const image = new Image();
  if (project.logo) {
    image.onload = () => {
      if (disposed) return;
      context.clearRect(0, 0, 1024, 1024);
      const scale = Math.min(800 / image.naturalWidth, 650 / image.naturalHeight);
      const w = image.naturalWidth * scale;
      const h = image.naturalHeight * scale;
      context.drawImage(image, (1024 - w) / 2, (1024 - h) / 2, w, h);
      texture.needsUpdate = true;
      resolveReady();
      onChange();
    };
    image.onerror = () => {
      resolveReady();
      onChange();
    };
    image.src = project.logo;
  } else {
    // Redraw once Manrope is available so the title uses the brand font.
    const fonts = typeof document !== "undefined" ? document.fonts : null;
    (fonts ? fonts.load("500 100px Manrope").catch(() => {}) : Promise.resolve()).then(() => {
      drawTitle();
      resolveReady();
      onChange();
    });
  }

  return {
    group,
    ready,
    prepareTexture(renderer) {
      if (!disposed) renderer.initTexture(texture);
    },
    setPresence(presence, open = 0) {
      group.visible = presence > 0.001;
      backdrop.material.uniforms.uPresence.value = presence * (1 - 0.88 * open);
      face.material.opacity = presence;
    },
    dispose() {
      disposed = true;
      image.onload = null;
      image.onerror = null;
      resolveReady();
      host.remove(group);
      texture.dispose();
      for (const mesh of [backdrop, face]) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    },
  };
}

/** Returns a function that keeps a badge between the camera and the meteor. */
export function createBadgePlacement(host, group, closedRadius) {
  const inverse = new Matrix4();
  const look = new Matrix4();
  const eye = new Vector3();
  const up = new Vector3();
  const orientation = new Quaternion();
  const center = new Vector3();
  const direction = new Vector3();
  return (camera, open = 0, innerRadius = 0, meteor, hoverPad = 0) => {
    host.updateWorldMatrix(true, false);
    inverse.copy(host.matrixWorld).invert();
    camera.getWorldPosition(eye).applyMatrix4(inverse);
    camera.getWorldQuaternion(orientation);
    up.set(0, 1, 0).applyQuaternion(orientation).transformDirection(inverse);
    center.set(0, 0, Number(meteor?.userData.pearlCenter?.[2] ?? 0) * open);
    if (meteor) center.applyQuaternion(meteor.quaternion);
    const distance = MathUtils.lerp(closedRadius + hoverPad + 0.03, innerRadius + 0.03, open);
    direction.copy(eye).sub(center).normalize();
    group.position.copy(center).addScaledVector(direction, distance);
    look.lookAt(eye, center, up);
    group.quaternion.setFromRotationMatrix(look);
  };
}

/* ------------------------------------------------------ environment map */

/** A soft "photo studio" equirect: graded sky with four light panels. */
export function createStudioEnvironment(renderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  const sky = context.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, "#87949f");
  sky.addColorStop(0.25, "#26313b");
  sky.addColorStop(0.6, "#0e141e");
  sky.addColorStop(1, "#050810");
  context.fillStyle = sky;
  context.fillRect(0, 0, 1024, 512);
  const panel = (x, y, w, h, color) => {
    const g = context.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, "#131a22");
    g.addColorStop(0.1, color);
    g.addColorStop(0.9, color);
    g.addColorStop(1, "#131a22");
    context.fillStyle = g;
    context.fillRect(x, y, w, h);
  };
  panel(110, 50, 130, 230, "#ffffff");
  panel(660, 20, 220, 180, "#e3e8ef");
  panel(385, 80, 30, 330, "#b8cafd");
  panel(915, 165, 55, 250, "#dcc5a9");
  const texture = new CanvasTexture(canvas);
  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = SRGBColorSpace;
  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromEquirectangular(texture);
  texture.dispose();
  pmrem.dispose();
  return target;
}
