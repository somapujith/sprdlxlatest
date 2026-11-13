// "Living space": a screen-anchored starfield, drifting dust, a faint aurora
// haze and a click ripple. Everything is positioned in NDC inside the vertex
// shader so it always fills the view, independent of the camera's journey.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  MathUtils,
  Mesh,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import { lcg } from "./timeline";

const vertexShader = /* glsl */ `
  attribute vec3 aStyle;
  uniform float uTime;
  uniform vec2 uPointer;
  uniform vec3 uBurst;
  uniform float uAspect;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying float vWarm;
  varying float vSpark;

  void main() {
    float nearLayer = 1.0 - position.z;
    float phase = aStyle.z * 6.2831853;
    vec2 ndc = position.xy;
    float sparkle = 0.0;
    float alpha = 0.0;
    float pointSize = 1.0;
    float age = uBurst.z;
    bool activeBurst = age >= 0.0 && age < 2.4;

    #ifdef DUST_PASS
      // The first 24 dust vertices become local sparks only during a click.
      bool isSpark = aStyle.y > 0.5;
      if (isSpark) {
        float life = activeBurst ? max(0.0, 1.0 - age / 1.55) : 0.0;
        float distanceFromClick = 0.018 + age * (0.14 + aStyle.x * 0.10);
        vec2 direction = vec2(cos(phase), sin(phase));
        ndc = uBurst.xy + direction * distanceFromClick / vec2(uAspect, 1.0);
        alpha = life * life * 0.68;
        pointSize = 2.0 + life * (1.0 + aStyle.x);
        sparkle = life;
      } else {
        ndc.x = mod(ndc.x + uTime * (0.005 + nearLayer * 0.009) + 1.35, 2.7) - 1.35;
        ndc.y = mod(ndc.y + uTime * (0.004 + nearLayer * 0.008) + 1.3, 2.6) - 1.3;
        ndc.x += sin(uTime * 0.09 + phase) * 0.024;
        ndc.y += cos(uTime * 0.07 + phase) * 0.019;
        ndc += uPointer * (0.026 + nearLayer * 0.042);
        alpha = (0.025 + nearLayer * 0.042) * (0.82 + 0.18 * sin(uTime * 0.5 + phase));
        pointSize = 4.0 + aStyle.x * 3.3;
      }
    #else
      ndc.x = mod(ndc.x + uTime * (0.0008 + nearLayer * 0.0034) + 1.3, 2.6) - 1.3;
      ndc.y = mod(ndc.y + uTime * (0.0006 + nearLayer * 0.0018) + 1.3, 2.6) - 1.3;
      ndc += vec2(sin(uTime * 0.12 + phase), cos(uTime * 0.09 + phase)) * 0.008 * nearLayer;
      ndc += uPointer * (0.008 + nearLayer * 0.036);
      float twinkle = 0.8 + 0.2 * sin(uTime * (0.32 + aStyle.y * 0.46) + phase);
      alpha = (0.18 + aStyle.x * 0.15) * twinkle;
      pointSize = 1.15 + aStyle.x * 0.7 + nearLayer * 0.5;
      if (activeBurst) {
        vec2 offset = (ndc - uBurst.xy) * vec2(uAspect, 1.0);
        float radius = length(offset);
        float ring = exp(-pow((radius - age * 0.42) / 0.060, 2.0));
        float reaction = ring * exp(-age * 1.25);
        alpha += reaction * 0.72;
        pointSize += reaction * 3.0;
        ndc += (offset / max(radius, 0.001)) * reaction * 0.028 / vec2(uAspect, 1.0);
        sparkle = reaction;
      }
    #endif

    // The copy occupies the left side. Keep it calm there, without making
    // interaction invisible when someone clicks another open screen area.
    float readingMask = mix(0.45, 1.0, smoothstep(-0.65, 0.25, ndc.x));
    vAlpha = alpha * mix(readingMask, 1.0, min(1.0, sparkle));
    vWarm = aStyle.z;
    vSpark = sparkle;
    vec4 anchor = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float depth = max(4.0, -anchor.z) + 1.0 + position.z * 18.0;
    vec3 view = vec3(ndc.x * depth / projectionMatrix[0][0],
                     ndc.y * depth / projectionMatrix[1][1], -depth);
    gl_Position = projectionMatrix * vec4(view, 1.0);
    gl_PointSize = clamp(pointSize * uPixelRatio, 1.0, 22.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uStrength;
  varying float vAlpha;
  varying float vWarm;
  varying float vSpark;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float radius = length(p);
    if (radius > 0.5) discard;
    #ifdef DUST_PASS
      float glow = exp(-radius * radius * 18.0) * (1.0 - smoothstep(0.35, 0.5, radius));
    #else
      float glow = (exp(-radius * radius * 28.0) + exp(-radius * radius * 7.0) * 0.16)
                 * (1.0 - smoothstep(0.40, 0.5, radius));
    #endif
    vec3 color = mix(vec3(0.56, 0.69, 0.88), vec3(0.91, 0.85, 0.73), vWarm * 0.48);
    color = mix(color, vec3(0.84, 0.93, 1.0), min(1.0, vSpark));
    gl_FragColor = vec4(color, glow * vAlpha * uStrength);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const auroraVertex = /* glsl */ `
  varying vec2 vNdc;
  void main() {
    vNdc = position.xy;
    vec4 anchor = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float depth = max(4.0, -anchor.z) + 23.0;
    vec4 clip = projectionMatrix * vec4(0.0, 0.0, -depth, 1.0);
    gl_Position = vec4(position.xy * clip.w, clip.z, clip.w);
  }
