import type { WeaponBackend } from '@/systems/combat/WeaponSystem';
import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { WeaponFiringPlanEntry } from '@/systems/combat/types/WeaponTypes';
import { TURRET_COLOR_PALETTES } from '@/game/blocks/BlockColorSchemes';
import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';
import { FiringMode, TurretSequenceState } from '@/systems/combat/types/WeaponTypes';
import { ShipRegistry } from '@/game/ship/ShipRegistry';

import { BlockManager } from '@/game/blocks/system/BlockManager';
import { BlockSubcategoryEnum } from '@/game/interfaces/types/BlockType';
import type { BlockStore } from '@/game/blocks/system/BlockStore';

import { PROJECTILE_TYPE_TO_INDEX } from '@/systems/physics/interfaces/ProjectileTypes';
import { FACTION_TO_INDEX } from '@/game/interfaces/types/Faction';

type TargetPoint = { x: number; y: number };

export class TurretBackend implements WeaponBackend {
  private fireSoundTimer = 0;
  private wasFiringLastFrame = false;
  private store: BlockStore;

  // Instance-local scratch objects for GC neutrality
  private scratchPlan: WeaponFiringPlanEntry[] = [];
  private scratchGrouped: WeaponFiringPlanEntry[][] = [[], [], [], [], [], []];
  private scratchCoord = { x: 0, y: 0 };
  private scratchOrigin = { x: 0, y: 0 };
  private scratchVelocity = { x: 0, y: 0 };

  constructor(private readonly projectileSystem: ProjectileSystem) {
    this.store = BlockManager.getInstance().getBlockStore();
  }

  public update(
    dt: number,
    ship: Ship,
    transform: BlockEntityTransform,
    intent: WeaponIntent | null
  ): void {
    const store = this.store;

    // ── 1. Filter the ship’s firing plan (turrets + cockpits only, SOA subcategory) ─────
    const plan = ship.getFiringPlan();
    let scratchCount = 0;
    for (let i = 0; i < plan.length; i++) {
      const entry = plan[i];
      const subcat = store.subcategoryCode[entry.blockIndex];
      if (subcat === BlockSubcategoryEnum.Turret) {
        this.scratchPlan[scratchCount++] = entry;
      }
    }
    if (scratchCount === 0) return;

    const target = intent?.aimAt;
    const fireRequested = intent?.firePrimary ?? false;
    const mode = intent?.firingMode ?? FiringMode.Synced;

    this.fireSoundTimer++;

    // ── 2. Compute passive, affix, and skill bonuses (frame-wide) ─────
    const { fireRateMulti = 1 } = ship.getAffixes();
    let fireRateBonus = ship.getPassiveBonus('turret-firing-rate');
    let damageBonus = ship.getPassiveBonus('turret-damage');
    const accuracyBonus = ship.getPassiveBonus('turret-accuracy');

    const { fireRateMultiplier = 0, baseDamageMultiplier = 0 } = ship.getPowerupBonus();
    fireRateBonus += fireRateMultiplier + ship.getFireRateMultiplier();
    damageBonus += baseDamageMultiplier;

    const {
      turretProjectileSpeed = 0,
      turretSplitShots = false,
      turretPenetratingShots = false,
      turretDamage = 0,
    } = ship.getSkillEffects();

    const spreadMultiplier = (Math.PI / 8) * (1 - accuracyBonus);

    // ── 3. Increment cooldown timers for all filtered turrets ─────
    for (let i = 0; i < scratchCount; i++) {
      this.scratchPlan[i].timeSinceLastShot += dt;
    }

    const justResumedFiring = fireRequested && !this.wasFiringLastFrame;
    this.wasFiringLastFrame = fireRequested;

    if (!fireRequested || !target) return;

    const effectiveRate = fireRateMulti * fireRateBonus;

    // ── 4. Route to firing mode handler ─────
    if (mode === FiringMode.Synced) {
      this.handleSyncedFiring(
        this.scratchPlan,
        scratchCount,
        ship,
        transform,
        target,
        effectiveRate,
        damageBonus,
        accuracyBonus,
        dt,
        { turretProjectileSpeed, turretSplitShots, turretPenetratingShots, turretDamage },
        spreadMultiplier
      );
    } else {
      this.handleSequenceFiring(
        this.scratchPlan,
        scratchCount,
        ship,
        transform,
        target,
        effectiveRate,
        damageBonus,
        accuracyBonus,
        dt,
        justResumedFiring,
        { turretProjectileSpeed, turretSplitShots, turretPenetratingShots, turretDamage },
        spreadMultiplier
      );
    }
  }

