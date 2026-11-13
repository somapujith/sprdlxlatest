"use client";

// The orbital collection. Every frame maps the shell's `runtime` (scroll
// progress, focus, gestures, hover) onto the camera, the light axis, the
// meteors and the Earth finale, and writes DOM-facing results (label
// positions, copy opacity, environment parallax) straight back to elements
// the shell registered on `runtime`. Rendering is on demand.
import { useEffect, useMemo } from "react";
import { addAfterEffect, useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  MathUtils,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Triangle,
  Vector3,
} from "three";
import { projects } from "@/data/projects";
import { site } from "@/data/site";
import {
  canActivate,
  dragTarget,
  gestureTransform,
  interpolateAngle,
  meteorGestureTransform,
  moveGesture,
  orbitTransform,
  sceneIndices,
} from "@/lib/gestures";
import { createEarth, earthFraming, EARTH_RADIUS, IMPACT_NORMAL } from "@/lib/scene/earth";
import { createLightAxis } from "@/lib/scene/lightAxis";
import { createLivingSpace } from "@/lib/scene/livingSpace";
import { createMeteor, disposeObject, maxLocalRadius } from "@/lib/scene/meteor";
import {
  createBadgePlacement,
  createConstellation,
  createLogoBadge,
  createMoons,
  createStudioEnvironment,
} from "@/lib/scene/details";
import {
  finale as finalePhases,
  flightPath,
  journey,
  lcg,
  smooth01,
  spectrum,
  stationPosition,
  stationT,
} from "@/lib/scene/timeline";

const COUNT = projects.length;
const { lastProject: LAST, rig: RIG, earth: EARTH } = sceneIndices(COUNT);

// Scroll smoothing: spring stiffness and max step per input type.
const SMOOTHING = { pointer: 6, touch: 14 };
const MAX_STEP = { pointer: 0.05, touch: 0.1 };
// Adaptive quality: watch frame times and drop DPR when the device struggles.
const QUALITY_DESKTOP = { frames: 180, slowFrame: 0.024, idleGap: 0.2, repeat: false, rule: "average" };
const QUALITY_TOUCH = { frames: 120, slowFrame: 0.022, idleGap: 0.5, repeat: true, rule: "majority" };
const SIXTY_FPS_BUDGET = 1 / 30 + 0.001;
const freshQualityWindow = () => ({ total: 0, samples: 0, slow: 0, done: false, best: Infinity });

function sampleQuality(window, delta, rules) {
  if (window.done || delta <= 0 || delta >= rules.idleGap) return { window: { ...window }, lower: false };
  const best = Math.min(window.best, delta);
  const slowThreshold = rules.rule === "average" ? rules.slowFrame : Math.max(rules.slowFrame, 1.25 * Math.min(best, SIXTY_FPS_BUDGET));
  const next = {
    total: window.total + delta,
    samples: window.samples + 1,
    slow: window.slow + +(delta > slowThreshold),
    done: false,
    best,
  };
  if (next.samples < rules.frames) return { window: next, lower: false };
  const lower = rules.rule === "average" ? next.total / next.samples > rules.slowFrame : next.slow / next.samples > 0.5;
  return { window: { ...freshQualityWindow(), best, done: lower || !rules.repeat }, lower };
}

const clampLabel = (value, min, max) => Math.max(min, Math.min(max, value));
const overlaps = (a, b) => a.x < b.x + b.width + 8 && a.x + a.width + 8 > b.x && a.y < b.y + b.height + 6 && a.y + a.height + 6 > b.y;

/** Places project labels under their meteors without overlapping. */
function layoutLabels(anchors, width, height, phone) {
  const w = phone ? 152 : 204;
  const h = phone ? 60 : 58;
  const maxX = Math.max(16, width - w - 16);
  const minY = Math.min(100, 0.16 * height);
  const placed = [];
  for (const anchor of [...anchors].sort((a, b) => a.id - b.id)) {
    const x = clampLabel(anchor.x - w / 2, 16, maxX);
    const y = Math.max(anchor.y, minY);
    const candidates = [];
    for (const dy of [0, h + 8, (h + 8) * 2]) {
      for (const dx of [0, w + 10, -w - 10]) {
        candidates.push({ ...anchor, x: clampLabel(x + dx, 16, maxX), y: y + dy, width: w, height: h });
      }
    }
    candidates.sort((a, b) => Math.hypot(a.x - x, (a.y - y) * 1.15) - Math.hypot(b.x - x, (b.y - y) * 1.15));
    placed.push(candidates.find((c) => placed.every((p) => !overlaps(c, p))) ?? candidates[0]);
  }
  return placed;
}

