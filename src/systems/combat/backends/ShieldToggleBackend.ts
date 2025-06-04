// src/systems/utility/backends/ShieldToggleBackend.ts

import type { UtilityBackend } from '@/systems/combat/UtilitySystem';
import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { UtilityIntent } from '@/core/intent/interfaces/UtilityIntent';

import { audioManager } from '@/audio/Audio';

export class ShieldToggleBackend implements UtilityBackend {
  private wasPressedLastFrame = new WeakMap<Ship, boolean>();

  update(dt: number, ship: Ship, transform: BlockEntityTransform, intent: UtilityIntent | null): void {
    const isPressed = !!intent?.toggleShields;
    const wasPressed = this.wasPressedLastFrame.get(ship) ?? false;

    this.wasPressedLastFrame.set(ship, isPressed);
    if (!isPressed || wasPressed) return;

    const shieldComponent = ship.getShieldComponent?.();
    if (!shieldComponent) return;

    if (!shieldComponent.hasShieldBlocks()) return;

    if (shieldComponent.isActive()) {
      audioManager.play('assets/sounds/sfx/ship/energy-shield-reverse_00.wav', 'sfx', { maxSimultaneous: 3 });
      shieldComponent.deactivate();
    } else {
      audioManager.play('assets/sounds/sfx/ship/energy-shield_00.wav', 'sfx', { maxSimultaneous: 3 });
      shieldComponent.activate();
    }
  }
}
