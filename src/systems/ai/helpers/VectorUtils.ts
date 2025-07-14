// src/systems/ai/helpers/VectorUtils.ts

export type Vec2 = { x: number; y: number };

export function predictPosition(position: Vec2, velocity: Vec2, time: number): Vec2 {
  return {
    x: position.x + velocity.x * time,
    y: position.y + velocity.y * time,
  };
}

export function predictInterceptPosition(
  shooterPos: Vec2,
  targetPos: Vec2,
  targetVelocity: Vec2,
  projectileSpeed: number,
  maxIterations: number = 3
): Vec2 {
  // If target isn't moving, just return current position
  if (targetVelocity.x === 0 && targetVelocity.y === 0) {
    return targetPos;
  }

  let predictedPos = targetPos;
  
  // Iteratively refine the prediction
  for (let i = 0; i < maxIterations; i++) {
    const dx = predictedPos.x - shooterPos.x;
    const dy = predictedPos.y - shooterPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate time for projectile to reach predicted position
    const timeToHit = distance / projectileSpeed;
    
    // Update predicted position based on target movement
    predictedPos = {
      x: targetPos.x + targetVelocity.x * timeToHit,
      y: targetPos.y + targetVelocity.y * timeToHit
    };
  }
  
  return predictedPos;
}

// Alternative: Analytical solution for more accuracy
export function predictInterceptPositionAnalytical(
  shooterPos: Vec2,
  targetPos: Vec2,
  targetVelocity: Vec2,
  projectileSpeed: number
): Vec2 {
  const dx = targetPos.x - shooterPos.x;
  const dy = targetPos.y - shooterPos.y;
  
  const vx = targetVelocity.x;
  const vy = targetVelocity.y;
  
  const a = vx * vx + vy * vy - projectileSpeed * projectileSpeed;
  const b = 2 * (dx * vx + dy * vy);
  const c = dx * dx + dy * dy;
  
  // Solve quadratic equation at² + bt + c = 0
  const discriminant = b * b - 4 * a * c;
  
  if (discriminant < 0) {
    // No intercept possible, return current target position
    return targetPos;
  }
  
  const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
  const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);
  
  // Choose the positive, smaller time value
  const t = Math.min(t1 > 0 ? t1 : Infinity, t2 > 0 ? t2 : Infinity);
  
  if (t === Infinity) {
    // No valid intercept time, return current target position
    return targetPos;
  }
  
  return {
    x: targetPos.x + vx * t,
    y: targetPos.y + vy * t
  };
}

export function getDistance(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function normalize(v: Vec2): Vec2 {
  const mag = Math.sqrt(v.x * v.x + v.y * v.y);
  return mag === 0 ? { x: 0, y: 0 } : { x: v.x / mag, y: v.y / mag };
}

export function vectorMagnitude(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function getAngleBetween(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.atan2(dy, dx); // standard world angle, +Y is down
}

export function angleDiff(a: number, b: number): number {
  let diff = (b - a + Math.PI) % (2 * Math.PI);
  if (diff < 0) diff += 2 * Math.PI;
  return diff - Math.PI;
}

export function clampAngleRad(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

export function shouldRotateLeft(current: number, target: number): boolean {
  return angleDiff(current, target) < 0;
}


