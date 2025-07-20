// src/lighting/lights/createPointLight.ts

import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import type { LightFadeMode } from './types';

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
  id?: number;

  /** Optional: Fade mode (default: 'linear') */
  fadeMode?: LightFadeMode;
}

const INTENSITY_FACTOR = 0.25;

/**
 * Spawns and registers a PointLightInstance with the orchestrator.
 * Returns the light's unique ID (or null if rejected).
 */
export function createPointLight(
  config: PointLightConfig,
  tag?: string
): number | null {
  // Normalize intensity once
  config.intensity = config.intensity
    ? config.intensity * INTENSITY_FACTOR
    : INTENSITY_FACTOR;

  const {
    x,
    y,
    radius = 128,
    color = '#ffffff',
    intensity = 1.0,
    flicker = false,
    life,
    expires = false,
    fadeMode = 'linear',
  } = config;

  const orchestrator = LightingOrchestrator.getInstance();

  return orchestrator.registerLight({
    id: undefined as any,
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
    fadeMode,
    tag,
  });
}
