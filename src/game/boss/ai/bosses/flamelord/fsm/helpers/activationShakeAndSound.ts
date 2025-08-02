// src/game/boss/ai/bosses/flamelord/fsm/helpers/activationShakeAndSound.ts

import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';
import { shakeCamera } from '@/core/interfaces/events/CameraReporter';
import { ShipRegistry } from '@/game/ship/ShipRegistry';

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';

export function playActivationEffects(boss: CompositeBlockObject): void {
  const playerShip = ShipRegistry.getInstance().getPlayerShip();

  playSpatialSfx(boss, playerShip, {
    file: 'assets/sounds/sfx/explosions/fire_chargeup.wav',
    channel: 'sfx',
    baseVolume: 1.0,
    pitchRange: [0.9, 1.2],
    volumeJitter: 0.0,
    maxSimultaneous: 5,
  });

  playSpatialSfx(boss, playerShip, {
    file: 'assets/sounds/sfx/magic/energy_orb_activation.wav',
    channel: 'sfx',
    baseVolume: 1.0,
    pitchRange: [0.9, 1.2],
    volumeJitter: 0.0,
    maxSimultaneous: 5,
  });

  // Screen shake
  shakeCamera(12, 1, 12, 'boss:frontalBarrage');   
}
