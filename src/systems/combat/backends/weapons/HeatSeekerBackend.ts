// src/systems/combat/backends/HeatSeekerBackend.ts

import type { WeaponBackend } from '@/systems/combat/WeaponSystem';
import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { CombatService } from '@/systems/combat/CombatService';
import type { ParticleManager } from '@/systems/fx/ParticleManager';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';

import type { BlockStore } from '@/game/blocks/system/BlockStore';
import type { BlockOrchestrator } from '@/game/blocks/system/BlockOrchestrator';
import { BlockManager } from '@/game/blocks/system/BlockManager';
import { BlockSubcategoryEnum } from '@/game/interfaces/types/BlockType';

import { Faction } from '@/game/interfaces/types/Faction';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { findNearestTarget, findRandomTargetInRange } from '@/systems/ai/helpers/ShipUtils';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';
import { BLOCK_TIER_COLORS } from '@/game/blocks/BlockColorSchemes';
import { normalizeAngle } from '@/shared/mathUtils';
import { emitDefaultFlames } from '@/core/interfaces/events/SpecialFxReporter';

interface ActiveSeekerMissile {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  fireDamage: number;
  explosionDamage: number;
  explosionRadius: number;
  ttl: number;
  age: number;
  targetShip: Ship | null;
  ownerShipId: number;
  particleHandle: number;
  firingBlockTier: number;
  turningPower: number;
  exploded: boolean;
  targetingRange: number;
  turningPowerInitial: number;
  velocityMagnitudeInitial: number;
  framesSinceTargetUpdate: number;
  lastKnownTargetPosition: { x: number; y: number } | null;
  ownerFaction: Faction;
  igniteOnSeekerMissileExplosion: boolean;
  timeFreezeOnSeekerMissileExplosion: boolean;
}

const SPEED_GROWTH_FACTOR = 1.8; // Final speed = initial * this
const TURNING_GROWTH_FACTOR = 3.0; // Final turningPower = initial * this
const TARGET_UPDATE_INTERVAL = 10; // Update target every N frames for performance
const TURNING_POWER_COMPENSATION = 1.3; // Increase turning power to compensate for frame delays

export class HeatSeekerBackend implements WeaponBackend {
  private activeMissiles: ActiveSeekerMissile[] = [];
  private frameCounter: number = 0;
  private store: BlockStore;
  private orchestrator: BlockOrchestrator;

  constructor(
    private readonly combatService: CombatService,
    private readonly particleManager: ParticleManager,
  ) {
    this.store = BlockManager.getInstance().getBlockStore();
    this.orchestrator = BlockManager.getInstance().getBlockOrchestrator();
  }