  private handleSyncedFiring(
    plan: WeaponFiringPlanEntry[],
    count: number,
    ship: Ship,
    transform: BlockEntityTransform,
    target: TargetPoint,
    fireRateMulti: number,
    damageBonus: number,
    accuracyBonus: number,
    dt: number,
    skillEffects: {
      turretProjectileSpeed: number;
      turretSplitShots: boolean;
      turretPenetratingShots: boolean;
      turretDamage: number;
    },
    spreadMultiplier: number
  ): void {
    const store = this.store;

    for (let i = 0; i < count; i++) {
      const turret = plan[i];
      const idx = turret.blockIndex;

      if (store.ownerShipId[idx] === 0) continue; // Block removed
      if (turret.timeSinceLastShot < turret.fireCooldown / fireRateMulti) continue;

      this.scratchCoord.x = store.localX[idx];
      this.scratchCoord.y = store.localY[idx];

      this.spawnTurretProjectile(
        ship,
        transform,
        idx,
        this.scratchCoord,
        target,
        damageBonus,
        accuracyBonus,
        skillEffects,
        spreadMultiplier
      );

      turret.timeSinceLastShot = 0;
    }
  }

  private handleSequenceFiring(
    plan: WeaponFiringPlanEntry[],
    count: number,
    ship: Ship,
    transform: BlockEntityTransform,
    target: TargetPoint,
    fireRateMulti: number,
    damageBonus: number,
    accuracyBonus: number,
    dt: number,
    justResumedFiring: boolean,
    skillEffects: {
      turretProjectileSpeed: number;
      turretSplitShots: boolean;
      turretPenetratingShots: boolean;
      turretDamage: number;
    },
    spreadMultiplier: number
  ): void {
    const store = this.store;

    // ── 1. Clear scratch group buckets ─────
    for (let i = 0; i < this.scratchGrouped.length; i++) {
      this.scratchGrouped[i].length = 0;
    }

    // ── 2. Group turrets by tier (class) ─────
    for (let i = 0; i < count; i++) {
      const entry = plan[i];
      const idx = entry.blockIndex;
      if (store.ownerShipId[idx] === 0) continue;

      const tier = store.tier[idx];
      this.scratchGrouped[tier].push(entry);
    }

    const sequenceState = ship['turretSequenceState'] as Record<number, TurretSequenceState>;

    // ── 3. Process each tier group ─────
    for (let tier = 0; tier < this.scratchGrouped.length; tier++) {
      const turrets = this.scratchGrouped[tier];
      if (turrets.length === 0) continue;

      const repIdx = turrets[0].blockIndex;
      const baseCooldown = store.fireRate[repIdx] > 0 ? 1 / store.fireRate[repIdx] : 0.5;
      const effectiveCooldown = baseCooldown / fireRateMulti;
      const interval = effectiveCooldown / turrets.length;

      let state = sequenceState[tier];
      if (!state) {
        state = sequenceState[tier] = { nextIndex: 0, lastFiredAt: interval };
      }

      if (justResumedFiring) {
        // Prioritize any turret already cooled down
        for (let j = 0; j < turrets.length; j++) {
          const t = turrets[j];
          if (t.timeSinceLastShot >= effectiveCooldown) {
            this.scratchCoord.x = store.localX[t.blockIndex];
            this.scratchCoord.y = store.localY[t.blockIndex];

            this.spawnTurretProjectile(
              ship,
              transform,
              t.blockIndex,
              this.scratchCoord,
              target,
              damageBonus,
              accuracyBonus,
              skillEffects,
              spreadMultiplier
            );

            t.timeSinceLastShot = 0;
            state.nextIndex = (j + 1) % turrets.length;
            state.lastFiredAt = 0;
            break;
          }
        }
        continue;
      }

      state.lastFiredAt += dt;

      if (state.lastFiredAt >= interval) {
        const t = turrets[state.nextIndex % turrets.length];
        if (store.ownerShipId[t.blockIndex] === 0) continue;

        if (t.timeSinceLastShot >= effectiveCooldown) {
          this.scratchCoord.x = store.localX[t.blockIndex];
          this.scratchCoord.y = store.localY[t.blockIndex];

          this.spawnTurretProjectile(
            ship,
            transform,
            t.blockIndex,
            this.scratchCoord,
            target,
            damageBonus,
            accuracyBonus,
            skillEffects,
            spreadMultiplier
          );

          t.timeSinceLastShot = 0;
          state.nextIndex = (state.nextIndex + 1) % turrets.length;
          state.lastFiredAt = 0;
        }
      }
    }
  }

