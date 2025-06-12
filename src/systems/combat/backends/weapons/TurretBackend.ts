// src/systems/combat/backends/TurretBackend.ts

import type { WeaponBackend } from '@/systems/combat/WeaponSystem';
import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { WeaponFiringPlanEntry } from '@/systems/combat/types/WeaponTypes';
import { TURRET_COLOR_PALETTES } from '@/game/blocks/BlockColorSchemes';
import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';
import { FiringMode, TurretClassId, TurretSequenceState } from '@/systems/combat/types/WeaponTypes';

type TargetPoint = { x: number; y: number };

export class TurretBackend implements WeaponBackend {
  private fireSoundTimer: number = 0;
  private wasFiringLastFrame: boolean = false; // Track firing state

  constructor(
    private readonly projectileSystem: ProjectileSystem,
    private readonly playerShip: Ship
  ) {}

  public update(dt: number, ship: Ship, transform: BlockEntityTransform, intent: WeaponIntent | null): void {
    const plan = ship.getFiringPlan().filter(p =>
      p.block.type.id.startsWith('turret') || p.block.type.id.startsWith('cockpit')
    );
    if (plan.length === 0) return;

    const { fireRateMulti = 1 } = ship.getAffixes();
    const target = intent?.aimAt;
    const fireRequested = intent?.firePrimary ?? false;
    const mode = intent?.firingMode ?? FiringMode.Synced;
    this.fireSoundTimer++;

    // Always advance cooldowns regardless of dfiring
    for (const turret of plan) {
      turret.timeSinceLastShot += dt;
    }

    // Detect if we just resumed firing after a pause
    const justResumedFiring = fireRequested && !this.wasFiringLastFrame;
    this.wasFiringLastFrame = fireRequested;

    if (!fireRequested || !target) return;

    if (mode === FiringMode.Synced) {
      this.handleSyncedFiring(plan, ship, transform, target, fireRateMulti, dt);
    } else if (mode === FiringMode.Sequence) {
      this.handleSequenceFiring(plan, ship, transform, target, fireRateMulti, dt, justResumedFiring);
    }
  }

  private handleSyncedFiring(
    plan: WeaponFiringPlanEntry[],
    ship: Ship,
    transform: BlockEntityTransform,
    target: TargetPoint,
    fireRateMulti: number,
    dt: number
  ): void {
    for (let i = plan.length - 1; i >= 0; i--) {
      const turret = plan[i];
      if (!ship.getBlockCoord(turret.block)) continue;

      if (turret.timeSinceLastShot < turret.fireCooldown / fireRateMulti) continue;

      this.spawnTurretProjectile(ship, transform, turret, target);
      turret.timeSinceLastShot = 0;
    }
  }

  private handleSequenceFiring(
    plan: WeaponFiringPlanEntry[],
    ship: Ship,
    transform: BlockEntityTransform,
    target: TargetPoint,
    fireRateMulti: number,
    dt: number,
    justResumedFiring: boolean
  ): void {
    const grouped = new Map<TurretClassId, WeaponFiringPlanEntry[]>();
    for (const entry of plan) {
      const id = entry.block.type.id;
      if (!grouped.has(id)) grouped.set(id, []);
      grouped.get(id)!.push(entry);
    }

    const sequenceState = ship['turretSequenceState'] as Record<TurretClassId, TurretSequenceState>;

    for (const [turretId, turrets] of grouped.entries()) {
      if (turrets.length === 0) continue;

      const rep = turrets[0];
      const effectiveCooldown = rep.fireCooldown / fireRateMulti;
      const interval = effectiveCooldown / turrets.length;

      let state = sequenceState[turretId];
      if (!state) {
        // Fire immediately on first activation
        state = sequenceState[turretId] = { nextIndex: 0, lastFiredAt: interval };
      }

      // If we just resumed firing and there's a ready turret, fire immediately
      if (justResumedFiring) {
        const readyTurret = turrets.find(t => t.timeSinceLastShot >= effectiveCooldown);
        if (readyTurret) {
          // Find the index of the ready turret and fire it
          const readyIndex = turrets.indexOf(readyTurret);
          this.spawnTurretProjectile(ship, transform, readyTurret, target);
          readyTurret.timeSinceLastShot = 0;
          
          // Update sequence state to continue from the next turret
          state.nextIndex = (readyIndex + 1) % turrets.length;
          state.lastFiredAt = 0; // Reset timing for sequence continuation
          continue; // Skip normal interval logic this frame
        }
      }

      state.lastFiredAt += dt;

      if (state.lastFiredAt >= interval) {
        const turret = turrets[state.nextIndex % turrets.length];
        if (!ship.getBlockCoord(turret.block)) continue;

        if (turret.timeSinceLastShot >= effectiveCooldown) {
          this.spawnTurretProjectile(ship, transform, turret, target);
          turret.timeSinceLastShot = 0;
          state.nextIndex = (state.nextIndex + 1) % turrets.length;
          state.lastFiredAt = 0;
        }
      }
    }
  }

  private spawnTurretProjectile(
    ship: Ship,
    transform: BlockEntityTransform,
    turret: WeaponFiringPlanEntry,
    target: TargetPoint
  ): void {
    const { coord, block } = turret;
    turret.timeSinceLastShot = 0;

    const localX = coord.x * 32;
    const localY = coord.y * 32;
    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);
    const worldX = transform.position.x + localX * cos - localY * sin;
    const worldY = transform.position.y + localX * sin + localY * cos;

    const fire = block.type.behavior!.fire!;
    const turretId = block.type.id;
    const particleColors = TURRET_COLOR_PALETTES[turretId] ?? TURRET_COLOR_PALETTES['turret0'];

    if (this.fireSoundTimer > 5) {
      playSpatialSfx(ship, this.playerShip, {
        file: 'assets/sounds/sfx/weapons/turret_00.wav',
        channel: 'sfx',
        pitchRange: [0.7, 1.4],
        volumeJitter: 0.2,
        baseVolume: 1.0,
        maxSimultaneous: 7,
      });
      this.fireSoundTimer = 0;
    }

    this.projectileSystem.spawnProjectile(
      { x: worldX, y: worldY },
      target,
      fire.fireType!,
      fire.fireDamage!,
      fire.projectileSpeed ?? 300,
      fire.lifetime ?? 2,
      fire.accuracy ?? 1,
      ship.id,
      particleColors,
      'delayed'
    );
  }

  render(dt: number): void {}
}