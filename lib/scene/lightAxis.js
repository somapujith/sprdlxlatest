// The vertical "aurora light axis" the camera descends: four thin strands with
// dark gaps, two faint wisps, sixteen drifting motes and a travelling carrier
// light that parks at the current project's station.
import {
  AdditiveBlending,
  Box3,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  Points,
  ShaderMaterial,
  Sphere,
  Vector2,
  Vector3,
} from "three";
import { TAU } from "./timeline";

const pathChunk = /* glsl */ `
uniform float uTime;
uniform float uEnd;
vec3 lightPath(float t, float seed) {
  float phase = seed * 1.5707963;
  float angle = phase + t * 6.2831853 * (1.16 + seed * 0.085)
    + 0.20 * sin(t * 6.2831853 * 1.45 + seed)
    + 0.028 * sin(uTime * 0.10 + seed);
  float radius = 0.16 + 0.04 * sin(t * 6.2831853 * 0.75 + seed)
    + 0.06 * pow(sin(t * 3.14159265 * 0.65 + seed), 2.0);
  float cx = 0.08 * sin(t * 6.2831853 * 0.76 - 0.3) + 0.03 * sin(t * 6.2831853 * 1.8);
  float cz = 0.17 * cos(t * 6.2831853 * 0.72 + 0.45) + 0.045 * sin(t * 6.2831853 * 1.7);
  return vec3(cx + cos(angle) * radius + 0.012 * sin(t * 17.0 + uTime * 0.12 + seed),
    15.0 - 30.0 * t,
    cz + sin(angle) * radius * 0.74 + 0.012 * cos(t * 13.0 - uTime * 0.11 + seed));
}
`;

const colorChunk = /* glsl */ `
uniform float uTime;
uniform float uEnd;
uniform float uStrength;
uniform vec3 uCyan;
uniform vec3 uViolet;
uniform vec3 uPink;
uniform vec3 uAccent;
uniform float uAccentMix;
vec3 lightColor(float t) {
  vec3 base = t < 0.5 ? mix(uCyan, uViolet, smoothstep(0.0, 0.5, t))
    : mix(uViolet, uPink, smoothstep(0.5, 1.0, t));
  return mix(base, uAccent, uAccentMix);
}
float endFade(float t) {
  return smoothstep(0.0, 0.035, t) * smoothstep(0.0, 0.035, uEnd - t);
}
`;

const strandVertex =
  pathChunk +
  /* glsl */ `
attribute float aT;
attribute float aSeed;
attribute float aSide;
uniform float uWisp;
varying float vT;
varying float vSeed;
varying float vSide;
void main() {
  vec3 p = lightPath(aT, aSeed);
  vec3 before = lightPath(max(0.0, aT - 0.0005), aSeed);
  vec3 after = lightPath(min(uEnd, aT + 0.0005), aSeed);
  vec3 viewTangent = normalize((modelViewMatrix * vec4(after - before, 0.0)).xyz);
  vec3 sideDirection = cross(viewTangent, vec3(0.0, 0.0, 1.0));
  if (dot(sideDirection, sideDirection) < 0.00001) sideDirection = vec3(1.0, 0.0, 0.0);
  sideDirection = normalize(sideDirection);
  float halfWidth = mix(0.036, 0.10, uWisp)
    * (0.82 + 0.18 * sin(aT * 16.0 + aSeed * 1.3));
  vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
  viewPosition.xyz += sideDirection * aSide * halfWidth;
  gl_Position = projectionMatrix * viewPosition;
  vT = aT; vSeed = aSeed; vSide = aSide;
}
`;

const strandFragment =
  colorChunk +
  /* glsl */ `
uniform float uWisp;
varying float vT;
varying float vSeed;
varying float vSide;
void main() {
  float across = abs(vSide);
  float halo = exp(-4.2 * across * across) * (1.0 - smoothstep(0.70, 1.0, across));
  float core = exp(-62.0 * across * across);
  float pattern = 0.5 + 0.5 * sin(vT * 14.5 + vSeed * 1.8 - uTime * 0.14);
  float gaps = mix(smoothstep(0.17, 0.57, pattern), smoothstep(0.62, 0.92, pattern), uWisp);
  float drift = 0.76 + 0.24 * sin(vT * 22.0 - uTime * 0.35 + vSeed);
  float shape = mix(core * 0.62 + halo * 0.24, halo * 0.68, uWisp);
  float opacity = mix(0.46, 0.075, uWisp) * shape * gaps * drift * endFade(vT) * uStrength;
  if (opacity < 0.0005) discard;
  gl_FragColor = vec4(lightColor(vT), opacity);
  #include <colorspace_fragment>
}
`;

