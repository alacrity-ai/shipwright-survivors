// src/systems/ai/helpers/VectorUtils.ts

export type Vec2 = { x: number; y: number };

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

export function predictPosition(position: Vec2, velocity: Vec2, time: number): Vec2 {
  return {
    x: position.x + velocity.x * time,
    y: position.y + velocity.y * time,
  };
}
