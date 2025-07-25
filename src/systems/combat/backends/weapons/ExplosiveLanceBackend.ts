// src/systems/combat/backends/ExplosiveLanceBackend.ts

import type { WeaponBackend } from '@/systems/combat/WeaponSystem';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { CombatService } from '@/systems/combat/CombatService';
import type { ParticleManager } from '@/systems/fx/ParticleManager';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { Grid } from '@/systems/physics/Grid';
import type { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import type { ExtraDamageOptions } from '@/systems/combat/CombatService';

import type { BlockStore } from '@/game/blocks/system/BlockStore';
import { BlockManager } from '@/game/blocks/system/BlockManager';
import { getBlockTypeByIndex } from '@/game/blocks/BlockRegistry';

import { Ship } from '@/game/ship/Ship';
import { ShipRegistry } from '@/game/ship/ShipRegistry';

import { PROJECTILE_TYPE_TO_INDEX } from '@/systems/physics/interfaces/ProjectileTypes';
import { FACTION_TO_INDEX } from '@/game/interfaces/types/Faction';

import { shakeCamera } from '@/core/interfaces/events/CameraReporter';
import { EXPLOSIVE_LANCE_COLOR_PALETTES } from '@/game/blocks/BlockColorSchemes';
import { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import { findObjectByBlock, findBlockCoordinatesInObject } from '@/game/entities/utils/universalBlockInterfaceUtils';
import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';
import { createPointLight } from '@/lighting/lights/createPointLight';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { emitDefaultFlames } from '@/core/interfaces/events/SpecialFxReporter';


export interface ActiveExplosiveLance {
  /** Current world-space position of the lance projectile */
  position: { x: number; y: number };
  /** Current world-space velocity */
  velocity: { x: number; y: number };
  /** Direct impact damage dealt on hit */
  fireDamage: number;
  /** Explosion AoE damage */
  explosionDamage: number;
  /** Explosion AoE radius in grid cells (not pixels) */
  explosionRadius: number;
  /** Delay before detonation once stuck (seconds) */
  detonationDelay: number;
  /** Time elapsed since sticking to target */
  elapsed: number;
  /** Whether the lance has embedded into a target */
  stuck: boolean;
  /** Index into BlockStore for the block it’s stuck to. */
  targetBlockIndex: number | null;
  /** Composite object (Ship, Station, etc.) owning the target block */
  targetShip: CompositeBlockObject | null;
  /** Local grid coordinate of the target block (on targetShip) */
  coord: GridCoord | null;
  /** Numeric ID of the ship that fired this lance */
  ownerShipId: number;
  /** Particle handle used for rendering trail/stuck visuals */
  particleHandle: number;
  /** Original particle size (used when scaling while stuck) */
  particleOriginalSize: number;
  /** Anchor offset relative to targetShip origin (for stuck positioning) */
  anchorOffset?: { x: number; y: number };
  /** Time-to-live (seconds) before despawning naturally */
  ttl: number;
  /** Accumulated lifetime so far (seconds) */
  age: number;
  /** Particle emission accumulator for moving trail */
  emissionAccumulatorTrail: number;
  /** Particle emission accumulator for when stuck */
  emissionAccumulatorStuck: number;
  /** Block type ID of the firing block (for color palette lookups) */
  firingBlockId: string;
  /** Associated light ID (if any) for point light visuals */
  lightId: number | null;
  /** Internal timer for radiate effects (if applicable) */
  radiateTimer?: number;
}

export class ExplosiveLanceBackend implements WeaponBackend {
  private activeLances: ActiveExplosiveLance[] = [];
  private lightingOrchestrator: LightingOrchestrator;
  private store: BlockStore;

  constructor(
    private readonly combatService: CombatService,
    private readonly particleManager: ParticleManager,
    private readonly projectileSystem: ProjectileSystem
  ) {
    this.store = BlockManager.getInstance().getBlockStore();
    this.lightingOrchestrator = LightingOrchestrator.getInstance();
  }

  update(dt: number, ship: Ship, transform: BlockEntityTransform, intent: WeaponIntent | null): void {
    const plan = ship.getFiringPlan().filter(entry => {
      const typeIdx = this.store.typeIndex[entry.blockIndex];
      const type = getBlockTypeByIndex(typeIdx);
      return type?.behavior?.fire?.fireType === 'explosiveLance';
    });
    if (plan.length === 0) return;

    const target = intent?.aimAt;
    const fireRequested = intent?.firePrimary ?? false;

    let fireRateBonus = ship.getPassiveBonus('explosive-lance-firing-rate');
    const { explosiveLanceFiringRate = 0, explosiveLanceDamage = 0, explosiveLanceRange = 0 } = ship.getSkillEffects();
    const { fireRateMultiplier = 0 } = ship.getPowerupBonus();
    fireRateBonus += (fireRateMultiplier + explosiveLanceFiringRate);

    const radiusBonus = ship.getPassiveBonus('explosive-lance-radius');
    const { baseDamageMultiplier = 1 } = ship.getPowerupBonus();
    const totalDamageBonus = baseDamageMultiplier;

    for (let i = plan.length - 1; i >= 0; i--) {
      const lance = plan[i];
      lance.timeSinceLastShot += dt;

      if (!fireRequested || lance.timeSinceLastShot < lance.fireCooldown / fireRateBonus) continue;
      lance.timeSinceLastShot = 0;

      const typeIdx = this.store.typeIndex[lance.blockIndex];
      const type = getBlockTypeByIndex(typeIdx)!;
      const fire = type.behavior!.fire!;

      const lifetime = fire.lifetime! + (explosiveLanceRange * 0.001);
      const { x: cx, y: cy } = lance.coord;

      const cos = Math.cos(transform.rotation);
      const sin = Math.sin(transform.rotation);
      const localX = cx * 32;
      const localY = cy * 32;
      const worldX = transform.position.x + localX * cos - localY * sin;
      const worldY = transform.position.y + localX * sin + localY * cos;

      const dx = target!.x - worldX;
      const dy = target!.y - worldY;
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag === 0) continue;

      let angle = Math.atan2(dy, dx);
      const spread = (1 - (fire.accuracy ?? 1)) * Math.PI / 8;
      angle += (Math.random() * 2 - 1) * spread;

      const vx = Math.cos(angle) * (fire.projectileSpeed ?? 300);
      const vy = Math.sin(angle) * (fire.projectileSpeed ?? 300);

      const colors = EXPLOSIVE_LANCE_COLOR_PALETTES[type.id] ?? ['#ccc', '#aaa', '#888'];
      const particleHandle = this.particleManager.emitParticleWithHandle({ x: worldX, y: worldY }, {
        colors,
        baseSpeed: 0,
        sizeRange: [4, 4],
        lifeRange: [fire.lifetime ?? 1.5, (fire.lifetime ?? 1.5) + 0.1],
        velocity: { x: vx, y: vy },
      });

      const lightId = createPointLight({
        x: worldX,
        y: worldY,
        radius: 600,
        color: colors[0],
        intensity: 0.9,
        life: lifetime + 0.4,
        expires: true,
      }, `explosive-lance-${ship.id}`);

      const playerShip = ShipRegistry.getInstance().getPlayerShip();
      playSpatialSfx(ship, playerShip, {
        file: 'assets/sounds/sfx/weapons/lance_00.wav',
        channel: 'sfx',
        baseVolume: 0.7,
        pitchRange: [1.0, 1.3],
        volumeJitter: 0.1,
        maxSimultaneous: 3,
      });

      this.activeLances.push({
        position: { x: worldX, y: worldY },
        velocity: { x: vx, y: vy },
        fireDamage: fire.fireDamage ?? 10,
        explosionDamage: (fire.explosionDamage! * totalDamageBonus) + explosiveLanceDamage,
        explosionRadius: (fire.explosionRadiusBlocks ?? 2) * radiusBonus,
        detonationDelay: fire.detonationDelayMs! / 1000,
        elapsed: 0,
        stuck: false,
        targetBlockIndex: null, // will replace with index later
        targetShip: null,
        coord: null,
        ownerShipId: ship.numericId,
        particleHandle,
        particleOriginalSize: 4,
        ttl: lifetime,
        age: 0,
        emissionAccumulatorTrail: 0,
        emissionAccumulatorStuck: 0,
        firingBlockId: type.id,
        lightId,
      });
    }

    this.updateLances(dt, ship);
  }

  private updateLances(dt: number, ship: Ship): void {
    const exploded = new Set<ActiveExplosiveLance>();
    const { 
      explosiveLanceRadiate = false, 
      explosiveLanceElectrocution = false,
      explosiveLanceLifesteal = false,
    } = ship.getSkillEffects();

    const grid = BlockManager.getInstance().getBlockSpatialGrid();
    const store = this.store; // already cached in constructor

    for (const lance of this.activeLances) {
      lance.age += dt;

      // Emit trail particles while in flight
      const trailColors = EXPLOSIVE_LANCE_COLOR_PALETTES[lance.firingBlockId] ?? ['#ccc', '#aaa', '#888'];
      lance.emissionAccumulatorTrail += dt * 20;
      const trailCount = Math.floor(lance.emissionAccumulatorTrail);
      lance.emissionAccumulatorTrail -= trailCount;
      for (let i = 0; i < trailCount; i++) {
        this.particleManager.emitParticle(lance.position, {
          colors: trailColors,
          baseSpeed: 20,
          sizeRange: [1, 2],
          lifeRange: [0.3, 0.5],
          fadeOut: true,
        });
      }

      // Remove if expired (only if free-flying)
      if (lance.age > lance.ttl && !lance.stuck) {
        this.particleManager.killParticle(lance.particleHandle);
        exploded.add(lance);
        continue;
      }

      // Handle stuck lances (attached to a ship block)
      if (lance.stuck) {
        if (lance.targetShip && lance.anchorOffset) {
          const shipPos = lance.targetShip.getTransform().position;
          lance.position.x = shipPos.x + lance.anchorOffset.x;
          lance.position.y = shipPos.y + lance.anchorOffset.y;
          this.particleManager.setParticlePosition(
            lance.particleHandle,
            lance.position.x,
            lance.position.y
          );
        }

        if (explosiveLanceRadiate && lance.radiateTimer != null) {
          lance.radiateTimer += dt;
          if (lance.radiateTimer >= 0.5) {
            this.emitProjectileBurst(ship, lance, 8, 1000);
            lance.radiateTimer = 0;
          }
        }

        lance.emissionAccumulatorStuck += dt * 20;
        const stuckCount = Math.floor(lance.emissionAccumulatorStuck);
        lance.emissionAccumulatorStuck -= stuckCount;
        const stuckColors = EXPLOSIVE_LANCE_COLOR_PALETTES[lance.firingBlockId] ?? ['#ccc', '#aaa', '#888'];
        for (let i = 0; i < stuckCount; i++) {
          this.particleManager.emitParticle(lance.position, {
            colors: stuckColors,
            baseSpeed: 300,
            sizeRange: [1, 3],
            lifeRange: [0.4, 0.9],
            fadeOut: true,
          });
        }

        lance.elapsed += dt;
        if (lance.elapsed >= lance.detonationDelay || lance.targetShip?.isDestroyed()) {
          this.explodeLance(lance, ship, explosiveLanceLifesteal);
          exploded.add(lance);
        }
        continue;
      }

      // Free-flying: update position
      lance.position.x += lance.velocity.x * dt;
      lance.position.y += lance.velocity.y * dt;

      if (lance.lightId) {
        this.lightingOrchestrator.updateLight(lance.lightId, {
          x: lance.position.x,
          y: lance.position.y,
        });
      }

      // Broad-phase query using BlockSpatialGrid
      const queryRadius = 32; // approximate collision range
      const hits = grid.getBlocksInArea(
        lance.position.x - queryRadius,
        lance.position.y - queryRadius,
        lance.position.x + queryRadius,
        lance.position.y + queryRadius
      );

      for (let i = 0; i < hits.length; i++) {
        const idx = hits[i];
        if (store.ownerShipId[idx] === lance.ownerShipId) continue;

        const bx = store.worldX[idx];
        const by = store.worldY[idx];
        const dx = lance.position.x - bx;
        const dy = lance.position.y - by;
        if (dx * dx + dy * dy >= queryRadius * queryRadius) continue; // skip if outside radius

        // Get owning object and block coord for damage context
        const compositeBlockObject = findObjectByBlock(idx);
        const coord = compositeBlockObject
          ? findBlockCoordinatesInObject(idx, compositeBlockObject)
          : null;

        if (!compositeBlockObject || !coord || compositeBlockObject.isNoClip()) {
          continue;
        }

        // Attach lance to target
        lance.stuck = true;
        lance.radiateTimer = 0;
        lance.targetBlockIndex = idx;
        lance.targetShip = compositeBlockObject;
        lance.coord = coord;

        // Apply electrocution effect if skill is active
        if (explosiveLanceElectrocution && compositeBlockObject instanceof Ship) {
          compositeBlockObject.addStatusEffect('electrocuted', 8, ship, 1);
        }

        const shipPos = compositeBlockObject.getTransform().position;
        lance.anchorOffset = {
          x: lance.position.x - shipPos.x,
          y: lance.position.y - shipPos.y,
        };

        lance.velocity = { x: 0, y: 0 };
        this.particleManager.setParticleVelocity(lance.particleHandle, 0, 0);
        this.particleManager.extendParticleLife(lance.particleHandle, lance.detonationDelay + 0.2);
        this.particleManager.setParticleSize(lance.particleHandle, lance.particleOriginalSize * 1.25);

        const playerShip = ShipRegistry.getInstance().getPlayerShip();
        if (playerShip) {
          playSpatialSfx(playerShip, ship, {
            file: 'assets/sounds/sfx/weapons/lance_01.wav',
            channel: 'sfx',
            baseVolume: 0.85,
            pitchRange: [1.0, 1.3],
            volumeJitter: 0.1,
            maxSimultaneous: 5,
          });
        }
        shakeCamera(6, 0.16, 10, 'explosiveLance');

        // Deal direct impact damage
        const destroyed = this.combatService.applyDamageToBlock(
          compositeBlockObject,
          ship,
          idx,
          coord,
          lance.fireDamage,
          'explosiveLance'
        );

        if (destroyed) {
          this.explodeLance(lance, ship);
          exploded.add(lance);
          break;
        }
      }
    }

    // Clean up detonated/expired lances
    this.activeLances = this.activeLances.filter(l => !exploded.has(l));
  }

  private explodeLance(lance: ActiveExplosiveLance, ship: Ship, lifeSteal?: boolean): void {
    // Remove visuals
    if (lance.lightId) {
      this.lightingOrchestrator.removeLight(lance.lightId);
    }
    this.particleManager.killParticle(lance.particleHandle);

    const colorPalette =
      EXPLOSIVE_LANCE_COLOR_PALETTES[lance.firingBlockId] ??
      ['#cccccc', '#aaaaaa', '#888888'];

    // Emit secondary projectile burst
    this.emitProjectileBurst(ship, lance, 16);

    // Flash at impact (fallback if targetShip is gone)
    const flashX = lance.targetShip?.getTransform().position.x ?? lance.position.x;
    const flashY = lance.targetShip?.getTransform().position.y ?? lance.position.y;
    emitDefaultFlames(flashX, flashY, lance.explosionRadius * 24, 0.8, true, 1, colorPalette[0]);

    // Apply AoE damage if targetShip is alive
    if (lance.targetShip && lance.coord && !lance.targetShip.isDestroyed()) {
      // Now returns a Uint32Array of block indices
      const blockIndices = lance.targetShip.getBlocksWithinGridDistance(
        lance.coord,
        lance.explosionRadius
      );

      const store = this.store; // BlockStore reference (already available on class)
      const options: ExtraDamageOptions = {
        repairOrbDropRateMulti: lifeSteal ? 0.3 : 0,
        hideExplosionParticlesOnHit: false,
      };

      for (let i = 0; i < blockIndices.length; i++) {
        const blockIndex = blockIndices[i];

        // Look up local coord for correct explosion text/effects
        const coord = { x: store.localX[blockIndex], y: store.localY[blockIndex] };

        this.combatService.applyDamageToBlock(
          lance.targetShip,
          ship,
          blockIndex,          // Pass block index, not BlockInstance
          coord,               // Local grid coord
          lance.explosionDamage,
          'explosiveLanceAoE',
          true,                // lightFlash
          0,                   // baseCritChance
          1.5,                 // baseCritMultiplier
          options
        );

        // Hide particles after the first hit
        options.hideExplosionParticlesOnHit = true;
      }
    }
  }

  private emitProjectileBurst(ship: Ship, lance: ActiveExplosiveLance, quantity: number = 16, speed: number = 1600): void {
    const colorPalette =
      EXPLOSIVE_LANCE_COLOR_PALETTES[lance.firingBlockId] ??
      ['#cccccc', '#aaaaaa', '#888888'];

    const origin = { x: lance.position.x, y: lance.position.y };
    const damage = lance.explosionDamage;
    const life = 1.2;

    // Emit radial projectiles
    const initialAngle = Math.random() * Math.PI * 2;
    for (let i = 0; i < quantity; i++) {
      const angle = initialAngle + (i / quantity) * Math.PI * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const projectile = this.projectileSystem.spawnProjectileWithVelocity(
        origin,
        { x: vx, y: vy },
        PROJECTILE_TYPE_TO_INDEX['explosiveLance'],
        damage * 2,
        life,
        1,
        ship.numericId,
        FACTION_TO_INDEX[ship.getFaction()],
        colorPalette,
        'delayed',
        false,
        true
      );

      if (lance.targetShip) {
        projectile.hitShipIds.add(lance.targetShip.id);
      }
    }
  }

  render(dt: number): void {}
}
