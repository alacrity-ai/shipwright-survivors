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

export class TurretBackend implements WeaponBackend {
  private cooldowns: WeakMap<Ship, CooldownState> = new WeakMap();

  constructor(private readonly projectileSystem: ProjectileSystem) {}

  public update(dt: number, ship: Ship, transform: ShipTransform, intent: WeaponIntent | null): void {
    if (!intent?.firePrimary) {
      this.resetCooldown(ship);
      return;
    }

    const allBlocks = ship.getAllBlocks();
    const turretBlocks = allBlocks.filter(([_, b]) =>
      b.type.id.startsWith('turret') &&
      b.type.behavior?.canFire &&
      b.type.behavior.fire
    );

    if (turretBlocks.length === 0) return;

    const fire = turretBlocks[0][1].type.behavior!.fire!;
    const fireRate = fire.fireRate || 1;
    const interval = 1 / fireRate / turretBlocks.length;

    const cooldownState = this.getCooldownState(ship);

    if (cooldownState.turretCooldown <= 0) {
      if (cooldownState.turretIndex >= turretBlocks.length) {
        cooldownState.turretIndex = 0;
      }

      const [coord, _block] = turretBlocks[cooldownState.turretIndex];
      cooldownState.turretIndex = (cooldownState.turretIndex + 1) % turretBlocks.length;
      cooldownState.turretCooldown = interval;

      const localX = coord.x * 32;
      const localY = coord.y * 32;
      const cos = Math.cos(transform.rotation);
      const sin = Math.sin(transform.rotation);
      const rotatedX = localX * cos - localY * sin;
      const rotatedY = localX * sin + localY * cos;
      const turretWorldX = transform.position.x + rotatedX;
      const turretWorldY = transform.position.y + rotatedY;

      const target = intent.aimAt;
      if (!target) return;

      this.projectileSystem.spawnProjectile(
        { x: turretWorldX, y: turretWorldY },
        target,
        fire.fireType,
        fire.fireDamage,
        fire.projectileSpeed ?? 300,
        fire.lifetime ?? 2,
        fire.accuracy ?? 1,
        ship.id
      );
    } else {
      cooldownState.turretCooldown -= dt;
    }
  }

  private getCooldownState(ship: Ship): CooldownState {
    let state = this.cooldowns.get(ship);
    if (!state) {
      state = { turretCooldown: 0, turretIndex: 0 };
      this.cooldowns.set(ship, state);
    }
    return state;
  }

  private resetCooldown(ship: Ship): void {
    const state = this.getCooldownState(ship);
    state.turretCooldown = 0;
    state.turretIndex = 0;
  }
}