  private spawnTurretProjectile(
    ship: Ship,
    transform: BlockEntityTransform,
    blockIdx: number,
    coord: { x: number; y: number },
    target: TargetPoint,
    damageBonus: number,
    accuracyBonus: number,
    skillEffects: {
      turretProjectileSpeed: number;
      turretSplitShots: boolean;
      turretPenetratingShots: boolean;
      turretDamage: number;
    },
    spreadMultiplier: number
  ): void {
    const store = this.store;

    // Skip removed or deallocated blocks
    if (store.ownerShipId[blockIdx] === 0) return;

    // Pull SOA attributes
    const fireDamage = store.fireDamage[blockIdx] || 1;
    const fireAccuracy = store.fireAccuracy[blockIdx] || 1;
    let projectileSpeed = store.projectileSpeed[blockIdx] || 300;
    let lifetime = store.projectileLifetime[blockIdx] || 2;
    const tier = store.tier[blockIdx];

    // Adjust turret speeds down for NPCs
    if (!ship.getIsPlayerShip()) {
      projectileSpeed *= 0.35;
      lifetime *= 2;
    }

    const particleColors = TURRET_COLOR_PALETTES[tier] ?? TURRET_COLOR_PALETTES[0];

    // Local → world position (reused scratchOrigin)
    const localX = coord.x * 32;
    const localY = coord.y * 32;
    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);
    this.scratchOrigin.x = transform.position.x + localX * cos - localY * sin;
    this.scratchOrigin.y = transform.position.y + localX * sin + localY * cos;

    // Direction to target
    const dx = target.x - this.scratchOrigin.x;
    const dy = target.y - this.scratchOrigin.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag === 0) return;

    // Aim + spread
    let angle = Math.atan2(dy, dx);
    const spread = (1 - fireAccuracy) * spreadMultiplier;
    if (spread > 0) {
      angle += (Math.random() * 2 - 1) * spread;
    }

    const aimX = Math.cos(angle);
    const aimY = Math.sin(angle);

    // Base projectile speed (with skill effects)
    let baseSpeed = projectileSpeed + skillEffects.turretProjectileSpeed;

    // Combine with ship velocity (reused scratchVelocity)
    const shipVel = transform.velocity;
    this.scratchVelocity.x = aimX * baseSpeed + shipVel.x;
    this.scratchVelocity.y = aimY * baseSpeed + shipVel.y;

    // Ensure forward velocity meets base speed
    const projectedSpeed = this.scratchVelocity.x * aimX + this.scratchVelocity.y * aimY;
    if (projectedSpeed < baseSpeed) {
      const correction = baseSpeed - projectedSpeed;
      this.scratchVelocity.x += aimX * correction;
      this.scratchVelocity.y += aimY * correction;
    }

    const totalDamage = (fireDamage + skillEffects.turretDamage) * damageBonus;

    // Play sound periodically (avoiding repeated allocations)
    if (this.fireSoundTimer > 4) {
      const playerShip = ShipRegistry.getInstance().getPlayerShip();
      playSpatialSfx(ship, playerShip, {
        file: 'assets/sounds/sfx/weapons/turret_03.wav',
        channel: 'sfx',
        pitchRange: [0.7, 1.4],
        volumeJitter: 0.2,
        baseVolume: 1.0,
        maxSimultaneous: 10,
      });
      this.fireSoundTimer = 0;
    }

    // Spawn projectile using scratch objects (no ephemeral allocations)
    this.projectileSystem.spawnProjectileWithVelocity(
      this.scratchOrigin,
      this.scratchVelocity,
      PROJECTILE_TYPE_TO_INDEX['projectile'],
      totalDamage,
      lifetime,
      1, // Accuracy already baked into spread
      ship.numericId,
      FACTION_TO_INDEX[ship.getFaction()],
      particleColors,
      'delayed',
      skillEffects.turretSplitShots,
      skillEffects.turretPenetratingShots
    );
  }

  public render(dt: number): void {}
}
