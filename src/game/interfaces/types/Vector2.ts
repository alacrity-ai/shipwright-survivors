// src/game/interfaces/types/Vector2.ts

/**
 * Represents a 2D vector with x and y components
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * Creates a new Vector2 with the specified x and y components
 */
export function createVector2(x: number, y: number): Vector2 {
  return { x, y };
}

/**
 * Creates a copy of the provided Vector2
 */
export function cloneVector2(v: Vector2): Vector2 {
  return { x: v.x, y: v.y };
}

/**
 * Calculates the distance between two Vector2 points
 */
export function distanceBetween(a: Vector2, b: Vector2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates the squared distance between two Vector2 points
 * (faster than distanceBetween when only comparing distances)
 */
export function distanceSquared(a: Vector2, b: Vector2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

/**
 * Adds two vectors together
 */
export function addVectors(a: Vector2, b: Vector2): Vector2 {
  return {
    x: a.x + b.x,
    y: a.y + b.y
  };
}

/**
 * Subtracts vector b from vector a
 */
export function subtractVectors(a: Vector2, b: Vector2): Vector2 {
  return {
    x: a.x - b.x,
    y: a.y - b.y
  };
}

/**
 * Multiplies a vector by a scalar value
 */
export function multiplyVector(v: Vector2, scalar: number): Vector2 {
  return {
    x: v.x * scalar,
    y: v.y * scalar
  };
}

/**
 * Calculates the magnitude (length) of a vector
 */
export function vectorMagnitude(v: Vector2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/**
 * Normalizes a vector (makes it unit length)
 */
export function normalizeVector(v: Vector2): Vector2 {
  const mag = vectorMagnitude(v);
  if (mag === 0) return { x: 0, y: 0 };
  return {
    x: v.x / mag,
    y: v.y / mag
  };
}

/**
 * Calculates the dot product of two vectors
 */
export function dotProduct(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y;
}

/**
 * Rotates a vector by the specified angle (in radians)
 */
export function rotateVector(v: Vector2, angleRad: number): Vector2 {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos
  };
}