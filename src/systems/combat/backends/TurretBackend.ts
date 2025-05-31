// src/systems/combat/backends/TurretBackend.ts

import type { WeaponBackend } from '@/systems/combat/WeaponSystem';
import type { Ship } from '@/game/ship/Ship';
import type { ShipTransform } from '@/systems/physics/MovementSystem';
import type { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import { TURRET_COLOR_PALETTES } from '@/game/blocks/BlockColorSchemes';


export class TurretBackend implements WeaponBackend {
  constructor(private readonly projectileSystem: ProjectileSystem) {}

  public update(dt: number, ship: Ship, transform: ShipTransform, intent: WeaponIntent | null): void {
    const plan = ship.getFiringPlan().filter(p =>
      p.block.type.id.startsWith('turret')
    );

    if (plan.length === 0) return;

    const target = intent?.aimAt;
    const fireRequested = intent?.firePrimary ?? false;

    for (let i = plan.length - 1; i >= 0; i--) {
      const turret = plan[i];
      if (!ship.getBlockCoord(turret.block)) continue;

      turret.timeSinceLastShot += dt;
      if (!fireRequested || turret.timeSinceLastShot < turret.fireCooldown) continue;

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
        fire.fireType!,
        fire.fireDamage!,
        fire.projectileSpeed ?? 300,
        fire.lifetime ?? 2,
        fire.accuracy ?? 1,
        ship.id,
        particleColors
      );
    }
  }
}