`;

const auroraFragment = /* glsl */ `
  uniform float uTime;
  uniform float uStrength;
  uniform float uAspect;
  uniform vec2 uPointer;
  uniform vec3 uBurst;
  varying vec2 vNdc;
  void main() {
    vec2 uv = vNdc - uPointer * 0.026;
    float t = uTime * 0.085;
    float curve = 0.13 + 0.25 * sin(uv.x * 1.7 + t)
                + 0.08 * sin(uv.x * 4.4 - t * 0.61);
    float ribbon = exp(-pow((uv.y - curve) / 0.20, 2.0));
    float filament = exp(-pow((uv.y - curve - 0.045 * sin(uv.x * 8.0 + t)) / 0.036, 2.0));
    float upper = exp(-pow((uv.y - 0.52 - 0.17 * sin(uv.x * 2.4 - t * 0.72)) / 0.29, 2.0));
    float rightSide = smoothstep(-0.50, 0.45, uv.x);
    float edge = (1.0 - smoothstep(0.75, 1.0, abs(vNdc.y)))
               * (1.0 - smoothstep(0.82, 1.0, abs(vNdc.x)));
    float breathing = 0.84 + 0.16 * sin(t * 1.6);
    vec3 haze = vec3(0.10, 0.25, 0.34) * ribbon * 0.048
              + vec3(0.24, 0.31, 0.40) * filament * 0.022
              + vec3(0.12, 0.15, 0.25) * upper * 0.035;
    haze *= rightSide * edge * breathing;

    float reaction = 0.0;
    if (uBurst.z >= 0.0 && uBurst.z < 2.4) {
      float d = length((vNdc - uBurst.xy) * vec2(uAspect, 1.0));
      float radius = 0.012 + uBurst.z * 0.42;
      float ring = exp(-pow((d - radius) / 0.025, 2.0));
      float core = exp(-d * d / 0.018) * exp(-uBurst.z * 7.0);
      reaction = ring * exp(-uBurst.z * 1.75) * 0.045 + core * 0.052;
    }
    // Preserve canvas transparency so the CSS plates behind remain visible.
    // Alpha is coverage, never an opaque fullscreen rectangle.
    vec3 light = (haze + vec3(0.45, 0.65, 0.80) * reaction) * uStrength;
    float amount = max(max(light.r, light.g), light.b);
    if (amount < 0.00003) discard;
    gl_FragColor = vec4(light / max(amount, 0.00001), min(amount, 0.09));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createLivingSpace() {
  const root = new Group();
  root.name = "Living space — stars, dust and aurora";
  root.renderOrder = -30;

  const uniforms = {
    uTime: { value: 0 },
    uPointer: { value: new Vector2() },
    uStrength: { value: 1 },
    uBurst: { value: new Vector3(0, 0, -1) },
    uAspect: { value: 1 },
    uPixelRatio: { value: 1 },
  };
  const random = lcg(71831);

  const layer = (count, dust) => {
    const positions = new Float32Array(count * 3);
    const styles = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (random() - 0.5) * 2.6;
      positions[i * 3 + 1] = (random() - 0.5) * 2.6;
      positions[i * 3 + 2] = random();
      styles[i * 3] = 0.35 + 1.35 * random();
      styles[i * 3 + 1] = dust ? +(i < 24) : random();
      styles[i * 3 + 2] = random();
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("aStyle", new BufferAttribute(styles, 3));
    return new Points(
      geometry,
      new ShaderMaterial({
        name: dust ? "Living space dust and click sparks" : "Living space stars",
        uniforms,
        defines: dust ? { DUST_PASS: 1 } : {},
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    );
  };

  const stars = layer(376, false);
  const dust = layer(96, true);
  const aurora = new Mesh(
    new PlaneGeometry(2, 2),
    new ShaderMaterial({
      name: "Living space faint aurora and local ripple",
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
      toneMapped: false,
      vertexShader: auroraVertex,
      fragmentShader: auroraFragment,
    }),
  );

  aurora.name = "Living space aurora";
  stars.name = "Living space 376 stars";
  dust.name = "Living space 72 dust motes and 24 click sparks";
  aurora.renderOrder = -30;
  stars.renderOrder = -29;
  dust.renderOrder = -28;
  for (const object of [aurora, stars, dust]) {
    object.frustumCulled = false;
    object.raycast = () => {};
    object.onBeforeRender = (renderer, _scene, camera) => {
      const e = camera.projectionMatrix.elements;
      uniforms.uAspect.value = Math.max(0.1, Math.abs(e[5] / e[0]));
      uniforms.uPixelRatio.value = Math.min(renderer.getPixelRatio(), 2);
    };
    root.add(object);
  }

  const finite = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);
  const unit = (value) => MathUtils.clamp(finite(value), -1, 1);

  return {
    root,
    update(time, pointer, strength, burst) {
      uniforms.uTime.value = Math.max(0, finite(time));
      uniforms.uPointer.value.set(unit(pointer.x), unit(pointer.y));
      uniforms.uStrength.value = MathUtils.clamp(finite(strength), 0, 1);
      root.visible = uniforms.uStrength.value > 1e-4;
      if (burst && Number.isFinite(burst.age) && burst.age >= 0 && burst.age < 2.4) {
        uniforms.uBurst.value.set(unit(burst.x), unit(burst.y), burst.age);
      } else {
        uniforms.uBurst.value.set(0, 0, -1);
      }
    },
    dispose() {
      for (const object of [aurora, stars, dust]) {
        object.geometry.dispose();
        object.material.dispose();
      }
    },
  };
}