  update(dt: number, ship: Ship, transform: BlockEntityTransform, intent: WeaponIntent | null): void {
    this.frameCounter++;

    const store = this.store;

    // Filter the ship’s firing plan using subcategoryCode (no BlockType dereference)
    const plan = ship.getFiringPlan().filter(entry =>
      store.subcategoryCode[entry.blockIndex] === BlockSubcategoryEnum.HeatSeeker
    );

    if (plan.length === 0) return;

    const fireRequested = intent?.firePrimary ?? false;

    let fireRateBonus = ship.getFireRateMultiplier(); // Global passive multiplier, e.g. 0.2 (20%)
    const { fireRateMultiplier = 0 } = ship.getPowerupBonus(); // Ship passive multiplier, e.g. (15%)
    fireRateBonus += fireRateMultiplier

    const {
      seekerMissileDamage = 0,
      seekerMissileExplosionRadius = 0,
      doubleSeekerMissileShotChance = 0,
      igniteOnSeekerMissileExplosion = false,
      timeFreezeOnSeekerMissileExplosion = false,
    } = ship.getSkillEffects();

    for (const seeker of plan) {
      seeker.timeSinceLastShot += dt;
      if (!fireRequested || seeker.timeSinceLastShot < seeker.fireCooldown / (1 + fireRateBonus)) continue;
      seeker.timeSinceLastShot = 0;

      const idx = seeker.blockIndex;

      // Pull fire attributes from SOA arrays
      const projectileSpeed = store.projectileSpeed[idx] || 250;
      const lifetime = store.projectileLifetime[idx] || 4.0;
      const turningPower = (store.fireTurningPower[idx] || 0) * TURNING_POWER_COMPENSATION;
      const fireDamage = store.fireDamage[idx] || 1;
      const explosionDamage = (store.explosionDamage[idx] || 0) + seekerMissileDamage;
      const explosionRadius = (store.explosionRadiusBlocks[idx] || 0) + seekerMissileExplosionRadius;
      const targetingRange = store.targetingRange[idx] || 1000;
      const tier = store.tier[idx];

      const { x: cx, y: cy } = seeker.coord;
      const cos = Math.cos(transform.rotation);
      const sin = Math.sin(transform.rotation);
      const localX = cx * 32;
      const localY = cy * 32;
      const worldX = transform.position.x + localX * cos - localY * sin;
      const worldY = transform.position.y + localX * sin + localY * cos;

      const target = findRandomTargetInRange(ship, targetingRange);
      if (!target) continue;

      const tx = target.getTransform().position.x;
      const ty = target.getTransform().position.y;
      const dx = tx - worldX;
      const dy = ty - worldY;
      const targetAngle = Math.atan2(dy, dx);

      const fireMissile = (angle: number) => {
        const velocity = {
          x: Math.cos(angle) * projectileSpeed,
          y: Math.sin(angle) * projectileSpeed,
        };

        const color = BLOCK_TIER_COLORS[tier] ?? '#ccc';

        const particleHandle = this.particleManager.emitParticleWithHandle(
          { x: worldX, y: worldY },
          {
            colors: [color],
            baseSpeed: 0,
            sizeRange: [2, 2],
            lifeRange: [lifetime, lifetime + 0.2],
            velocity,
            light: true,
            lightRadiusScalar: 16,
            lightIntensity: 2.0,
          }
        );

        playSpatialSfx(ship, ShipRegistry.getInstance().getPlayerShip(), {
          file: 'assets/sounds/sfx/weapons/missile_00.wav',
          channel: 'sfx',
          baseVolume: 0.75,
          pitchRange: [1.0, 1.25],
          volumeJitter: 0.05,
          maxSimultaneous: 5,
        });

        this.activeMissiles.push({
          position: { x: worldX, y: worldY },
          velocity,
          fireDamage,
          explosionDamage,
          explosionRadius,
          ttl: lifetime,
          age: 0,
          targetShip: target,
          ownerShipId: ship.numericId,
          particleHandle,
          firingBlockTier: tier,
          turningPower,
          exploded: false,
          targetingRange,
          turningPowerInitial: turningPower,
          velocityMagnitudeInitial: Math.hypot(velocity.x, velocity.y),
          framesSinceTargetUpdate: 0,
          lastKnownTargetPosition: { x: tx, y: ty },
          ownerFaction: ship.getFaction(),
          igniteOnSeekerMissileExplosion,
          timeFreezeOnSeekerMissileExplosion,
        });
      };

      const isDoubleShot = Math.random() < doubleSeekerMissileShotChance;

      if (store.seekerForwardFire[idx]) {
        // Match original behavior: spawn aiming toward target immediately
        fireMissile(targetAngle);
        if (isDoubleShot) fireMissile(targetAngle);
      } else {
        if (isDoubleShot) {
          fireMissile(targetAngle + Math.PI / 2);
          fireMissile(targetAngle - Math.PI / 2);
        } else {
          const side = Math.random() < 0.5 ? -1 : 1;
          fireMissile(targetAngle + side * Math.PI / 2);
        }
      }
    }

    this.updateMissiles(dt, ship);
  }

  private updateMissiles(dt: number, ownerShip: Ship): void {
    const expired = new Set<ActiveSeekerMissile>();

    // ── 1. Per-frame emission probability ───────────────────────────────
    const emitProb = ownerShip.getHeatSeekerEmitProbability();

    // ── 2. Main missile loop ─────────────────────────────────────────────
    for (const missile of this.activeMissiles) {
      if (missile.exploded) continue;

      // ── 2·A Lifetime & guidance update ────────────────────────────────
      missile.age += dt;
      missile.framesSinceTargetUpdate++;
      const t = Math.min(missile.age / missile.ttl, 1.0);

      const speedMultiplier = 1.0 + (SPEED_GROWTH_FACTOR - 1.0) * t;
      const turningPower = missile.turningPowerInitial *
                          (1.0 + (TURNING_GROWTH_FACTOR - 1.0) * t);

      if (missile.age > missile.ttl) {
        this.particleManager.killParticle(missile.particleHandle);
        expired.add(missile);
        continue;
      }

      if (!missile.targetShip || missile.targetShip.isDestroyed()) {
        const newTarget = ownerShip
          ? findNearestTarget(ownerShip, missile.targetingRange)
          : null;

        missile.targetShip = newTarget && !newTarget.isDestroyed() ? newTarget : null;
        missile.ttl *= 0.5;

        if (!newTarget) {
          expired.add(missile);
          continue;
        }
      }

      if (missile.targetShip &&
          missile.framesSinceTargetUpdate >= TARGET_UPDATE_INTERVAL) {

        missile.framesSinceTargetUpdate = 0;
        const pos = missile.targetShip.getTransform().position;
        missile.lastKnownTargetPosition = { x: pos.x, y: pos.y };
      }

      if (missile.lastKnownTargetPosition) {
        const dx = missile.lastKnownTargetPosition.x - missile.position.x;
        const dy = missile.lastKnownTargetPosition.y - missile.position.y;

        const desiredAngle = Math.atan2(dy, dx);
        const currentAngle = Math.atan2(missile.velocity.y, missile.velocity.x);
        const deltaAngle = normalizeAngle(desiredAngle - currentAngle);

        const maxRot = turningPower * dt;
        const clamped = Math.abs(deltaAngle) <= maxRot
          ? deltaAngle
          : Math.sign(deltaAngle) * maxRot;

        const newAngle = currentAngle + clamped;
        const targetSpeed = missile.velocityMagnitudeInitial * speedMultiplier;

        missile.velocity.x = Math.cos(newAngle) * targetSpeed;
        missile.velocity.y = Math.sin(newAngle) * targetSpeed;
      }

      // ── 2·B Positional update ──────────────────────────────────────────
      missile.position.x += missile.velocity.x * dt;
      missile.position.y += missile.velocity.y * dt;
      this.particleManager.setParticlePosition(
        missile.particleHandle,
        missile.position.x,
        missile.position.y
      );

      // ── 2·C Smoke-trail emission (probabilistic budget) ────────────────
      if (Math.random() < emitProb) {
        const color =
          missile.ownerFaction === Faction.Enemy
            ? '#FF0000'
            : BLOCK_TIER_COLORS[missile.firingBlockTier] ?? '#ccc';

        createLightFlash(
          missile.position.x,
          missile.position.y,
          80,
          0.8,
          1.2,
          color
        );
      }

      // ── 2·D Impact detection & damage application ──────────────────────
      if (missile.targetShip && !missile.targetShip.isNoClip()) {
        const store = this.store; // BlockStore
        const blocks = missile.targetShip.getAllBlockIndices(); // Uint32Array

        for (let j = 0; j < blocks.length; j++) {
          const idx = blocks[j];
          const bx = store.worldX[idx];
          const by = store.worldY[idx];

          const dx = missile.position.x - bx;
          const dy = missile.position.y - by;
          if (dx * dx + dy * dy < 32 * 32) {
            // Local grid coordinate for correct damage text/effects
            const coord = { x: store.localX[idx], y: store.localY[idx] };

            this.combatService.applyDamageToBlock(
              missile.targetShip,
              ownerShip,
              idx,
              coord,
              missile.fireDamage,
              'heatSeekerDirect'
            );

            missile.exploded = true;
            this.explodeMissile(missile, ownerShip);
            expired.add(missile);
            break;
          }
        }
      }
    }

    // ── 3. Sweep expired missiles ────────────────────────────────────────
    this.activeMissiles = this.activeMissiles.filter(m => !expired.has(m));
  }