const moteVertex =
  pathChunk +
  /* glsl */ `
attribute float aSeed;
varying float vT;
varying float vFade;
void main() {
  float t = uEnd * fract(aSeed * 0.618033989 + uTime * (0.005 + mod(aSeed, 3.0) * 0.0008));
  vec3 p = lightPath(t, mod(aSeed, 4.0));
  vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = (1.8 + 0.8 * sin(aSeed * 1.7)) * clamp(15.0 / max(1.0, -viewPosition.z), 0.65, 1.45);
  vT = t;
  vFade = 0.5 + 0.5 * sin(uTime * 0.21 + aSeed * 2.3);
}
`;

const moteFragment =
  colorChunk +
  /* glsl */ `
varying float vT;
varying float vFade;
void main() {
  float radius = length(gl_PointCoord - vec2(0.5)) * 2.0;
  float spot = exp(-5.0 * radius * radius) * (1.0 - smoothstep(0.65, 1.0, radius));
  float opacity = spot * smoothstep(0.42, 0.88, vFade) * endFade(vT) * uStrength * 0.25;
  if (opacity < 0.001) discard;
  gl_FragColor = vec4(lightColor(vT), opacity);
  #include <colorspace_fragment>
}
`;

const carrierVertex =
  pathChunk +
  /* glsl */ `
attribute float aTrail;
uniform float uGalleryProgress;
uniform float uLastStation;
uniform float uCarrierPixelRatio;
uniform float uCarrierHaloPixels;
varying float vT;
varying float vCarrierFade;
varying float vTrail;
void main() {
  float cycle = fract(uTime / 8.5 + 0.24);
  float stationT = mix(0.20, uLastStation, clamp(uGalleryProgress, 0.0, 1.0));
  float t = stationT - 0.070 + cycle * 0.140 - aTrail * 0.00145;
  vec3 p = lightPath(t, 1.0);
  vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  float head = 1.0 - step(0.5, aTrail);
  float trailPixels = mix(8.5, 3.0, clamp(aTrail / 6.0, 0.0, 1.0));
  gl_PointSize = mix(trailPixels, uCarrierHaloPixels, head) * uCarrierPixelRatio;
  vT = t;
  vTrail = aTrail;
  vCarrierFade = smoothstep(0.0, 0.12, cycle) * (1.0 - smoothstep(0.85, 1.0, cycle));
}
`;

const carrierFragment =
  colorChunk +
  /* glsl */ `
varying float vT;
varying float vCarrierFade;
varying float vTrail;
void main() {
  float radius = length(gl_PointCoord - vec2(0.5)) * 2.0;
  float halo = exp(-3.8 * radius * radius) * (1.0 - smoothstep(0.74, 1.0, radius));
  float core = 1.0 - smoothstep(0.18, 0.34, radius);
  float head = 1.0 - step(0.5, vTrail);
  vec3 haloColor = mix(uCyan, uViolet, smoothstep(0.20, 0.80, vT));
  haloColor = mix(haloColor, uAccent, uAccentMix * 0.35);
  vec3 color = mix(haloColor, vec3(1.0), core * head);
  float headAlpha = min(1.0, core * 0.98 + halo * 0.44);
  float tailAlpha = halo * 0.34 * exp(-vTrail * 0.38);
  float opacity = mix(tailAlpha, headAlpha, head) * vCarrierFade * sqrt(clamp(uStrength, 0.0, 1.0));
  if (opacity < 0.001) discard;
  gl_FragColor = vec4(color, opacity);
  #include <colorspace_fragment>
}
`;

/** CPU twin of the GLSL lightPath (with uTime = 0). */
export function lightPathPoint(t, seed) {
  const angle =
    seed * Math.PI * 0.5 + t * TAU * (1.16 + 0.085 * seed) + 0.2 * Math.sin(t * TAU * 1.45 + seed) + 0.028 * Math.sin(seed);
  const radius = 0.16 + 0.04 * Math.sin(t * TAU * 0.75 + seed) + 0.06 * Math.sin(t * Math.PI * 0.65 + seed) ** 2;
  const cx = 0.08 * Math.sin(t * TAU * 0.76 - 0.3) + 0.03 * Math.sin(t * TAU * 1.8);
  const cz = 0.17 * Math.cos(t * TAU * 0.72 + 0.45) + 0.045 * Math.sin(t * TAU * 1.7);
  return [
    cx + Math.cos(angle) * radius + 0.012 * Math.sin(17 * t + seed),
    15 - 30 * t,
    cz + Math.sin(angle) * radius * 0.74 + 0.012 * Math.cos(13 * t + seed),
  ];
}

function setPathBounds(geometry, end) {
  geometry.boundingBox = new Box3(new Vector3(-0.62, 15 - 30 * end - 0.08, -0.57), new Vector3(0.62, 15.08, 0.57));
  geometry.boundingSphere = geometry.boundingBox.getBoundingSphere(new Sphere());
}

