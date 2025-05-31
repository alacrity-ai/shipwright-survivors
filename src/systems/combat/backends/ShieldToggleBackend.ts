// src/systems/utility/backends/ShieldToggleBackend.ts

import type { UtilityBackend } from '@/systems/combat/UtilitySystem';
import type { Ship } from '@/game/ship/Ship';
import type { ShipTransform } from '@/systems/physics/MovementSystem';
import type { UtilityIntent } from '@/core/intent/interfaces/UtilityIntent';

export class ShieldToggleBackend implements UtilityBackend {
  private wasPressedLastFrame = new WeakMap<Ship, boolean>();

  update(dt: number, ship: Ship, transform: ShipTransform, intent: UtilityIntent | null): void {
    const isPressed = !!intent?.toggleShields;
    const wasPressed = this.wasPressedLastFrame.get(ship) ?? false;

    this.wasPressedLastFrame.set(ship, isPressed);
    if (!isPressed || wasPressed) return;

    const shieldComponent = ship.getShieldComponent?.();
    if (!shieldComponent) return;

    if (!shieldComponent.hasShieldBlocks()) return;

    if (shieldComponent.isActive()) {
      shieldComponent.deactivate();
    } else {
      shieldComponent.activate();
    }
  }
}
