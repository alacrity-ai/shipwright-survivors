// src/systems/combat/backends/HeatSeekerBackend.ts

import type { WeaponBackend } from '@/systems/combat/WeaponSystem';
import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { CombatService } from '@/systems/combat/CombatService';
import type { ParticleManager } from '@/systems/fx/ParticleManager';
import type { Particle } from '@/systems/fx/interfaces/Particle';
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
  particle: Particle;
  firingBlockId: string;
  turningPower: number;
  exploded: boolean;
  targetingRange: number;
  turningPowerInitial: number;
  velocityMagnitudeInitial: number;
  framesSinceTargetUpdate: number;
  lastKnownTargetPosition: { x: number; y: number } | null;
  ownerFaction: Faction;
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
    // Powerup bonuses
    const { fireRateMultiplier = 0 } = ship.getPowerupBonus();

    // Aggregate Bonus (Additive)
    fireRateBonus += fireRateMultiplier;

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


      let launchAngle: number;
      if (fire.seekerForwardFire) {
        // Fire straight forward
        launchAngle = targetAngle;
      } else {
        // Choose left or right perpendicular launch (90° offset)
        const side = Math.random() < 0.5 ? -1 : 1;
        launchAngle = targetAngle + side * Math.PI / 2;
      }
      const speed = fire.projectileSpeed ?? 250;
      const velocity = {
        x: Math.cos(launchAngle) * speed,
        y: Math.sin(launchAngle) * speed,
      };

      const ttl = fire.lifetime ?? 4.0;
      const baseTurningPower = fire.turningPower ?? 0;
      const compensatedTurningPower = baseTurningPower * TURNING_POWER_COMPENSATION;
      const color = BLOCK_TIER_COLORS[seeker.block.type.tier] ?? '#ccc';

      const particle = this.particleManager.emitParticle({ x: worldX, y: worldY }, {
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
        fireDamage: fire.fireDamage ?? 12,
        explosionDamage: fire.explosionDamage ?? 24,
        explosionRadius: fire.explosionRadiusBlocks ?? 2,
        ttl,
        age: 0,
        targetShip: target,
        ownerShipId: ship.id,
        particle,
        firingBlockId: seeker.block.type.id,
        turningPower: compensatedTurningPower,
        exploded: false,
        targetingRange: fire.targetingRange ?? 1000,
        turningPowerInitial: compensatedTurningPower,
        velocityMagnitudeInitial: Math.hypot(velocity.x, velocity.y),
        framesSinceTargetUpdate: 0,
        lastKnownTargetPosition: { x: tx, y: ty },
        ownerFaction: ship.getFaction(),
      });
    }

    this.updateMissiles(dt, ship);
  }

  private updateMissiles(dt: number, ownerShip: Ship): void {
    const expired = new Set<ActiveSeekerMissile>();

    for (const missile of this.activeMissiles) {
      if (missile.exploded) continue;

      missile.age += dt;
      missile.framesSinceTargetUpdate++;
      const t = Math.min(missile.age / missile.ttl, 1.0); // normalized [0,1]

      // Compute dynamic speed and turning power multipliers
      const speedMultiplier = 1.0 + (SPEED_GROWTH_FACTOR - 1.0) * t;
      const turningPower = missile.turningPowerInitial * (1.0 + (TURNING_GROWTH_FACTOR - 1.0) * t);

      // Retire expired missiles
      if (missile.age > missile.ttl) {
        this.particleManager.removeParticle(missile.particle);
        expired.add(missile);
        continue;
      }

      // === Retarget only if current target is unavailable ===
      if (!missile.targetShip || missile.targetShip.isDestroyed()) {
        // Only retarget when we need to (expensive operation)
        const newTarget = ownerShip
          ? findNearestTarget(ownerShip, missile.targetingRange)
          : null;

        missile.targetShip = newTarget && !newTarget.isDestroyed() ? newTarget : null;

        // Reduce lifespan of missle, to avoid infinite pursuit
        missile.ttl *= 0.5;

        // If no target, mark missle for destroyed
        if (!newTarget) {
          expired.add(missile);
          continue;
        }
      }

      // === Update target position (every N frames for performance) ===
      if (missile.targetShip && missile.framesSinceTargetUpdate >= TARGET_UPDATE_INTERVAL) {
        missile.framesSinceTargetUpdate = 0;
        
        // Update cached target position
        const targetPos = missile.targetShip.getTransform().position;
        missile.lastKnownTargetPosition = { x: targetPos.x, y: targetPos.y };
      }

      // === Steering Logic with cached target position ===
      if (missile.lastKnownTargetPosition) {
        const dx = missile.lastKnownTargetPosition.x - missile.position.x;
        const dy = missile.lastKnownTargetPosition.y - missile.position.y;

        const desiredAngle = Math.atan2(dy, dx);
        const currentAngle = Math.atan2(missile.velocity.y, missile.velocity.x);
        const deltaAngle = normalizeAngle(desiredAngle - currentAngle);

        const maxRotation = turningPower * dt;
        const clampedAngle = Math.abs(deltaAngle) <= maxRotation
          ? deltaAngle
          : Math.sign(deltaAngle) * maxRotation;

        const newAngle = currentAngle + clampedAngle;

        const targetSpeed = missile.velocityMagnitudeInitial * speedMultiplier;
        missile.velocity.x = Math.cos(newAngle) * targetSpeed;
        missile.velocity.y = Math.sin(newAngle) * targetSpeed;
      }

      // Update position
      missile.position.x += missile.velocity.x * dt;
      missile.position.y += missile.velocity.y * dt;
      missile.particle.x = missile.position.x;
      missile.particle.y = missile.position.y;

      // Smoke trail (occasional)
      let trailColor: string;
      if (missile.ownerFaction === Faction.Enemy) {
        trailColor = '#FF0000';
      } else {
        trailColor = BLOCK_TIER_COLORS[getTierFromBlockId(missile.firingBlockId)] ?? '#ccc';
      }
      if (Math.random() < 0.3) {
        createLightFlash(
          missile.position.x,
          missile.position.y,
          80,
          0.4,
          1.2,
          trailColor
        );
      }

      // === Impact Detection ===
      if (missile.targetShip) {
        for (const [coord, block] of missile.targetShip.getAllBlocks()) {
          if (!block.position) continue;

          const dx = missile.position.x - block.position.x;
          const dy = missile.position.y - block.position.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < 32 * 32) {
            this.combatService.applyDamageToBlock(
              missile.targetShip,
              ownerShip,
              block,
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

    this.activeMissiles = this.activeMissiles.filter(m => !expired.has(m));
  }

  private explodeMissile(missile: ActiveSeekerMissile, sourceShip: Ship): void {
    if (!missile.targetShip) return;

    this.particleManager.removeParticle(missile.particle);

    const color = BLOCK_TIER_COLORS[getTierFromBlockId(missile.firingBlockId)] ?? '#ccc';
    createLightFlash(
      missile.targetShip.getTransform().position.x,
      missile.targetShip.getTransform().position.y,
      420,
      0.8,
      0.3,
      color
    );

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

    let damageBonus = sourceShip.getPassiveBonus('heat-seeker-damage');
    const { baseDamageMultiplier = 0 } = sourceShip.getPowerupBonus();
    damageBonus += baseDamageMultiplier;

    const blocks = missile.targetShip.getBlocksWithinGridDistance(centerCoord, missile.explosionRadius);
    for (const block of blocks) {
      const coord = missile.targetShip.getBlockCoord(block);
      if (!coord) continue;

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
