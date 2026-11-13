// Pure helpers shared by the shell and the 3D scene: scene slot indices,
// pointer-gesture state machine and the URL/project helpers.

/** Transform slots: one per project, then the whole orbit rig, then Earth. */
export function sceneIndices(count) {
  if (!Number.isInteger(count) || count < 1) throw Error("The scene needs at least one project.");
  return { lastProject: count - 1, rig: count, earth: count + 1, transformSlots: count + 1 };
}

/** Free rotation from a drag: one viewport height = one full turn. */
export function gestureTransform(gesture, x, y, height) {
  const size = Math.max(1, height);
  return {
    x: gesture.originX + ((y - gesture.rotationStartY) / size) * Math.PI * 2,
    y: gesture.originY + ((x - gesture.rotationStartX) / size) * Math.PI * 2,
  };
}

/** Angle around the orbit, with a little vertical contribution. */
export function orbitTransform(gesture, x, y, height) {
  return gesture.originAngle + ((x - gesture.startX + (y - gesture.startY) * 0.35) / Math.max(1, height)) * Math.PI * 2;
}

/** Dragging a meteor both slides it along the orbit and spins it. */
export function meteorGestureTransform(gesture, x, y, height) {
  const rotation = gestureTransform(gesture, x, y, height);
  const slide = (orbitTransform(gesture, x, y, height) - gesture.originAngle) * 0.55;
  return { angle: gesture.originAngle + slide, x: rotation.x, y: rotation.y - slide };
}

export function canActivate(gesture, now) {
  return gesture.mode === "pending" && !gesture.dragged && (gesture.pointerType !== "touch" || now - gesture.startedAt < 350);
}

export function closeStrategy(owner, current) {
  return owner === current ? "back" : "replace";
}

export function dragTarget(index, inFinale, count) {
  const { lastProject, earth } = sceneIndices(count);
  if (index === earth) return "earth";
  if (inFinale && index === lastProject) return "meteor";
  if (!inFinale && index < count) return "object";
  return "rig";
}

export function interpolateAngle(from, to, amount) {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * amount;
}

export function moveGesture(gesture, x, y) {
  const dx = x - gesture.startX;
  const dy = y - gesture.startY;
  gesture.dragged ||= Math.hypot(dx, dy) >= 7;
  if (gesture.mode === "pending" && gesture.allowManipulation && gesture.dragged) {
    gesture.mode = gesture.target === "rig" ? "orbit" : "rotate";
  }
  gesture.lastX = x;
  gesture.lastY = y;
  return { dx, dy, dragged: gesture.dragged, mode: gesture.mode };
}

export function resolveProject(slug, ids) {
  return slug && ids.includes(slug) ? slug : null;
}
