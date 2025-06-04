// src/systems/combat/backends/LaserBackend.ts

import type { WeaponBackend } from '@/systems/combat/WeaponSystem';
import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { LaserSystem } from '@/systems/physics/LaserSystem';

export class LaserBackend implements WeaponBackend {
  private fireEligibility = new WeakMap<Ship, boolean>();

  constructor(private readonly laserSystem: LaserSystem) {}

  update(dt: number, ship: Ship, transform: BlockEntityTransform, intent: WeaponIntent | null): void {
    if (!intent?.fireSecondary) {
      this.fireEligibility.set(ship, false);
      return;
    }

    const shipEnergy = ship.getEnergyComponent();
    if (!shipEnergy) return;

    const alreadyEligible = this.fireEligibility.get(ship) ?? false;

    if (!alreadyEligible) {
      if (shipEnergy.getCurrent() >= 15) {
        this.fireEligibility.set(ship, true);
      } else {
        return; // not enough energy to begin firing
      }
    }

    const laserBlocks = ship.getAllBlocks().filter(([_, b]) =>
      b.type.id.startsWith('laser') &&
      b.type.behavior?.canFire &&
      b.type.behavior.fire?.fireType === 'laser'
    );

    if (laserBlocks.length === 0) return;

    this.laserSystem.queueUpdate(ship, transform, intent);
  }
}
