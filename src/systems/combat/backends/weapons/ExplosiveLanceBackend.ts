// src/systems/combat/backends/ExplosiveLanceBackend.ts

import type { WeaponBackend } from '@/systems/combat/WeaponSystem';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { CombatService } from '@/systems/combat/CombatService';
import type { ParticleManager } from '@/systems/fx/ParticleManager';
import type { Particle } from '@/systems/fx/interfaces/Particle';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { Grid } from '@/systems/physics/Grid';
import type { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import type { ExtraDamageOptions } from '@/systems/combat/CombatService';

import { Ship } from '@/game/ship/Ship';
import { ShipRegistry } from '@/game/ship/ShipRegistry';

import { shakeCamera } from '@/core/interfaces/events/CameraReporter';
import { EXPLOSIVE_LANCE_COLOR_PALETTES } from '@/game/blocks/BlockColorSchemes';
import { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import { findObjectByBlock, findBlockCoordinatesInObject } from '@/game/entities/utils/universalBlockInterfaceUtils';
import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';
import { createPointLight } from '@/lighting/lights/createPointLight';
import { PointLightInstance } from '@/lighting/lights/types';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { GlobalEventBus } from '@/core/EventBus';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';

interface ActiveExplosiveLance {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  fireDamage: number;
  explosionDamage: number;
  explosionRadius: number;
  detonationDelay: number;
  elapsed: number;
  stuck: boolean;
  targetBlock: BlockInstance | null;
  targetShip: CompositeBlockObject | null;
  coord: GridCoord | null;
  ownerShipId: string;
  particleIndex: number;
  particleOriginalSize: number;
  anchorOffset?: { x: number; y: number };
  ttl: number;
  age: number;
  emissionAccumulatorTrail: number;
  emissionAccumulatorStuck: number;
  firingBlockId: string;
  light: PointLightInstance;
  radiateTimer?: number;
}

export class ExplosiveLanceBackend implements WeaponBackend {
  private activeLances: ActiveExplosiveLance[] = [];

  constructor(
    private readonly combatService: CombatService,
    private readonly particleManager: ParticleManager,
    private readonly grid: Grid,
    private readonly explosionSystem: ExplosionSystem,
    private readonly projectileSystem: ProjectileSystem
  ) {}

  update(dt: number, ship: Ship, transform: BlockEntityTransform, intent: WeaponIntent | null): void {
    const plan = ship.getFiringPlan().filter(p => p.block.type.behavior?.fire?.fireType === 'explosiveLance');
    if (plan.length === 0) return;

    const target = intent?.aimAt;
    const fireRequested = intent?.firePrimary ?? false;

    let fireRateBonus = ship.getPassiveBonus('explosive-lance-firing-rate');
    const { explosiveLanceFiringRate = 0, explosiveLanceDamage = 0, explosiveLanceRange = 0 } = ship.getSkillEffects()
    const { fireRateMultiplier = 0 } = ship.getPowerupBonus();
    fireRateBonus += (fireRateMultiplier + explosiveLanceFiringRate);

    let radiusBonus = ship.getPassiveBonus('explosive-lance-radius');

    const { baseDamageMultiplier = 1 } = ship.getPowerupBonus();
    const totalDamageBonus = baseDamageMultiplier;


    for (let i = plan.length - 1; i >= 0; i--) {
      const lance = plan[i];
      if (!ship.getBlockCoord(lance.block)) continue;

      lance.timeSinceLastShot += dt;
      if (!fireRequested || lance.timeSinceLastShot < lance.fireCooldown / fireRateBonus) continue;

      lance.timeSinceLastShot = 0;

      const fire = lance.block.type.behavior!.fire!;
      const lifetime = fire.lifetime! + (explosiveLanceRange * 0.001);
      const coord = lance.coord;
      const cos = Math.cos(transform.rotation);
      const sin = Math.sin(transform.rotation);
      const localX = coord.x * 32;
      const localY = coord.y * 32;
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

      const colors = EXPLOSIVE_LANCE_COLOR_PALETTES[lance.block.type.id] ?? ['#ccc', '#aaa', '#888'];
      const particleIndex = this.particleManager.emitParticle({ x: worldX, y: worldY }, {
        colors,
        baseSpeed: 0,
        sizeRange: [4, 4],
        lifeRange: [fire.lifetime ?? 1.5, (fire.lifetime ?? 1.5) + 0.1],
        velocity: { x: vx, y: vy },
      });

      // Create pointlight
      const light = createPointLight({
        x: worldX,
        y: worldY,
        radius: 600,
        color: colors[0],
        intensity: 0.9,
        life: lifetime + 0.4,
        expires: true,
      }, `explosive-lance-${ship.id}`);
      LightingOrchestrator.getInstance().registerLight(light);

      // Play spatial sfx
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
        targetBlock: null,
        targetShip: null,
        coord: null,
        ownerShipId: ship.id,
        particleIndex,
        particleOriginalSize: 4,
        ttl: lifetime,
        age: 0,
        emissionAccumulatorTrail: 0,
        emissionAccumulatorStuck: 0,
        firingBlockId: lance.block.type.id,
        light: light
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

    for (const lance of this.activeLances) {
      lance.age += dt;

      const trailColors = EXPLOSIVE_LANCE_COLOR_PALETTES[lance.firingBlockId] ?? ['#ccc', '#aaa', '#888'];
      lance.emissionAccumulatorTrail += dt * 20; // Adjust rate as needed
      const count = Math.floor(lance.emissionAccumulatorTrail);
      lance.emissionAccumulatorTrail -= count;

      for (let i = 0; i < count; i++) {
        this.particleManager.emitParticle(lance.position, {
          colors: trailColors,
          baseSpeed: 20,
          sizeRange: [1, 2],
          lifeRange: [0.3, 0.5],
          fadeOut: true,
        });
      }

      if (lance.age > lance.ttl && !lance.stuck) {
        this.particleManager.removeParticle(lance.particleIndex);
        exploded.add(lance);
        continue;
      }

      if (lance.stuck) {
        if (lance.targetShip && lance.anchorOffset) {
          const shipPos = lance.targetShip.getTransform().position;
          lance.position.x = shipPos.x + lance.anchorOffset.x;
          lance.position.y = shipPos.y + lance.anchorOffset.y;

          this.particleManager.setParticlePosition(
            lance.particleIndex,
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

        lance.emissionAccumulatorStuck += dt * 20; // 1 = desired particles per second
        const count = Math.floor(lance.emissionAccumulatorStuck);
        lance.emissionAccumulatorStuck -= count;

        const stuckColors = EXPLOSIVE_LANCE_COLOR_PALETTES[lance.firingBlockId] ?? ['#ccc', '#aaa', '#888'];
        for (let i = 0; i < count; i++) {
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

      lance.position.x += lance.velocity.x * dt;
      lance.position.y += lance.velocity.y * dt;
      lance.light.x = lance.position.x;
      lance.light.y = lance.position.y;

      const cells = this.grid.getRelevantCells(lance.position);
      for (const cell of cells) {
        const blocks = this.grid.getBlocksInCellByCoords(cell.x, cell.y, ship.getFaction());
        for (const block of blocks) {
          if (block.ownerShipId === lance.ownerShipId) continue;
          if (!block.position) continue;

          const dx = lance.position.x - block.position.x;
          const dy = lance.position.y - block.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 32) {
            const compositeBlockObject = findObjectByBlock(block);
            const coord = compositeBlockObject ? findBlockCoordinatesInObject(block, compositeBlockObject) : null;

            if (compositeBlockObject && coord) {
              if (compositeBlockObject.isNoClip()) continue;

              lance.stuck = true;
              lance.radiateTimer = 0;
              lance.targetBlock = block;
              lance.targetShip = compositeBlockObject;
              lance.coord = coord;

              // Electrocute if applies
              if (explosiveLanceElectrocution) {
                if (compositeBlockObject instanceof Ship) {
                  compositeBlockObject.addStatusEffect('electrocuted', 8, 1);
                }
              }

              // Anchor offset relative to ship at moment of impact
              const shipPos = compositeBlockObject.getTransform().position;
              lance.anchorOffset = {
                x: lance.position.x - shipPos.x,
                y: lance.position.y - shipPos.y,
              };

              lance.velocity = { x: 0, y: 0 };
              this.particleManager.setParticleVelocity(lance.particleIndex, 0, 0);
              this.particleManager.extendParticleLife(lance.particleIndex, lance.detonationDelay + 0.2);
              this.particleManager.setParticleSize(lance.particleIndex, lance.particleOriginalSize * 1.25);

              // Play stuck sound effect
              const playerShip = ShipRegistry.getInstance().getPlayerShip();
              if (!playerShip) continue;
              playSpatialSfx(playerShip, ship, {
                file: 'assets/sounds/sfx/weapons/lance_01.wav',
                channel: 'sfx',
                baseVolume: 0.85,
                pitchRange: [1.0, 1.3],
                volumeJitter: 0.1,
                maxSimultaneous: 5,
              });

              // Shake screen slightly
              shakeCamera(6, 0.16, 10, 'explosiveLance');

              const wasDestroyed = this.combatService.applyDamageToBlock(
                compositeBlockObject,
                ship,
                block,
                coord,
                lance.fireDamage,
                'explosiveLance',
              );
              if (wasDestroyed) {
                this.explodeLance(lance, ship);
                exploded.add(lance);
                continue;
              }
            }
            break;
          }
        }
      }
    }
    this.activeLances = this.activeLances.filter(l => !exploded.has(l));
  }

  private explodeLance(lance: ActiveExplosiveLance, ship: Ship, lifeSteal?: boolean): void {
    // Always remove visual light and particle
    LightingOrchestrator.getInstance().removeLight(lance.light.id);
    this.particleManager.removeParticle(lance.particleIndex);

    const colorPalette =
      EXPLOSIVE_LANCE_COLOR_PALETTES[lance.firingBlockId] ??
      ['#cccccc', '#aaaaaa', '#888888'];

    this.emitProjectileBurst(ship, lance, 16);

    // Light flash at point of impact (fallback to position if ship is gone)
    const flashX = lance.targetShip?.getTransform().position.x ?? lance.position.x;
    const flashY = lance.targetShip?.getTransform().position.y ?? lance.position.y;
    createLightFlash(
      flashX,
      flashY,
      lance.explosionRadius * 24,
      0.8,
      0.4,
      colorPalette[0],
      `explosiveLance-${lance.targetShip?.id ?? 'ambient'}`
    );

    // If we have a valid, alive targetShip and coord, apply AoE damage
    if (lance.targetShip && lance.coord && !lance.targetShip.isDestroyed()) {
      const blocks = lance.targetShip.getBlocksWithinGridDistance(
        lance.coord,
        lance.explosionRadius
      );

      const options: ExtraDamageOptions = {
        repairOrbDropRateMulti: lifeSteal ? 0.3 : 0,
        hideExplosionParticlesOnHit: false,
      };

      for (const [coord, block] of blocks) {
        this.combatService.applyDamageToBlock(
          lance.targetShip,
          ship,
          block,
          coord,
          lance.explosionDamage,
          'explosiveLanceAoE',
          true,
          0,
          1.5,
          options
        );
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
        'explosiveLance',
        damage * 2,
        life,
        1,
        ship.id,
        ship.getFaction(),
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

