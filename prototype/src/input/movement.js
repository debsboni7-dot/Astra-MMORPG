/** Normalize screen-space touch coordinates into game axes (forward is positive). */
export function normalizeTouchStick(dx, dy, limit) {
  const radius = Math.max(1, Number(limit) || 1);
  const length = Math.hypot(dx, dy) || 1;
  const scale = Math.min(1, radius / length) / radius;
  return { side: dx === 0 ? 0 : dx * scale, forward: dy === 0 ? 0 : -dy * scale };
}

/** Merge keyboard, gamepad and touch inputs without reversing touch twice. */
export function getMovementAxes({ keyboardForward = 0, keyboardSide = 0, gamePadX = 0, gamePadY = 0, touchX = 0, touchForward = 0 } = {}) {
  return {
    side: keyboardSide + gamePadX + touchX,
    forward: keyboardForward - gamePadY + touchForward
  };
}

/** Compute a dodge endpoint once; the character must remain at this endpoint. */
export function getDodgeDestination({ x = 0, z = 0, side = 0, forward = 0, cameraYaw = 0, facingYaw = Math.PI, distance = 2.15 } = {}) {
  let dx = side * Math.cos(cameraYaw) + forward * Math.sin(cameraYaw);
  let dz = -side * Math.sin(cameraYaw) + forward * Math.cos(cameraYaw);
  let length = Math.hypot(dx, dz);
  if (length < 0.08) {
    dx = -Math.sin(facingYaw);
    dz = -Math.cos(facingYaw);
    length = Math.hypot(dx, dz) || 1;
  }
  return { x: x + dx / length * distance, z: z + dz / length * distance };
}

/** Convert camera-relative axes into a normalized world-space direction. */
export function getWorldMovementDirection(side = 0, forward = 0, cameraYaw = 0) {
  const x = side * Math.cos(cameraYaw) + forward * Math.sin(cameraYaw);
  const z = -side * Math.sin(cameraYaw) + forward * Math.cos(cameraYaw);
  const length = Math.hypot(x, z);
  return length < 1e-6 ? { x: 0, z: 0 } : { x: x / length, z: z / length };
}

/** Three.js characters in ASTREA face local -Z at yaw 0. */
export function getFacingYaw(directionX, directionZ) {
  if (Math.hypot(directionX, directionZ) < 1e-6) return 0;
  return Math.atan2(directionX, directionZ) + Math.PI;
}

/** Smoothly rotate toward a target angle without taking the long way around. */
export function rotateAngleTowards(current, target, maxStep) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + Math.max(-maxStep, Math.min(maxStep, delta));
}