/** Far-field asteroid belt drifting behind the gallery. */
function Asteroids({ runtime }) {
  const belt = useMemo(() => {
    const random = lcg(391);
    const geometry = new IcosahedronGeometry(1, 1);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      const bump = 0.88 + Math.sin(11 * x + 6 * y) * Math.cos(9 * z) * 0.16;
      position.setXYZ(i, x * bump, y * bump, z * bump);
    }
    geometry.computeVertexNormals();
    const mesh = new InstancedMesh(geometry, new MeshStandardMaterial({ color: "#404a56", roughness: 0.65, metalness: 0.7 }), 36);
    const dummy = new Object3D();
    for (let i = 0; i < 36; i++) {
      dummy.position.set((random() - 0.5) * 20, 24 * random() - 17, -(9 * random()) - 0.8);
      dummy.rotation.set(6 * random(), 6 * random(), 6 * random());
      dummy.scale.setScalar(0.015 + 0.075 * Math.pow(random(), 3));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.raycast = () => {};
    return mesh;
  }, []);

  useFrame(() => {
    belt.rotation.y = 0.18 * runtime.smoothProgress;
    belt.position.x = 0.015 * runtime.pointer.x;
  });
  useEffect(
    () => () => {
      belt.geometry.dispose();
      belt.material.dispose();
      belt.dispose();
    },
    [belt],
  );
  return <primitive object={belt} />;
}

/** Furthest distance along `direction` at which the meteor no longer intersects Earth. */
function impactDistance(meteor, direction, margin = 0.006) {
  meteor.updateWorldMatrix(true, true);
  const inverse = meteor.matrixWorld.clone().invert();
  const relative = new Matrix4();
  const point = new Vector3();
  const vertices = [];
  let reach = 0;
  meteor.traverseVisible((child) => {
    if (!(child instanceof Mesh)) return;
    relative.multiplyMatrices(inverse, child.matrixWorld);
    const position = child.geometry.getAttribute("position");
    const index = child.geometry.getIndex();
    for (let i = 0; i < (index?.count ?? position.count); i++) {
      point.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(relative).multiplyScalar(0.48);
      vertices.push(point.x, point.y, point.z);
      reach = Math.max(reach, point.length());
    }
  });
  const triangle = new Triangle();
  const closest = new Vector3();
  const centre = new Vector3();
  const axis = direction.clone().normalize();
  const limit = (EARTH_RADIUS + margin) ** 2;
  const clear = (distance) => {
    centre.copy(axis).multiplyScalar(-distance);
    for (let i = 0; i < vertices.length; i += 9) {
      triangle.a.fromArray(vertices, i);
      triangle.b.fromArray(vertices, i + 3);
      triangle.c.fromArray(vertices, i + 6);
      triangle.closestPointToPoint(centre, closest);
      if (closest.distanceToSquared(centre) < limit) return false;
    }
    return true;
  };
  let low = EARTH_RADIUS;
  let high = EARTH_RADIUS + reach + margin;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) * 0.5;
    if (clear(mid)) high = mid;
    else low = mid;
  }
  return high;
}

