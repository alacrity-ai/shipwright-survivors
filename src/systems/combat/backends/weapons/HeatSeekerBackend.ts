// src/systems/combat/backends/HeatSeekerBackend.ts

import type { WeaponBackend } from '@/systems/combat/WeaponSystem';
import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { CombatService } from '@/systems/combat/CombatService';
import type { ParticleManager } from '@/systems/fx/ParticleManager';
import type { Grid } from '@/systems/physics/Grid';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';

import { Faction } from '@/game/interfaces/types/Faction';
import { getTierFromBlockId } from '@/systems/pickups/helpers/getTierFromBlockId';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { findNearestTarget, findRandomTargetInRange } from '@/systems/ai/helpers/ShipUtils';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';
import { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
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
  ownerShipId: string;
  particleHandle: number;
  firingBlockId: string;
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

  constructor(
    private readonly combatService: CombatService,
    private readonly particleManager: ParticleManager,
    private readonly grid: Grid,
    private readonly explosionSystem: ExplosionSystem
  ) {}

  update(dt: number, ship: Ship, transform: BlockEntityTransform, intent: WeaponIntent | null): void {
    this.frameCounter++;

    const plan = ship.getFiringPlan().filter(p => p.block.type.behavior?.fire?.fireType === 'heatSeeker');
    if (plan.length === 0) return;

    const fireRequested = intent?.firePrimary ?? false;
    let fireRateBonus = ship.getPassiveBonus('heat-seeker-firing-rate');
    const { fireRateMultiplier = 0 } = ship.getPowerupBonus();
    fireRateBonus += fireRateMultiplier;

    const {
      seekerMissileDamage = 0,
      seekerMissileExplosionRadius = 0,
      doubleSeekerMissileShotChance = 0,
      igniteOnSeekerMissileExplosion = false,
      timeFreezeOnSeekerMissileExplosion = false,
    } = ship.getSkillEffects();

    for (const seeker of plan) {
      const fire = seeker.block.type.behavior!.fire!;
      seeker.timeSinceLastShot += dt;
      if (!fireRequested || seeker.timeSinceLastShot < seeker.fireCooldown / fireRateBonus) continue;
      seeker.timeSinceLastShot = 0;

      const coord = seeker.coord;
      const cos = Math.cos(transform.rotation);
      const sin = Math.sin(transform.rotation);
      const localX = coord.x * 32;
      const localY = coord.y * 32;
      const worldX = transform.position.x + localX * cos - localY * sin;
      const worldY = transform.position.y + localX * sin + localY * cos;

      const target = findRandomTargetInRange(ship, fire.targetingRange ?? 1000);
      if (!target) continue;

      const tx = target.getTransform().position.x;
      const ty = target.getTransform().position.y;
      const dx = tx - worldX;
      const dy = ty - worldY;
      const targetAngle = Math.atan2(dy, dx);

      const fireMissile = (angle: number) => {
        const speed = fire.projectileSpeed ?? 250;
        const velocity = {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        };

        const ttl = fire.lifetime ?? 4.0;
        const turningPower = (fire.turningPower ?? 0) * TURNING_POWER_COMPENSATION;
        const color = BLOCK_TIER_COLORS[seeker.block.type.tier] ?? '#ccc';

        const particleHandle = this.particleManager.emitParticleWithHandle({ x: worldX, y: worldY }, {
          colors: [color],
          baseSpeed: 0,
          sizeRange: [2, 2],
          lifeRange: [ttl, ttl + 0.2],
          velocity,
          light: true,
          lightRadiusScalar: 16,
          lightIntensity: 2.0,
        });

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
          fireDamage: fire.fireDamage ?? 1,
          explosionDamage: (fire.explosionDamage ?? 0) + seekerMissileDamage,
          explosionRadius: (fire.explosionRadiusBlocks ?? 0) + seekerMissileExplosionRadius,
          ttl,
          age: 0,
          targetShip: target,
          ownerShipId: ship.id,
          particleHandle,
          firingBlockId: seeker.block.type.id,
          turningPower,
          exploded: false,
          targetingRange: fire.targetingRange ?? 1000,
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
      if (fire.seekerForwardFire) {
        // Straight forward (possibly double forward)
        fireMissile(targetAngle);
        if (isDoubleShot) fireMissile(targetAngle);
      } else {
        // Perpendicular (left/right) or double symmetrical
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

    // ── 1.  Per-frame emission-probability calculation ──────────────────────
    // Expected particles per frame never exceed SMOKE_PARTICLE_BUDGET_PER_FRAME.
    const emitProb = ownerShip.getHeatSeekerEmitProbability();

    // ── 2.  Main missile loop ────────────────────────────────────────────────
    for (const missile of this.activeMissiles) {
      if (missile.exploded) continue;

      // ── 2·A  Lifetime & guidance update ───────────────────────────────
      missile.age += dt;
      missile.framesSinceTargetUpdate++;
      const t = Math.min(missile.age / missile.ttl, 1.0);

      const speedMultiplier = 1.0 + (SPEED_GROWTH_FACTOR   - 1.0) * t;
      const turningPower    = missile.turningPowerInitial  *
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
        const deltaAngle   = normalizeAngle(desiredAngle - currentAngle);

        const maxRot       = turningPower * dt;
        const clamped      = Math.abs(deltaAngle) <= maxRot
                            ? deltaAngle
                            : Math.sign(deltaAngle) * maxRot;

        const newAngle     = currentAngle + clamped;
        const targetSpeed  = missile.velocityMagnitudeInitial * speedMultiplier;

        missile.velocity.x = Math.cos(newAngle) * targetSpeed;
        missile.velocity.y = Math.sin(newAngle) * targetSpeed;
      }

      // ── 2·B  Positional update ─────────────────────────────────────────────
      missile.position.x += missile.velocity.x * dt;
      missile.position.y += missile.velocity.y * dt;
      this.particleManager.setParticlePosition(
        missile.particleHandle,
        missile.position.x,
        missile.position.y
      );

      // ── 2·C  Smoke-trail emission (probabilistic budget) ───────────────────
      if (Math.random() < emitProb) {
        const color =
          missile.ownerFaction === Faction.Enemy
            ? '#FF0000'
            : BLOCK_TIER_COLORS[getTierFromBlockId(missile.firingBlockId)] ?? '#ccc';

        createLightFlash(
          missile.position.x,
          missile.position.y,
          80,
          0.8,
          1.2,
          color
        );
      }

      // ── 2·D  Impact detection & damage application ───────────────────────────────────
      if (missile.targetShip) {
        if (missile.targetShip.isNoClip()) continue;

        for (const [coord, block] of missile.targetShip.getAllBlocks()) {
          if (!block.position) continue;

          const dx = missile.position.x - block.position.x;
          const dy = missile.position.y - block.position.y;
          if (dx * dx + dy * dy < 32 * 32) {
            this.combatService.applyDamageToBlock(
              missile.targetShip, ownerShip, block, coord,
              missile.fireDamage, 'heatSeekerDirect'
            );

            missile.exploded = true;
            this.explodeMissile(missile, ownerShip);
            expired.add(missile);
            break;
          }
        }
      }
    }

    // ── 3.  Sweep expired missiles ───────────────────────────────────────────
    this.activeMissiles = this.activeMissiles.filter(m => !expired.has(m));
  }

  private explodeMissile(missile: ActiveSeekerMissile, sourceShip: Ship): void {
    if (!missile.targetShip) return;

    this.particleManager.killParticle(missile.particleHandle);

    const color = BLOCK_TIER_COLORS[getTierFromBlockId(missile.firingBlockId)] ?? '#FFFFFF';
    emitDefaultFlames(missile.position.x, missile.position.y, 200, 1.2, true, 1, color);

    let centerCoord: GridCoord | null = null;
    let minDistSq = Infinity;

    for (const [coord, block] of missile.targetShip.getAllBlocks()) {
      if (!block.position) continue;

      const dx = missile.position.x - block.position.x;
      const dy = missile.position.y - block.position.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDistSq) {
        centerCoord = coord;
        minDistSq = distSq;
      }
    }

    if (!centerCoord) return;

    // Apply status effects if applicable
    if (missile.igniteOnSeekerMissileExplosion) {
      // missile.targetShip.addStatusEffect('ignite', 12.0, sourceShip, missile.explosionDamage * 0.75);
      missile.targetShip.addStatusEffect('ignite', 12.0, sourceShip, 1);
    }
    if (missile.timeFreezeOnSeekerMissileExplosion) {
      missile.targetShip.addStatusEffect('frozen', 3.0, sourceShip, 1.0);
    }

    let damageBonus = sourceShip.getPassiveBonus('heat-seeker-damage');
    const { baseDamageMultiplier = 0 } = sourceShip.getPowerupBonus();
    damageBonus += baseDamageMultiplier;

    const blocks = missile.targetShip.getBlocksWithinGridDistance(centerCoord, missile.explosionRadius);
    for (const [coord, block] of blocks) {
      this.combatService.applyDamageToBlock(
        missile.targetShip,
        sourceShip,
        block,
        coord,
        missile.explosionDamage * damageBonus,
        'heatSeekerAoE'
      );
    }
  }

  render(dt: number): void {}
}