  private explodeMissile(missile: ActiveSeekerMissile, sourceShip: Ship): void {
    if (!missile.targetShip) return;

    this.particleManager.killParticle(missile.particleHandle);

    const store = this.store; // cached BlockStore

    // Use tier-based color rather than BlockType ID
    const color = BLOCK_TIER_COLORS[missile.firingBlockTier] ?? '#FFFFFF';
    emitDefaultFlames(missile.position.x, missile.position.y, 200, 1.2, true, 1, color);

    // Find the nearest block (index-based) to determine explosion center
    let centerCoord: GridCoord | null = null;
    let minDistSq = Infinity;

    const allBlocks = missile.targetShip.getAllBlockIndices(); // Uint32Array
    for (let i = 0; i < allBlocks.length; i++) {
      const idx = allBlocks[i];
      const bx = store.worldX[idx];
      const by = store.worldY[idx];

      const dx = missile.position.x - bx;
      const dy = missile.position.y - by;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDistSq) {
        minDistSq = distSq;
        centerCoord = { x: store.localX[idx], y: store.localY[idx] };
      }
    }

    if (!centerCoord) return;

    // Apply optional status effects (ignite/freeze) based on skills
    if (missile.igniteOnSeekerMissileExplosion) {
      missile.targetShip.addStatusEffect('ignite', 12.0, sourceShip, missile.explosionDamage * 0.8);
    }
    if (missile.timeFreezeOnSeekerMissileExplosion) {
      missile.targetShip.addStatusEffect('frozen', 3.0, sourceShip, 1.0);
    }

    // Compute total AoE damage (bonuses applied)
    let damageBonusPercent = sourceShip.getPassiveBonus('heat-seeker-damage');
    const { baseDamageMultiplier = 0 } = sourceShip.getPowerupBonus();
    damageBonusPercent += baseDamageMultiplier;
    const totalDamage = missile.explosionDamage * damageBonusPercent;

    // Get blocks within explosion radius (returns Uint32Array of indices)
    // const affectedBlocks = missile.targetShip.getBlocksWithinGridDistance(centerCoord, missile.explosionRadius);
    // Use new orchestrator method
    const affectedBlocks = this.orchestrator.getBlocksWithinGridDistanceForCompositeBlockObject(
      missile.targetShip,
      centerCoord,
      missile.explosionRadius
    );

    for (let i = 0; i < affectedBlocks.length; i++) {
      const idx = affectedBlocks[i];
      const coord = { x: store.localX[idx], y: store.localY[idx] };

      this.combatService.applyDamageToBlock(
        missile.targetShip,
        sourceShip,
        idx,            // SOA index
        coord,          // Local grid coord for effects
        totalDamage,
        'heatSeekerAoE'
      );
    }
  }

  render(dt: number): void {}
}
