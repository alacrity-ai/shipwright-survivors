// src/lighting/utils/createLightFlash.ts

import { createPointLight } from '@/lighting/lights/createPointLight';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';

import { MAXIMUM_LIGHTS_PER_TAG } from '@/lighting/LightingOrchestrator';

/**
 * Creates and registers a short-lived point light flash at the given position.
 */
export function createLightFlash(
  x: number,
  y: number,
  radius: number = 300,
  intensity: number = 1,
  life: number = 0.5,
  color: string = '#ffffff',
  tag?: string
): void {
  const orchestrator = LightingOrchestrator.getInstance();

  if (tag) {
    const count = orchestrator.getTagLightCount(tag);
    if (count >= MAXIMUM_LIGHTS_PER_TAG) {
      return;
    }
  }

  const light = createPointLight(
    {
      x,
      y,
      radius,
      intensity,
      life,
      color,
      expires: true,
    },
    tag
  );

  orchestrator.registerLight(light);
}