function strandGeometry(seeds, segments, end) {
  const positions = [];
  const ts = [];
  const seedValues = [];
  const sides = [];
  const index = [];
  for (const seed of seeds) {
    const base = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
      const t = (end * i) / segments;
      const point = lightPathPoint(t, seed);
      for (const side of [-1, 1]) {
        positions.push(...point);
        ts.push(t);
        seedValues.push(seed);
        sides.push(side);
      }
      if (i < segments) {
        const a = base + 2 * i;
        index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aT", new Float32BufferAttribute(ts, 1));
  geometry.setAttribute("aSeed", new Float32BufferAttribute(seedValues, 1));
  geometry.setAttribute("aSide", new Float32BufferAttribute(sides, 1));
  geometry.setIndex(index);
  setPathBounds(geometry, end);
  return geometry;
}

export function createLightAxis(lastStation = 0.8) {
  const end = Math.max(1, lastStation + 0.1);
  const root = new Group();
  root.name = "Sparse aurora light axis with travelling carrier";

  const uniforms = {
    uTime: { value: 0 },
    uStrength: { value: 0 },
    uEnd: { value: end },
    uCyan: { value: new Color("#78b6cc") },
    uViolet: { value: new Color("#a098c8") },
    uPink: { value: new Color("#c28fae") },
    uAccent: { value: new Color("#9da5c8") },
    uAccentMix: { value: 0 },
    uGalleryProgress: { value: 0 },
    uLastStation: { value: lastStation },
    uCarrierPixelRatio: { value: 1 },
    uCarrierHaloPixels: { value: 22 },
  };

  const material = (vertexShader, fragmentShader, wisp = 0) =>
    new ShaderMaterial({
      uniforms: { ...uniforms, uWisp: { value: wisp } },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
      side: DoubleSide,
      toneMapped: false,
    });

  const strands = new Mesh(strandGeometry([0, 1, 2, 3], 256, end), material(strandVertex, strandFragment));
  strands.name = "Four thin light strands with dark gaps";
  const wisps = new Mesh(strandGeometry([4.3, 5.7], 192, end), material(strandVertex, strandFragment, 1));
  wisps.name = "Two faint intermittent aurora wisps";

  const moteGeometry = new BufferGeometry();
  const motePositions = [];
  const moteSeeds = [];
  for (let i = 0; i < 16; i++) {
    const seed = i + 0.37;
    motePositions.push(...lightPathPoint(((0.618033989 * seed) % 1) * end, seed % 4));
    moteSeeds.push(seed);
  }
  moteGeometry.setAttribute("position", new Float32BufferAttribute(motePositions, 3));
  moteGeometry.setAttribute("aSeed", new Float32BufferAttribute(moteSeeds, 1));
  setPathBounds(moteGeometry, end);
  const motes = new Points(moteGeometry, material(moteVertex, moteFragment));
  motes.name = "Sixteen softly fading light motes";

  const carrierGeometry = new BufferGeometry();
  carrierGeometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(21), 3));
  carrierGeometry.setAttribute("aTrail", new Float32BufferAttribute([0, 1, 2, 3, 4, 5, 6], 1));
  setPathBounds(carrierGeometry, end);
  const carrier = new Points(carrierGeometry, material(carrierVertex, carrierFragment));
  carrier.name = "Visible descending light carrier with soft short trail";
  const size = new Vector2();
  carrier.onBeforeRender = (renderer) => {
    renderer.getSize(size);
    uniforms.uCarrierPixelRatio.value = Math.max(0.5, Math.min(2, renderer.getPixelRatio()));
    uniforms.uCarrierHaloPixels.value = size.x < 768 ? 16 : 22;
  };

  for (const object of [strands, wisps, motes, carrier]) {
    object.raycast = () => {};
    object.renderOrder = -5;
    object.userData = { decorative: true, ignoreInteraction: true };
    root.add(object);
  }

  return {
    root,
    update(time, strength, accent, galleryProgress = 0) {
      uniforms.uTime.value = Number.isFinite(time) ? time : 0;
      uniforms.uStrength.value = Number.isFinite(strength) ? Math.max(0, Math.min(1, strength)) : 0;
      uniforms.uAccentMix.value = accent ? 0.2 : 0;
      if (accent) uniforms.uAccent.value.copy(accent);
      uniforms.uGalleryProgress.value = Number.isFinite(galleryProgress) ? Math.max(0, Math.min(1, galleryProgress)) : 0;
    },
    dispose() {
      uniforms.uStrength.value = 0;
      for (const object of [strands, wisps, motes, carrier]) {
        object.geometry.dispose();
        object.material.dispose();
      }
    },
  };
}
