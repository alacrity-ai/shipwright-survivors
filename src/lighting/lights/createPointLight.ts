import type { PointLightInstance } from './types';

/** Configuration object for creating a point light instance */
export interface PointLightConfig {
  /** Required position in world space */
  x: number;
  y: number;

  /** Optional: Radius in pixels (default: 128) */
  radius?: number;

  /** Optional: Hex color string (default: '#ffffff') */
  color?: string;

  /** Optional: Brightness multiplier (default: 1.0) */
  intensity?: number;

  /** Optional: Whether light should flicker (default: false) */
  flicker?: boolean;

  /** Optional: Duration in ms or s (depending on your convention) */
  life?: number;

  /** Optional: Auto-remove when life expires (default: false) */
  expires?: boolean;

  /** Optional: Force a specific ID (useful for persistent lights) */
  id?: string;
}

/** Generates a stable unique ID */
let idCounter = 0;
function generateLightId(): string {
  return `point-light-${idCounter++}`;
}

/**
 * Creates a PointLightInstance with flexible parameters.
 */
export function createPointLight(config: PointLightConfig): PointLightInstance {
  const {
    x,
    y,
    radius = 128,
    color = '#ffffff',
    intensity = 1.0,
    flicker = false,
    life,
    expires = false,
    id = generateLightId(),
  } = config;

  const instance: PointLightInstance = {
    id,
    x,
    y,
    radius,
    color,
    intensity,
    flicker,
    life,
    maxLife: life,
    expires,
    type: 'point',
  };

  return instance;
}
