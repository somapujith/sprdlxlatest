// The scroll finale: a NASA-textured Earth that the last meteor flies into.
// On impact a light pulse ripples across the surface and an illustrative
// network draws itself between four cities.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  LinearFilter,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Points,
  SRGBColorSpace,
  ShaderMaterial,
  SphereGeometry,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
} from "three";
import { finale, flightPath, smooth01 } from "./timeline";

export const EARTH_RADIUS = 6.8;
/** Where the meteor lands (local to the Earth group). */
export const IMPACT_NORMAL = new Vector3(0.12, 0.93, 0.347).normalize();

const ROUTES = [
  { from: 0, to: 1, start: 0.08, end: 0.36 },
  { from: 1, to: 2, start: 0.38, end: 0.61 },
  { from: 2, to: 3, start: 0.63, end: 0.94 },
];
const unit = (value) => (Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0);

/** SphereGeometry convention: u=(longitude+180)/360, v=(latitude+90)/180. */
function latLongToVector(latitude, longitude, radius = 1, target = new Vector3()) {
  const theta = ((longitude + 180) * Math.PI) / 180;
  const phi = ((90 - latitude) * Math.PI) / 180;
  const ring = radius * Math.sin(phi);
  return target.set(-ring * Math.cos(theta), radius * Math.cos(phi), ring * Math.sin(theta));
}

/** Great-circle point lifted into an arc of the given height. */
function arcPoint(from, to, amount, radius, height, target = new Vector3()) {
  const s = unit(amount);
  const a = from.clone().normalize();
  const b = to.clone().normalize();
  const angle = Math.acos(MathUtils.clamp(a.dot(b), -1, 1));
  if (angle < 1e-5) target.copy(a).lerp(b, s).normalize();
  else if (Math.PI - angle < 1e-5) {
    const axis = new Vector3(Math.abs(a.y) < 0.9 ? 0 : 1, +(Math.abs(a.y) < 0.9), 0).cross(a).normalize();
    target.copy(a).applyAxisAngle(axis, Math.PI * s);
  } else {
    const sin = Math.sin(angle);
    target
      .copy(a)
      .multiplyScalar(Math.sin((1 - s) * angle) / sin)
      .addScaledVector(b, Math.sin(s * angle) / sin)
      .normalize();
  }
  return target.multiplyScalar(radius + height * Math.sin(Math.PI * s));
}

