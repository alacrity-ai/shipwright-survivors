import type { BeamLightInstance } from './types';

/** Configuration object for creating a beam light */
export interface BeamLightConfig {
  /** Start and end positions in world space */
  start: { x: number; y: number };
  end: { x: number; y: number };

  /** Optional: Width of the beam (default: 16) */
  width?: number;

  /** Optional: Hex color string (default: '#00ffff') */
  color?: string;

  /** Optional: Brightness multiplier (default: 1.0) */
  intensity?: number;

  /** Optional: Duration in ms or s (depending on your convention) */
  life?: number;

  /** Optional: Auto-remove when life expires (default: false) */
  expires?: boolean;

  /** Optional: Force a specific ID */
  id?: string;
}

/** Generates a unique ID for beam lights */
let beamLightIdCounter = 0;
function generateBeamLightId(): string {
  return `beam-light-${beamLightIdCounter++}`;
}

/**
 * Creates a BeamLightInstance representing a linear glow beam (e.g. laser).
 */
export function createBeamLight(config: BeamLightConfig): BeamLightInstance {
  const {
    start,
    end,
    width = 16,
    color = '#00ffff',
    intensity = 1.0,
    life,
    expires = false,
    id = generateBeamLightId(),
  } = config;

  const instance: BeamLightInstance = {
    id,
    type: 'beam',
    start,
    end,
    width,
    color,
    intensity,
    life,
    maxLife: life,
    expires,
  };

  return instance;
}