export function OrbitScene({ runtime, onReady, onError, onSelect, exploreTouch, onChapter, onFinale }) {
  const { gl, scene, camera, size, invalidate, setDpr, events } = useThree();

  const scratch = useMemo(() => ({ projected: new Vector3(), corner: new Vector3(), lookTarget: new Vector3() }), []);
  const lightAxis = useMemo(() => createLightAxis(stationT(LAST)), []);
  const rig = lightAxis.root;
  const earth = useMemo(() => createEarth(site.cities), []);
  const framing = useMemo(() => earthFraming(size.width, size.height, EARTH_RADIUS), [size.width, size.height]);
  const space = useMemo(createLivingSpace, []);
  const flightStart = useMemo(() => new Vector3(), []);
  const constellation = useMemo(() => createConstellation(COUNT), []);
  const stations = useMemo(() => projects.map((_, i) => stationPosition(i)), []);
  const orbitPoint = useMemo(() => new Vector3(), []);
  const stationWorld = useMemo(() => new Vector3(), []);
  const lightColors = useMemo(() => projects.map((p) => new Color(p.light ?? "#91bcff")), []);
  const axisAccent = useMemo(() => new Color(), []);
  const moons = useMemo(() => createMoons(lightColors), [lightColors]);
  const landingGlow = useMemo(() => new Color(0.3, 1, 0.72), []);
  const meteors = useMemo(() => projects.map((project) => createMeteor(project)), []);
  const meteorRoots = useMemo(() => meteors.map((m) => m.root), [meteors]);
  const materialStates = useMemo(
    () =>
      meteorRoots.map((root) => {
        const states = [];
        const seen = new Set();
        root.traverse((child) => {
          if (!(child instanceof Mesh)) return;
          for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
            if (material instanceof MeshStandardMaterial && material.name.startsWith("Meteor ") && !seen.has(material)) {
              seen.add(material);
              states.push({ material, color: material.color.clone(), emissive: material.emissive.clone(), intensity: material.emissiveIntensity });
            }
          }
        });
        return states;
      }),
    [meteorRoots],
  );
  const holders = useMemo(() => projects.map(() => new Group()), []);
  const closedRadii = useMemo(() => meteorRoots.map(maxLocalRadius), [meteorRoots]);
  const hoverPads = useMemo(() => meteorRoots.map((root) => Number(root.userData.hoverEnvelopePadding)), [meteorRoots]);
  const maxHoverRadius = useMemo(() => Math.max(...closedRadii.map((r, i) => r + hoverPads[i])), [closedRadii, hoverPads]);
  const maxOpenRadius = useMemo(() => Math.max(...meteorRoots.map((root) => Number(root.userData.maxOpenRadius))), [meteorRoots]);
  const landingDistance = useMemo(() => impactDistance(meteorRoots[LAST], IMPACT_NORMAL), [meteorRoots]);
  const placeBadge = useMemo(() => projects.map(() => null), []);
  const showBadge = useMemo(() => projects.map(() => null), []);
  const tetherStart = useMemo(() => projects.map((_, i) => spectrum(stationT(i), new Color())), []);
  const tetherEnd = useMemo(() => projects.map((_, i) => spectrum(stationT(i) + 0.14, new Color())), []);

  const state = useMemo(
    () => ({
      time: 0,
      assetsReady: false,
      shadersReady: false,
      spaceTime: 0,
      effectTime: 0,
      pointer: { x: 0, y: 0 },
      burst: { x: 0, y: 0, age: 99 },
      burstSequence: 0,
      burstAt: -99,
      earthSequence: 0,
      earthAt: -99,
      finaleSpin: new Quaternion(),
      focused: -1,
      weights: projects.map(() => 0),
      hoverWeights: projects.map(() => 0),
      pointerInside: false,
      qualityWindow: freshQualityWindow(),
      touch: typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches,
      quality: typeof matchMedia !== "undefined" && matchMedia("(max-width: 700px), (pointer: coarse)").matches ? 1.25 : 1.5,
      lastFocus: 0,
      capture: null,
    }),
    [],
  );

  // Embedded logo badges, one per meteor holder.
  useEffect(() => {
    let cancelled = false;
    const badges = holders.map((holder, i) => {
      const badge = createLogoBadge(holder, projects[i], invalidate);
      placeBadge[i] = createBadgePlacement(holder, badge.group, closedRadii[i]);
      showBadge[i] = badge.setPresence;
      return badge;
    });
    Promise.all(badges.map((b) => b.ready)).then(() => {
      if (cancelled) return;
      badges.forEach((b) => b.prepareTexture(gl));
      state.assetsReady = true;
      invalidate();
    });
    return () => {
      cancelled = true;
      state.assetsReady = false;
      badges.forEach((badge, i) => {
        placeBadge[i] = null;
        showBadge[i] = null;
        badge.dispose();
      });
    };
  }, [holders, closedRadii, invalidate, placeBadge, showBadge, gl, state]);

  useEffect(() => {
    const coarse = matchMedia("(pointer: coarse)");
    const sync = () => {
      state.touch = coarse.matches;
    };
    coarse.addEventListener("change", sync);
    return () => coarse.removeEventListener("change", sync);
  }, [state]);

  // Environment, shader warm-up, readiness and global gesture safety nets.
  useEffect(() => {
    let alive = true;
    const environment = createStudioEnvironment(gl);
    scene.environment = environment.texture;
    scene.environmentIntensity = 1.25;
    state.shadersReady = false;
    gl.compileAsync(scene, camera).then(
      () => {
        if (!alive) return;
        state.shadersReady = true;
        invalidate();
      },
      () => alive && onError(),
    );

    const contextLost = (event) => {
      event.preventDefault();
      onError();
    };
    gl.domElement.addEventListener("webglcontextlost", contextLost);

    const cancel = () => {
      const hadGesture = !!runtime.gesture;
      runtime.backgroundPress = null;
      runtime.hover = runtime.hoverLabel = -1;
      state.pointerInside = false;
      runtime.gesture = null;
      const capture = state.capture;
      state.capture = null;
      if (capture?.target.hasPointerCapture(capture.id)) capture.target.releasePointerCapture(capture.id);
      runtime.phase = runtime.selected < 0 ? "browsing" : "reading";
      gl.domElement.style.cursor = "auto";
      if (hadGesture) window.dispatchEvent(new Event("studio:restore"));
      invalidate();
    };
    const leave = () => {
      state.pointerInside = false;
      runtime.hover = -1;
      if (!runtime.gesture) gl.domElement.style.cursor = "auto";
      invalidate();
    };
    const enter = (event) => {
      state.pointerInside = event.pointerType !== "touch";
      invalidate();
    };
    const onScroll = () => {
      runtime.hover = -1;
      if (runtime.visible) invalidate();
    };
    gl.domElement.addEventListener("pointerenter", enter);
    gl.domElement.addEventListener("pointerleave", leave);
    const visibility = () => (document.hidden ? cancel() : invalidate());
    runtime.cancelGesture = cancel;

    let releaseFrame = 0;
    const release = (event) => {
      const gesture = runtime.gesture;
      if (gesture && event.pointerId === gesture.pointerId) {
        cancelAnimationFrame(releaseFrame);
        releaseFrame = requestAnimationFrame(() => {
          if (gesture && runtime.gesture === gesture) cancel();
        });
      }
    };
    window.addEventListener("pointerup", release);
    gl.domElement.addEventListener("lostpointercapture", release);
    const pointerCancel = (event) => {
      if (event.pointerId === runtime.gesture?.pointerId) cancel();
    };
    window.addEventListener("pointercancel", pointerCancel);
    window.addEventListener("blur", cancel);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    runtime.invalidate = invalidate;

    let announced = false;
    const unsubscribe = addAfterEffect(() => {
      if (!announced && state.assetsReady && state.shadersReady) {
        announced = true;
        onReady();
      }
    });
    invalidate();

    return () => {
      alive = false;
      state.shadersReady = false;
      cancel();
      unsubscribe();
      runtime.cancelGesture = () => {};
      environment.dispose();
      scene.environment = null;
      gl.domElement.removeEventListener("webglcontextlost", contextLost);
      gl.domElement.removeEventListener("pointerenter", enter);
      gl.domElement.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerup", release);
      cancelAnimationFrame(releaseFrame);
      gl.domElement.removeEventListener("lostpointercapture", release);
      window.removeEventListener("pointercancel", pointerCancel);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", visibility);
      runtime.invalidate = () => {};
    };
  }, [gl, scene, camera, onReady, onError, runtime, invalidate, state]);

  useEffect(
    () => () => {
      earth.dispose();
      space.dispose();
      lightAxis.dispose();
      constellation.dispose();
      moons.dispose();
      meteorRoots.forEach(disposeObject);
    },
    [rig, meteorRoots, constellation, lightAxis, earth, space, moons],
  );

  useEffect(() => {
    earth.load(invalidate);
  }, [earth, invalidate]);

  useEffect(() => {
    runtime.cancelGesture();
    gl.domElement.style.touchAction = exploreTouch ? "none" : "pan-y pinch-zoom";
    invalidate();
  }, [size, exploreTouch, invalidate, gl, runtime]);

  useFrame((_, rawDelta) => {
    runtime.sceneFrames++;
    const dt = Math.min(rawDelta, 0.05);
    const phone = size.width < 700;
    state.effectTime += dt;
    if (!runtime.paused && !runtime.reduced && runtime.selected < 0 && runtime.visible) state.spaceTime += dt;
    state.pointer.x = MathUtils.damp(state.pointer.x, runtime.reduced ? 0 : runtime.pointer.x, 4, dt);
    state.pointer.y = MathUtils.damp(state.pointer.y, runtime.reduced ? 0 : runtime.pointer.y, 4, dt);
    if (runtime.backgroundBurst.sequence !== state.burstSequence) {
      state.burstSequence = runtime.backgroundBurst.sequence;
      state.burstAt = state.effectTime;
      state.burst.x = runtime.backgroundBurst.x;
      state.burst.y = runtime.backgroundBurst.y;
    }
    state.burst.age = state.effectTime - state.burstAt;
    if (runtime.earthPulse !== state.earthSequence) {
      state.earthSequence = runtime.earthPulse;
      state.earthAt = state.effectTime;
    }
    if (runtime.selected >= 0) state.focused = runtime.selected;

    let weightsMoving = false;
    state.weights.forEach((weight, i) => {
      const target = +(state.focused === i);
      const next = runtime.reduced ? target : MathUtils.damp(weight, target, 8, dt);
      state.weights[i] = Math.abs(next - target) < 2e-4 ? target : next;
      weightsMoving ||= state.weights[i] !== target;
    });

    if (!runtime.paused && !runtime.reduced && runtime.selected < 0 && !runtime.gesture && runtime.progress <= 0.78 && runtime.smoothProgress <= 0.78 && runtime.visible) {
      state.time += dt;
    }
    if (runtime.phase !== "dragging") {
      if (!runtime.visible || runtime.reduced) runtime.smoothProgress = runtime.progress;
      else {
        const input = state.touch ? "touch" : "pointer";
        const step = Math.min(Math.max(rawDelta, 0), MAX_STEP[input]);
        runtime.smoothProgress = runtime.progress + (runtime.smoothProgress - runtime.progress) * Math.exp(-SMOOTHING[input] * step);
      }
    }

    const progress = runtime.reduced ? 0 : runtime.smoothProgress;
    const focus = runtime.focus;
    const time = state.time;
    const portraitDesktop = !phone && size.width / size.height < 1.4;
    const { gallery, station, landing } = journey(progress, COUNT);
    const exit = Math.max(journey(progress, COUNT).exit, journey(runtime.progress, COUNT).exit);

    if (runtime.stage) {
      const visibility = 1 - exit * (1 - focus);
      runtime.stage.style.setProperty("--stage-visibility", String(visibility));
      runtime.stage.style.visibility = visibility < 0.001 ? "hidden" : "visible";
    }

    const phases = finalePhases(landing);
    const rise = smooth01(landing / 0.32);
    const settle = smooth01((landing - 0.06) / 0.48);
    const inFinale = landing > 0.025;
    if (inFinale !== runtime.inFinale) {
      runtime.inFinale = inFinale;
      runtime.cancelGesture();
      onFinale(inFinale);
    }
    const active = Math.min(LAST, Math.round(station));
    if (active !== runtime.activeIndex) {
      runtime.activeIndex = active;
      onChapter(active);
    }

    // Camera: descend the axis; frame the focused project; settle on Earth.
    const cameraY = 9 - 3 * station;
    const cameraX = (phone ? 0 : -0.9) * (1 - focus) * (1 - settle);
    const aspect = Math.max(0.25, size.width / size.height);
    const galleryDistance = Math.max(
      phone ? 25.2 : portraitDesktop ? 14.2 : 11.8,
      (2.65 + 1.52 * maxHoverRadius + 0.9 * !phone) / (Math.tan(Math.PI / 9) * aspect) + 2.2,
    );
    const focusDistance = phone ? 11.5 : Math.max(9.6, 2 + (1.9 + 1.06 * maxOpenRadius + 0.3) / (Math.tan(Math.PI / 9) * aspect));
    const focusFrame = 2 * (focusDistance - 2) * Math.tan(Math.PI / 9);
    const freeHeight = Math.max(1, size.height - runtime.detailPanelHeight - 36);
    const phoneFocusScale = Math.min(0.85, (focusFrame * Math.min(0.82 * aspect, (freeHeight / size.height) * 0.78)) / (2 * maxOpenRadius));
    const phoneFocusY = focusFrame * (0.5 - (12 + freeHeight / 2) / size.height);
    camera.position.set(
      cameraX,
      cameraY + (phone ? 1.5 * (1 - focus) * (1 - settle) : 0),
      MathUtils.lerp(MathUtils.lerp(galleryDistance, framing.distance - 4, settle), focusDistance, focus),
    );
    const far = Math.max(80, framing.distance + 13.6);
    if (camera.far !== far) {
      camera.far = far;
      camera.updateProjectionMatrix();
    }
    scratch.lookTarget.set(cameraX, camera.position.y, 0);
    camera.lookAt(scratch.lookTarget);
    camera.updateMatrixWorld();

    space.root.position.copy(camera.position);
    space.root.position.z -= 12;
    space.update(state.spaceTime, state.pointer, (1 - focus) * (1 - exit), runtime.reduced ? null : state.burst);

    const rigAngle = 1.42 * station + runtime.rotations[RIG].y + 0.35 * runtime.rotations[RIG].x + runtime.orbitOffsets[RIG];
    rig.position.set(0, 8 * rise, -(5 * focus) - 6 * rise);
    rig.rotation.set(0, rigAngle, 0);
    rig.scale.setScalar(1);
    rig.updateMatrixWorld(true);
    rig.visible = rise < 0.995 && focus < 0.99;
    constellation.lines.visible = rig.visible;

    earth.update(landing, cameraY, focus, runtime.earthRotation, runtime.reduced ? 1 : (state.effectTime - state.earthAt) / 1.7, framing, settle);
    if (runtime.earthButton) {
      runtime.earthButton.disabled = !earth.root.visible || exit > 0.999 || focus > 0.01;
      runtime.earthButton.style.visibility = runtime.earthButton.disabled ? "hidden" : "visible";
    }

    const lower = Math.floor(station);
    axisAccent.copy(lightColors[lower]).lerp(lightColors[Math.min(LAST, lower + 1)], station - lower);
    lightAxis.update(time, 0.88 * (1 - rise) * (1 - focus), axisAccent, gallery);

    // Background plates: cross-fade lunar → nebula → sunrise with parallax.
    runtime.environments.forEach((plate, i) => {
      if (!plate) return;
      const nebula = MathUtils.smoothstep(gallery, 0.2, 0.43);
      const sunrise = MathUtils.smoothstep(gallery, 0.62, 0.86);
      plate.style.opacity = String((i === 0 ? 1 : i === 1 ? nebula : sunrise) * (1 - rise));
      const drift = runtime.reduced ? 0 : 9 * Math.sin(0.055 * state.spaceTime + i);
      plate.style.transform = `translate3d(${-state.pointer.x * (12 + 6 * i) + drift}px,${
        -32 * Math.sin(progress * Math.PI * 2) - state.pointer.y * (8 + 3 * i) + 0.4 * drift
      }px,0) scale(${1.1 + 0.06 * progress})`;
    });
    if (runtime.journey) runtime.journey.style.transform = `scaleY(${Math.max(0.025, progress)})`;
    scene.environmentRotation.y = 0.75 * progress;
    scene.environmentIntensity = 0.9 + 0.15 * Math.sin(progress * Math.PI);

    const browsing =
      runtime.visible && !runtime.paused && !runtime.reduced && runtime.phase === "browsing" && runtime.selected < 0 && !runtime.gesture && !inFinale && focus < 0.001;
    const hovered = runtime.hoverLabel >= 0 ? runtime.hoverLabel : runtime.hover;
    let hoverMoving = false;
    const anchors = [];

    meteorRoots.forEach((meteor, n) => {
      const holder = holders[n];
      const isLast = n === LAST;
      const offset = station - n;
      const nearness = Math.exp(-offset * offset * 2.5);
      stationWorld.copy(stations[n]).applyMatrix4(rig.matrixWorld);

      const orbitAngle = 0.85 - 1.42 * n + runtime.orbitOffsets[n] + 0.065 * Math.sin(0.32 * time + 1.7 * n);
      orbitPoint.copy(stations[n]);
      orbitPoint.y += 0.2 * Math.sin(0.55 * time + 1.9 * n) * (1 - rise);
      orbitPoint.x += 2.65 * Math.sin(orbitAngle);
      orbitPoint.z += 2.65 * Math.cos(orbitAngle);
      orbitPoint.applyMatrix4(rig.matrixWorld);
      if (isLast && landing > 0) {
        orbitPoint.y -= 8 * rise;
        orbitPoint.z += 6 * rise;
        flightStart.copy(orbitPoint);
        const target = earth.destination(landingDistance);
        flightPath(phases.flight, flightStart, target, orbitPoint);
        earth.updateTrail(landing, flightStart, target, focus);
        orbitPoint.addScaledVector(IMPACT_NORMAL, -(0.65 * phases.absorption));
      }
      const { x, y, z } = orbitPoint;

      const focused = focus * state.weights[n];
      const open = smooth01((focused - 0.12) / 0.85);
      const hoverTarget = browsing && hovered === n && Math.abs(y - cameraY) < (phone ? 10 : 8) ? 1 : 0;
      const damped =
        !runtime.visible || runtime.reduced || runtime.paused || phases.flight > 0
          ? 0
          : MathUtils.damp(state.hoverWeights[n], hoverTarget, hoverTarget ? 7 : 10, dt);
      const hover = Math.abs(damped - hoverTarget) < 0.001 ? hoverTarget : damped;
      state.hoverWeights[n] = hover;
      hoverMoving ||= hover !== hoverTarget;
      meteors[n].update(open, hover, time);
      const hoverPad = hoverPads[n] * Number(meteor.userData.hoverAmount);
      const others = focus - focused;

      holder.position.set(
        x + focused * ((phone ? 0 : -1.9) - x),
        y + focused * (cameraY + (phone ? phoneFocusY : 0.05) - y),
        z + others * (-7 - z) + focused * (2 - z),
      );
      const distance = Math.abs(station - n);
      const gallerySize = 0.44 + 0.16 * (1 - smooth01(distance - 1)) + 0.92 * (1 - smooth01(distance));
      const baseSize = isLast ? MathUtils.lerp(gallerySize, 0.48, smooth01(phases.flight)) * (1 - 0.999 * phases.absorption) : gallerySize;
      holder.scale.setScalar(baseSize * (1 - 0.35 * others) + focused * ((phone ? phoneFocusScale : 1.06) - baseSize));
      holder.visible =
        (focus < 0.995 && (isLast ? phases.absorption < 0.999 : rise < 0.995) && Math.abs(y - cameraY) < (phone ? 10 : 8)) || focused > 0.001;

      moons.update(n, holder, closedRadii[n] + hoverPads[n], time, (1 - smooth01(focus / 0.3)) * (1 - smooth01(landing / 0.06)), phone);
      if (constellation.lines.visible) {
        constellation.update(
          n,
          stationWorld,
          holder.position,
          tetherStart[n],
          tetherEnd[n],
          holder.visible ? (0.12 + 0.25 * nearness) * (1 - focus) * (1 - rise) : 0,
          time,
        );
      }

      for (const entry of materialStates[n]) {
        entry.material.color.copy(entry.color);
        entry.material.emissive.copy(entry.emissive);
        const breathing = 0.9 + 0.1 * Math.sin(0.85 * time + 1.7 * n);
        entry.material.emissiveIntensity = entry.intensity * (entry.material.name === "Meteor veins" ? breathing * (0.72 + 0.28 * nearness) : 1);
        if (hover > 0) {
          const pulse = 0.5 + 0.5 * Math.sin(4.6 * time + 0.8 * n);
          if (entry.material.name === "Meteor veins") entry.material.emissiveIntensity += hover * (1.1 + 1.5 * pulse);
          else if (entry.material.name === "Meteor crystal") entry.material.emissiveIntensity += hover * (0.18 + 0.3 * pulse);
        }
        if (isLast && landing > 0 && focused < 1) {
          const heat = smooth01((landing - 0.18) / (0.56 - 0.18)) * (1 - focused);
          entry.material.emissive.lerp(landingGlow, heat);
          entry.material.emissiveIntensity += 0.65 * heat;
        }
      }

      const spin = orbitAngle + rigAngle - 0.85;
      const straighten = isLast ? smooth01(phases.flight) * (1 - focused) : 0;
      meteor.rotation.set(
        interpolateAngle(MathUtils.lerp(0.1 + 0.16 * Math.sin(0.31 * time + n), 0.28, focused) + runtime.rotations[n].x, 0, straighten),
        interpolateAngle(interpolateAngle(spin + time * (0.1 + 0.008 * n), 0.3, focused) + runtime.rotations[n].y, 0, straighten),
        0.09 * Math.sin(0.23 * time + n) * (1 - straighten),
      );
      if (isLast) {
        const amount = smooth01(landing / 0.12) * (1 - focused);
        state.finaleSpin.setFromAxisAngle(IMPACT_NORMAL, runtime.finaleSpin * amount);
        meteor.quaternion.premultiply(state.finaleSpin);
        if (runtime.finaleMeteorButton) {
          runtime.finaleMeteorButton.disabled = !holder.visible || !inFinale || exit > 0.999 || focus > 0.01;
          runtime.finaleMeteorButton.style.visibility = runtime.finaleMeteorButton.disabled ? "hidden" : "visible";
        }
      }

      const emblemShown = 1 - MathUtils.smoothstep(open, 0.05, 0.3) + MathUtils.smoothstep(open, 0.48, 0.8);
      const presence = (isLast ? MathUtils.lerp(phases.emblem, 1, focused) : 1) * emblemShown;
      showBadge[n]?.(presence, open);
      if (holder.visible && holder.scale.x > 0.01 && presence > 0.001) placeBadge[n]?.(camera, open, meteors[n].innerRadius, meteor, hoverPad);

      // Screen-space anchor for the HTML label under this meteor.
      if (holder.visible && !inFinale && focus < 0.04) {
        const reach = (closedRadii[n] + hoverPads[n]) * holder.scale.x;
        const box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
        for (const sx of [-1, 1]) {
          for (const sy of [-1, 1]) {
            for (const sz of [-1, 1]) {
              scratch.projected.copy(holder.position).addScaledVector(scratch.corner.set(sx, sy, sz), reach).project(camera);
              const px = (0.5 * scratch.projected.x + 0.5) * size.width;
              const py = (0.5 - 0.5 * scratch.projected.y) * size.height;
              box.left = Math.min(box.left, px);
              box.right = Math.max(box.right, px);
              box.top = Math.min(box.top, py);
              box.bottom = Math.max(box.bottom, py);
            }
          }
        }
        scratch.projected.copy(holder.position).project(camera);
        const onScreen = box.right >= 0 && box.left <= size.width && box.bottom >= 0 && box.top <= size.height;
        if (scratch.projected.z > -1 && scratch.projected.z < 1 && onScreen) {
          anchors.push({ id: n, x: (box.left + box.right) / 2, y: box.bottom + 8, priority: nearness });
        }
      }
    });
    moons.flush();

    const placed = layoutLabels(anchors, size.width, size.height, phone);
    runtime.labels.forEach((label, i) => {
      if (!label) return;
      const spot = placed.find((p) => p.id === i);
      const shown = spot && spot.y < size.height - (phone ? 144 : 70);
      label.classList.toggle("is-hovered", state.hoverWeights[i] > 0.05);
      label.style.visibility = shown ? "visible" : "hidden";
      label.style.opacity = shown ? "1" : "0";
      label.tabIndex = shown ? 0 : -1;
      if (spot) label.style.transform = `translate3d(${Math.round(spot.x)}px,${Math.round(spot.y)}px,0)`;
    });
    if (constellation.lines.visible) constellation.commit();

    if (runtime.intro) {
      const opacity = (1 - MathUtils.smoothstep(gallery, 0.012, 0.052)) * (1 - focus);
      runtime.intro.style.opacity = String(opacity);
      runtime.intro.style.transform = `translateY(${-(70 * gallery)}px)`;
      runtime.intro.style.visibility = opacity > 0.02 ? "visible" : "hidden";
    }
    if (runtime.current) {
      const opacity = MathUtils.smoothstep(gallery, 0.06, 0.1) * (1 - focus) * (1 - rise);
      runtime.current.style.opacity = String(opacity);
      runtime.current.style.visibility = opacity > 0.02 ? "visible" : "hidden";
    }
    if (runtime.finale) {
      const opacity = smooth01((landing - 0.54) / 0.3) * (1 - focus);
      runtime.finale.style.opacity = String(opacity);
      runtime.finale.style.visibility = opacity > 0.02 && exit < 0.999 ? "visible" : "hidden";
      runtime.finale.style.transform = `translateY(${(1 - opacity) * 16}px)`;
    }

    if (runtime.visible && !runtime.reduced && !runtime.paused) {
      const sample = sampleQuality(state.qualityWindow, rawDelta, state.touch ? QUALITY_TOUCH : QUALITY_DESKTOP);
      state.qualityWindow = sample.window;
      if (sample.lower) {
        state.quality = 1;
        setDpr(1);
      }
    }

    if (state.pointerInside && runtime.visible && !runtime.gesture && runtime.selected < 0 && !inFinale) {
      holders.forEach((holder) => holder.updateMatrixWorld(true));
      events.update?.();
    }

    const settling = Math.abs(runtime.progress - runtime.smoothProgress) > 1e-4 || Math.abs(focus - state.lastFocus) > 1e-4;
    state.lastFocus = focus;
    if (
      runtime.visible &&
      (weightsMoving ||
        hoverMoving ||
        settling ||
        (!runtime.reduced && (state.burst.age < 2.5 || state.effectTime - state.earthAt < 1.7)) ||
        (!runtime.reduced && Math.abs(state.pointer.x - runtime.pointer.x) + Math.abs(state.pointer.y - runtime.pointer.y) > 0.002) ||
        (!runtime.reduced && !runtime.paused && runtime.phase !== "reading" && landing < 0.999 && exit < 1))
    ) {
      invalidate();
    }
  });

  // ---------------------------------------------------------- interaction

  const applyDrag = (event) => {
    const gesture = runtime.gesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    moveGesture(gesture, event.clientX, event.clientY, performance.now());
    if (!gesture.allowManipulation || gesture.mode === "pending") return;
    runtime.phase = "dragging";
    gl.domElement.style.cursor = "grabbing";
    if (gesture.target === "rig") {
      runtime.rotations[RIG].y = orbitTransform(gesture, event.clientX, event.clientY, size.height);
    } else if (gesture.target === "object") {
      const next = meteorGestureTransform(gesture, event.clientX, event.clientY, size.height);
      runtime.orbitOffsets[gesture.index] = next.angle;
      runtime.rotations[gesture.index].x = next.x;
      runtime.rotations[gesture.index].y = next.y;
    } else if (gesture.target === "meteor") {
      runtime.finaleSpin = orbitTransform(gesture, event.clientX, event.clientY, size.height);
    } else {
      Object.assign(runtime.earthRotation, gestureTransform(gesture, event.clientX, event.clientY, size.height));
    }
    invalidate();
  };

  const pointerDown = (event, index) => {
    if (runtime.selected !== -1 || runtime.gesture || event.button !== 0) return;
    if (index < COUNT && !holders[index].visible) return;
    if (index === EARTH && (!earth.root.visible || !runtime.inFinale)) return;
    if (runtime.inFinale && index !== LAST && index !== EARTH) return;
    event.stopPropagation();
    runtime.hover = runtime.hoverLabel = -1;
    runtime.backgroundPress = null;
    const target = dragTarget(index, runtime.inFinale, COUNT);
    const rotation = target === "earth" ? runtime.earthRotation : runtime.rotations[index < COUNT ? index : RIG];
    const allowManipulation = event.pointerType !== "touch" || exploreTouch;
    runtime.gesture = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      startedAt: performance.now(),
      dragged: false,
      index,
      target,
      originX: rotation.x,
      originY: rotation.y,
      originAngle: target === "meteor" ? runtime.finaleSpin : target === "object" ? runtime.orbitOffsets[index] : runtime.rotations[RIG].y,
      rotationStartX: event.clientX,
      rotationStartY: event.clientY,
      allowManipulation,
      mode: "pending",
    };
    if (allowManipulation) {
      const element = event.target;
      element.setPointerCapture(event.pointerId);
      state.capture = { id: event.pointerId, target: element };
    }
    invalidate();
  };

  const pointerMove = (event) => {
    if (runtime.gesture && runtime.gesture.pointerId === event.pointerId) {
      event.stopPropagation();
      applyDrag(event);
    }
  };

  const pointerUp = (event) => {
    const gesture = runtime.gesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.stopPropagation();
    applyDrag(event);
    const activate = canActivate(gesture, performance.now());
    runtime.backgroundPress = null;
    runtime.cancelGesture();
    if (activate && gesture.target === "earth") {
      earth.setTouchPoint(event.point);
      runtime.earthPulse++;
    } else if (activate && gesture.index < COUNT) {
      if (runtime.inFinale) runtime.finaleMeteorButton?.focus({ preventScroll: true });
      onSelect(gesture.index);
    }
    invalidate();
  };

  return (
    <>
      <ambientLight intensity={0.12} />
      <directionalLight position={[-3, 5, 4]} intensity={2.2} color="#f3eee4" />
      <directionalLight position={[4, 1, -3]} intensity={2.5} color="#a0b4df" />
      <directionalLight position={[-4, -2, 1]} intensity={1.2} color="#a9d2dc" />
      <primitive
        object={rig}
        onPointerDown={(event) => pointerDown(event, RIG)}
        onPointerMove={pointerMove}
        onPointerUp={(event) => pointerUp(event, RIG)}
        onPointerOver={() => {
          if (!runtime.gesture && !runtime.inFinale) gl.domElement.style.cursor = "grab";
        }}
        onPointerOut={() => {
          if (!runtime.gesture) gl.domElement.style.cursor = "auto";
        }}
      />
      {meteorRoots.map((meteor, n) => (
        <primitive
          key={projects[n].id}
          object={holders[n]}
          onPointerDown={(event) => pointerDown(event, n)}
          onPointerMove={(event) => {
            if (event.pointerType !== "touch" && event.buttons === 0 && runtime.selected < 0 && !runtime.gesture && !runtime.inFinale && holders[n].visible) {
              event.stopPropagation();
              state.pointerInside = true;
              if (runtime.hover !== n) {
                runtime.hover = n;
                invalidate();
              }
              gl.domElement.style.cursor = "grab";
            }
            pointerMove(event);
          }}
          onPointerUp={(event) => pointerUp(event, n)}
          onPointerOver={(event) => {
            if (event.pointerType === "touch" || event.buttons !== 0 || runtime.selected !== -1 || runtime.gesture || runtime.inFinale || !holders[n].visible) return;
            event.stopPropagation();
            gl.domElement.style.cursor = "grab";
            state.pointerInside = true;
            runtime.hover = n;
            invalidate();
          }}
          onPointerOut={() => {
            if (runtime.hover === n) {
              runtime.hover = -1;
              if (!runtime.gesture) gl.domElement.style.cursor = "auto";
              invalidate();
            }
          }}
        >
          <primitive object={meteor} />
          <mesh visible={false}>
            <sphereGeometry args={[closedRadii[n] + hoverPads[n] + 0.04, 16, 12]} />
            <meshBasicMaterial />
          </mesh>
        </primitive>
      ))}
      <primitive object={constellation.lines} />
      <primitive object={moons.root} />
      <primitive
        object={earth.root}
        onPointerDown={(event) => pointerDown(event, EARTH)}
        onPointerMove={pointerMove}
        onPointerUp={(event) => pointerUp(event, EARTH)}
        onPointerOver={(event) => {
          if (earth.root.visible && runtime.selected < 0 && !runtime.gesture) {
            event.stopPropagation();
            gl.domElement.style.cursor = "grab";
          }
        }}
        onPointerOut={() => {
          if (!runtime.gesture) gl.domElement.style.cursor = "auto";
        }}
      />
      <primitive object={earth.trail} />
      <primitive object={space.root} />
      <Asteroids runtime={runtime} />
    </>
  );
}