function createCityNetwork(cities) {
  const root = new Group();
  root.name = "An illustrative connected world";
  const uniforms = {
    uProgress: { value: 0 },
    uOpacity: { value: 0 },
    uPixelRatio: { value: 1 },
    uViewport: { value: new Vector2(1, 1) },
    uTeal: { value: new Color("#75e7dc") },
  };
  const anchors = cities.map((city) => latLongToVector(city.latitude, city.longitude));

  // Routes as short line segments carrying their reveal progress.
  const routePositions = [];
  const routeProgress = [];
  const point = new Vector3();
  for (const route of ROUTES) {
    const height = EARTH_RADIUS * (0.035 + 0.1 * Math.min(1, anchors[route.from].angleTo(anchors[route.to]) / Math.PI));
    for (let i = 0; i < 48; i++) {
      for (const k of [0, 1]) {
        const s = (i + k) / 48;
        arcPoint(anchors[route.from], anchors[route.to], s, 1.009 * EARTH_RADIUS, height, point);
        routePositions.push(point.x, point.y, point.z);
        routeProgress.push(MathUtils.lerp(route.start, route.end, s));
      }
    }
  }
  const routeGeometry = new BufferGeometry();
  routeGeometry.setAttribute("position", new Float32BufferAttribute(routePositions, 3));
  routeGeometry.setAttribute("aProgress", new Float32BufferAttribute(routeProgress, 1));
  routeGeometry.computeBoundingSphere();
  const routes = new LineSegments(
    routeGeometry,
    new ShaderMaterial({
      uniforms,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
      vertexShader: /* glsl */ `
        attribute float aProgress; varying float vProgress;
        void main(){ vProgress=aProgress; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: /* glsl */ `
        uniform float uProgress,uOpacity; uniform vec3 uTeal; varying float vProgress;
        void main(){
          float presence=smoothstep(vProgress-.018,vProgress+.018,uProgress);
          float head=exp(-pow((vProgress-uProgress)/.028,2.));
          float alpha=presence*uOpacity*(.48+head*.35);
          if(alpha<.002) discard;
          gl_FragColor=vec4(mix(uTeal,vec3(.96,1.,1.),head*.7),alpha);
          #include <colorspace_fragment>
        }`,
    }),
  );
  routes.name = "City connections";
  routes.renderOrder = 1;
  root.add(routes);

  const lightGeometry = new BufferGeometry();
  lightGeometry.setAttribute("position", new Float32BufferAttribute(anchors.flatMap((a) => a.clone().multiplyScalar(EARTH_RADIUS * 1.012).toArray()), 3));
  lightGeometry.setAttribute("aReveal", new Float32BufferAttribute(cities.map((c) => c.reveal), 1));
  lightGeometry.computeBoundingSphere();
  const lights = new Points(
    lightGeometry,
    new ShaderMaterial({
      uniforms,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
      vertexShader: /* glsl */ `
        uniform float uProgress,uOpacity,uPixelRatio;
        attribute float aReveal; varying float vPresence;
        void main(){
          vec4 view=modelViewMatrix*vec4(position,1.);
          float facing=dot(normalize(normalMatrix*position),normalize(-view.xyz));
          float arrival=clamp((uProgress-aReveal)/.15,0.,1.);
          vPresence=smoothstep(aReveal,aReveal+.12,uProgress)*uOpacity*smoothstep(0.,.12,facing);
          gl_PointSize=(13.+sin(arrival*3.14159265)*7.)*uPixelRatio;
          gl_Position=projectionMatrix*view;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTeal; varying float vPresence;
        void main(){
          float radius=length(gl_PointCoord-.5)*2.;
          float core=1.-smoothstep(.12,.26,radius);
          float glow=exp(-radius*radius*5.5)*(1.-smoothstep(.72,1.,radius));
          float alpha=(core*.8+glow*.48)*vPresence;
          if(alpha<.002) discard;
          gl_FragColor=vec4(mix(uTeal,vec3(1.),core*.9),alpha);
          #include <colorspace_fragment>
        }`,
    }),
  );
  lights.name = "City lights";
  lights.renderOrder = 2;
  root.add(lights);

  // Camera-facing city names from a small canvas atlas.
  const rowHeight = 96;
  const atlasWidth = 512;
  const atlasHeight = rowHeight * cities.length;
  const canvas = typeof document === "undefined" ? null : document.createElement("canvas");
  const context = canvas?.getContext("2d");
  const widths = [];
  if (canvas && context) {
    canvas.width = atlasWidth;
    canvas.height = atlasHeight;
    context.font = "500 48px Manrope, Arial, sans-serif";
    context.textBaseline = "middle";
    context.fillStyle = "#edfafa";
    context.shadowColor = "#02131f";
    context.shadowBlur = 12;
  }
  cities.forEach((city, i) => {
    const width = context?.measureText(city.name).width ?? 27 * city.name.length;
    widths.push(Math.min(atlasWidth, Math.ceil(width) + 32));
    context?.fillText(city.name, 16, (i + 0.5) * rowHeight);
  });
  const atlas = canvas ? new CanvasTexture(canvas) : new Texture();
  atlas.colorSpace = SRGBColorSpace;
  atlas.generateMipmaps = false;
  atlas.minFilter = LinearFilter;
  atlas.magFilter = LinearFilter;

  const labelPositions = [];
  const offsets = [];
  const bounds = [];
  const uvs = [];
  const reveals = [];
  cities.forEach((city, i) => {
    const anchor = anchors[i].clone().multiplyScalar(EARTH_RADIUS * 1.012);
    const w = widths[i] / 4;
    const h = rowHeight / 4;
    const left = city.label[0] < 0 ? city.label[0] - w : city.label[0];
    for (const [sx, sy] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 0],
      [1, 1],
      [0, 1],
    ]) {
      labelPositions.push(anchor.x, anchor.y, anchor.z);
      offsets.push(left + sx * w, city.label[1] + (sy - 0.5) * h);
      bounds.push(left, city.label[1] - h / 2, left + w, city.label[1] + h / 2);
      uvs.push((sx * widths[i]) / atlasWidth, 1 - (i + 1 - sy) / cities.length);
      reveals.push(city.reveal);
    }
  });
  const labelGeometry = new BufferGeometry();
  labelGeometry.setAttribute("position", new Float32BufferAttribute(labelPositions, 3));
  labelGeometry.setAttribute("aOffset", new Float32BufferAttribute(offsets, 2));
  labelGeometry.setAttribute("aBounds", new Float32BufferAttribute(bounds, 4));
  labelGeometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  labelGeometry.setAttribute("aReveal", new Float32BufferAttribute(reveals, 1));
  const labels = new Mesh(
    labelGeometry,
    new ShaderMaterial({
      uniforms: { ...uniforms, uAtlas: { value: atlas } },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      vertexShader: /* glsl */ `
        uniform float uProgress,uOpacity; uniform vec2 uViewport;
        attribute vec2 aOffset; attribute vec4 aBounds; attribute float aReveal;
        varying vec2 vUv; varying float vPresence;
        void main(){
          vec4 view=modelViewMatrix*vec4(position,1.);
          float facing=dot(normalize(normalMatrix*position),normalize(-view.xyz));
          // Analytic spherical occlusion keeps back-side labels hidden. The
          // extra limb margin prevents names straddling the globe silhouette.
          vPresence=smoothstep(aReveal+.025,aReveal+.15,uProgress)*uOpacity*smoothstep(.07,.25,facing);
          gl_Position=projectionMatrix*view;
          vec2 viewport=max(uViewport,vec2(1.));
          vec2 centerPixels=(gl_Position.xy/gl_Position.w*.5+.5)*viewport;
          vec2 lower=centerPixels+aBounds.xy;
          vec2 limit=max(vec2(12.),viewport-vec2(12.)-(aBounds.zw-aBounds.xy));
          vec2 inset=clamp(lower,vec2(12.),limit)-lower;
          gl_Position.xy+=(aOffset+inset)*2./viewport*gl_Position.w;
          vUv=uv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uAtlas; varying vec2 vUv; varying float vPresence;
        void main(){
          vec4 label=texture2D(uAtlas,vUv);
          float alpha=label.a*vPresence;
          if(alpha<.002) discard;
          gl_FragColor=vec4(label.rgb,alpha);
          #include <colorspace_fragment>
        }`,
    }),
  );
  labels.name = "Camera-facing city names";
  labels.renderOrder = 3;
  labels.frustumCulled = false;
  root.add(labels);
  for (const object of [routes, lights, labels]) object.raycast = () => {};

  const syncViewport = (renderer) => {
    renderer.getSize(uniforms.uViewport.value);
    uniforms.uPixelRatio.value = Math.min(2, renderer.getPixelRatio());
  };
  lights.onBeforeRender = syncViewport;
  labels.onBeforeRender = syncViewport;
  root.visible = false;

  return {
    root,
    update(progress, opacity) {
      uniforms.uProgress.value = unit(progress);
      uniforms.uOpacity.value = unit(opacity);
      root.visible = uniforms.uProgress.value > 0 && uniforms.uOpacity.value > 0.001;
    },
    dispose() {
      for (const object of [routes, lights, labels]) {
        object.geometry.dispose();
        object.material.dispose();
      }
      atlas.dispose();
    },
  };
}

export function createEarth(cities, texturePath = "/media/environments/earth.jpg") {
  const root = new Group();
  root.name = "Connected Earth / scroll finale";
  const globe = new Group();
  root.add(globe);

  const material = new MeshStandardMaterial({
    color: "#9ebbd1",
    roughness: 0.91,
    metalness: 0,
    transparent: true,
    opacity: 0,
    envMapIntensity: 0.15,
  });
  const fusion = { value: 0 };
  const touch = { value: 1 };
  const touchNormal = { value: IMPACT_NORMAL.clone() };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFusion = fusion;
    shader.uniforms.uImpactNormal = { value: IMPACT_NORMAL };
    shader.uniforms.uTouch = touch;
    shader.uniforms.uTouchNormal = touchNormal;
    shader.vertexShader =
      "varying vec3 vFusionDirection;\n" +
      shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvFusionDirection=normalize(mat3(modelMatrix)*position);");
    shader.fragmentShader =
      /* glsl */ `
      uniform float uFusion;
      uniform vec3 uImpactNormal;
      uniform float uTouch;
      uniform vec3 uTouchNormal;
      varying vec3 vFusionDirection;
    ` +
      shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        /* glsl */ `
      vec3 direction=normalize(vFusionDirection);
      float angle=acos(clamp(dot(direction,uImpactNormal),-1.,1.));
      float arrival=smoothstep(0.,.025,uFusion);
      float pulseRadius=sqrt(uFusion)*2.5;
      float pulse=exp(-pow((angle-pulseRadius)/(.022+uFusion*.032),2.));
      pulse*=arrival*(1.-smoothstep(.45,1.,uFusion));
      float light=exp(-angle*angle/.012)*arrival*exp(-uFusion*5.);
      outgoingLight+=vec3(.55,1.,.85)*light*1.4;
      outgoingLight+=vec3(.2,.8,.68)*pulse*.65;
      float touchAngle=acos(clamp(dot(direction,uTouchNormal),-1.,1.));
      float touchRing=exp(-pow((touchAngle-(.035+uTouch*.7))/(.018+uTouch*.02),2.));
      outgoingLight+=vec3(.18,.62,1.)*touchRing*(1.-smoothstep(.05,1.,uTouch))*.65;
      #include <opaque_fragment>
    `,
      );
  };
  material.customProgramCacheKey = () => "connected-earth-v1";

  const sphere = new SphereGeometry(EARTH_RADIUS, 80, 48);
  const surface = new Mesh(sphere, material);
  globe.add(surface);

  const network = createCityNetwork(cities);
  globe.add(network.root);

  const atmosphereMaterial = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uOpacity: { value: 0 }, uFusion: fusion },
    vertexShader: /* glsl */ `varying vec3 vNormal; varying vec3 vView;
      void main(){vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
    fragmentShader: /* glsl */ `uniform float uOpacity; uniform float uFusion; varying vec3 vNormal; varying vec3 vView;
      void main(){float rim=pow(1.-max(0.,dot(normalize(vNormal),normalize(vView))),3.5);
      vec3 colour=mix(vec3(.16,.5,1.),vec3(.22,.59,.95),uFusion);
      gl_FragColor=vec4(colour,rim*(.52+uFusion*.08)*uOpacity);}`,
  });
  const atmosphere = new Mesh(sphere, atmosphereMaterial);
  atmosphere.scale.setScalar(1.018);
  root.add(atmosphere);

  // A 48-point streak behind the arriving meteor.
  const trailPositions = new Float32Array(144);
  const trailColors = new Float32Array(144);
  const trailGeometry = new BufferGeometry();
  trailGeometry.setAttribute("position", new BufferAttribute(trailPositions, 3).setUsage(DynamicDrawUsage));
  trailGeometry.setAttribute("color", new BufferAttribute(trailColors, 3));
  for (let i = 0; i < 48; i++) {
    const fade = 1 - i / 48;
    trailColors.set([0.6 * fade, fade, 0.85 * fade], 3 * i);
  }
  const trailMaterial = new LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const trail = new Line(trailGeometry, trailMaterial);
  trail.frustumCulled = false;

  const destination = new Vector3();
  const sample = new Vector3();
  let texture = null;
  let loadId = 0;
  root.traverse((child) => {
    if (child !== surface) child.raycast = () => {};
  });
  trail.raycast = () => {};

  return {
    root,
    trail,
    load(onLoad) {
      const id = ++loadId;
      new TextureLoader().load(texturePath, (loaded) => {
        if (id !== loadId) {
          loaded.dispose();
          return;
        }
        texture?.dispose();
        texture = loaded;
        loaded.colorSpace = SRGBColorSpace;
        loaded.anisotropy = 4;
        material.map = loaded;
        material.needsUpdate = true;
        onLoad();
      });
    },
    /**
     * @param landing   0..1 landing phase
     * @param cameraY   camera height (Earth rises from below it)
     * @param focus     project-focus amount (hides Earth)
     * @param rotation  user drag rotation {x,y}
     * @param touch     0..1 age of the latest touch pulse
     * @param framing   {x,y,distance} from earthFraming()
     * @param settle    0..1 how far the camera has moved into the Earth framing
     */
    update(landing, cameraY, focus, rotation = { x: 0, y: 0 }, touchAge = 1, framing = { x: 0, y: -8.7 }, settle = 0) {
      root.position.set(framing.x * settle, cameraY + MathUtils.lerp(-8.7, framing.y, settle), -4);
      const presence = smooth01(landing / 0.3) * (1 - focus);
      root.visible = presence > 0.001;
      material.opacity = presence;
      touch.value = Math.max(0, Math.min(1, touchAge));
      const { fusion: f } = finale(landing);
      globe.rotation.set(0.2 + rotation.x, -1.25 - 1.4 * f + rotation.y, -0.12);
      fusion.value = f;
      atmosphereMaterial.uniforms.uOpacity.value = presence;
      atmosphere.scale.setScalar(1.018 + 0.003 * f);
      network.update(smooth01((f - 0.04) / 0.9), presence);
      trail.visible = root.visible;
    },
    setTouchPoint(worldPoint) {
      touchNormal.value.copy(worldPoint).sub(root.position).normalize();
    },
    destination: (distance) => destination.copy(IMPACT_NORMAL).multiplyScalar(distance).add(root.position),
    updateTrail(landing, from, to, focus) {
      const { flight } = finale(landing);
      for (let i = 0; i < 48; i++) {
        flightPath(Math.max(0, flight - 0.0045 * i), from, to, sample);
        trailPositions[3 * i] = sample.x;
        trailPositions[3 * i + 1] = sample.y;
        trailPositions[3 * i + 2] = sample.z;
      }
      trailGeometry.attributes.position.needsUpdate = true;
      trailMaterial.opacity = smooth01(landing / 0.16) * (1 - smooth01((landing - 0.56 + 0.07) / 0.11)) * (1 - focus) * 0.8;
      trail.visible = root.visible && trailMaterial.opacity > 0.001;
    },
    dispose() {
      loadId++;
      texture?.dispose();
      texture = null;
      material.map = null;
      sphere.dispose();
      material.dispose();
      atmosphereMaterial.dispose();
      trailGeometry.dispose();
      trailMaterial.dispose();
      network.dispose();
    },
  };
}

/**
 * Camera distance and offset that place the globe in the lower-right of the
 * viewport on desktop (and centred lower on phones), leaving room for copy.
 */
export function earthFraming(width, height, radius = EARTH_RADIUS, fov = 40) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || !(radius > 0) || !(fov > 0 && fov < 180)) {
    throw RangeError("Earth framing requires finite dimensions, a positive radius and a field of view between 0 and 180 degrees.");
  }
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const phone = w < 700;
  const short = h <= 640;
  const tanY = Math.tan((fov * Math.PI) / 360);
  const tanX = (tanY * w) / h;
  const left = (2 * (phone ? 0.08 : 0.47) - 1) * tanX;
  const right = (1.84 - 1) * tanX;
  const bottom = (1 - 2 * (phone ? (short ? 0.8 : 0.83) : short ? 0.82 : 0.83)) * tanY;
  const top = (1 - 2 * (phone ? (short ? 0.44 : 0.38) : short ? 0.26 : 0.19)) * tanY;
  const cx = (left + right) / 2;
  const cy = (bottom + top) / 2;
  const distance =
    1.15 *
    radius *
    Math.max(Math.hypot(1, left) / (cx - left), Math.hypot(1, right) / (right - cx), Math.hypot(1, bottom) / (cy - bottom), Math.hypot(1, top) / (top - cy));
  return { distance, x: cx * distance, y: cy * distance };
}
