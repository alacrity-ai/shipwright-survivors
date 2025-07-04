// src/game/waves/orchestrator/helpers/shakeOnShipDestruction.ts

import { shakeCamera } from '@/core/interfaces/events/CameraReporter';
import type { Ship } from '@/game/ship/Ship';
import { randomInRange } from '@/shared/mathUtils';

export function shakeOnShipDestruction(ship: Ship): void {
  const mass = ship.getInitialMass();

  // === Tiered base values ===
  let baseStrength = 4;
  let baseDuration = 0.3;
  let baseFrequency = 6;

  if (mass > 3000) {
    baseStrength = 15;
    baseDuration = 0.4;
    baseFrequency = 12;
  } else if (mass > 1000) {
    baseStrength = 10;
    baseDuration = 0.3;
    baseFrequency = 10;
  } else if (mass > 500) {
    baseStrength = 6;
    baseDuration = 0.3;
    baseFrequency = 8;
  }

  // === Random jitter ===
  const strength = baseStrength * randomInRange(0.85, 1.15);
  const duration = baseDuration * randomInRange(0.95, 1.05);
  const frequency = baseFrequency;

  shakeCamera(strength, duration, frequency, 'enemyDestruction');
}
