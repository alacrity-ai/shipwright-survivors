// src/game/boss/ai/mechanics/helpers/rotateArc.ts

/**
 * Rotates the given arc [startDeg, endDeg] by a rotation in radians.
 * Expects rotation to be in radians. No visual offset applied — that's handled in the mechanic.
 */
export function rotateArc(startDeg: number, endDeg: number, rotationRad: number): [number, number] {
  const rotationDeg = (rotationRad * 180 / Math.PI) % 360;
  return [
    (startDeg + rotationDeg) % 360,
    (endDeg + rotationDeg) % 360
  ];
}
