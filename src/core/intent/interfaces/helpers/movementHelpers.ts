// src/core/intent/interfaces/helpers/movementHelpers.ts

export type ThrustDirection = 'forward' | 'strafeLeft' | 'strafeRight';

export const classifyThrustDirection = (blockRotationDeg: number): ThrustDirection | null => {
  const rot = ((blockRotationDeg % 360) + 360) % 360; // normalize to [0, 360)

  if (rot === 0) return 'forward';        // Downward-pointing engine
  if (rot === 90) return 'strafeRight';    // Right-pointing engine pushes left
  if (rot === 270) return 'strafeLeft';  // Left-pointing engine pushes right

  return null; // Other angles not yet supported
};
