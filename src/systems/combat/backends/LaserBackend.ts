// src/systems/combat/backends/LaserBackend.ts

import type { WeaponBackend } from '@/systems/combat/WeaponSystem';
import type { Ship } from '@/game/ship/Ship';
import type { ShipTransform } from '@/systems/physics/MovementSystem';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { LaserSystem } from '@/systems/physics/LaserSystem';

export class LaserBackend implements WeaponBackend {
  constructor(private readonly laserSystem: LaserSystem) {}

  update(dt: number, ship: Ship, transform: ShipTransform, intent: WeaponIntent | null): void {
    if (!intent?.fireSecondary) return;

    const shipEnergy = ship.getEnergyComponent();
    if (!shipEnergy || shipEnergy.getCurrent() < 25) return;

    const laserBlocks = ship.getAllBlocks().filter(([_, b]) =>
      b.type.id.startsWith('laser') &&
      b.type.behavior?.canFire &&
      b.type.behavior.fire?.fireType === 'laser'
    );

    if (laserBlocks.length === 0) return;

    this.laserSystem.queueUpdate(ship, transform, intent);
  }
}
