// src/systems/combat/backends/TurretBackend.ts

import type { WeaponBackend } from '@/systems/combat/WeaponSystem';
import type { Ship } from '@/game/ship/Ship';
import type { ShipTransform } from '@/systems/physics/MovementSystem';
import type { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';

interface CooldownState {
  turretCooldown: number;
  turretIndex: number;
}

// Define turret color palettes by index
const TURRET_COLOR_PALETTES: Record<string, string[]> = {
  turret0: ['#ffff88', '#ffaa00', '#ffcc33'],
  turret1: ['#ff8888', '#ff3333', '#ffaaaa'], // alt red-orange
  turret2: ['#88ff88', '#33dd33', '#aaffaa'], // green
  turret3: ['#88ccff', '#3399ff', '#66ddff'], // blue
  turret4: ['#cc88ff', '#9933ff', '#ddaaff'], // purple
};

export class TurretBackend implements WeaponBackend {
  private cooldowns: WeakMap<Ship, CooldownState> = new WeakMap();

  constructor(private readonly projectileSystem: ProjectileSystem) {}

  public update(dt: number, ship: Ship, transform: ShipTransform, intent: WeaponIntent | null): void {
    const plan = ship.getTurretPlan();
    if (plan.length === 0) return;

    const target = intent?.aimAt;
    const fireRequested = intent?.firePrimary ?? false;

    for (const turret of plan) {
      turret.timeSinceLastShot += dt;

      if (!fireRequested) continue;
      if (turret.timeSinceLastShot < turret.fireCooldown) continue;

      turret.timeSinceLastShot = 0;

      const { coord, block } = turret;
      const localX = coord.x * 32;
      const localY = coord.y * 32;
      const cos = Math.cos(transform.rotation);
      const sin = Math.sin(transform.rotation);
      const worldX = transform.position.x + localX * cos - localY * sin;
      const worldY = transform.position.y + localX * sin + localY * cos;

      const fire = block.type.behavior!.fire!;
      const turretId = block.type.id;
      const particleColors = TURRET_COLOR_PALETTES[turretId] ?? TURRET_COLOR_PALETTES['turret0'];

      this.projectileSystem.spawnProjectile(
        { x: worldX, y: worldY },
        target!,
        fire.fireType,
        fire.fireDamage,
        fire.projectileSpeed ?? 300,
        fire.lifetime ?? 2,
        fire.accuracy ?? 1,
        ship.id,
        particleColors
      );
    }
  }
}
