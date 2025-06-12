// src/lighting/utils/createLightFlash.ts

import { createPointLight } from '@/lighting/lights/createPointLight';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';

/**
 * Creates and registers a short-lived point light flash at the given position.
 */
export function createLightFlash(
  x: number,
  y: number,
  radius: number = 300,
  intensity: number = 1,
  life: number = 0.5,
  color: string = '#ffffff'
): void {
  const light = createPointLight({
    x,
    y,
    radius,
    intensity,
    life,
    color,
    expires: true,
  });

  LightingOrchestrator.getInstance().registerLight(light);
}
