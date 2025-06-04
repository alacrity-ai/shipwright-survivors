import type { WeaponBackend } from '@/systems/combat/WeaponSystem';
import type { Ship } from '@/game/ship/Ship';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { CombatService } from '@/systems/combat/CombatService';
import type { ParticleManager } from '@/systems/fx/ParticleManager';
import type { Particle } from '@/systems/fx/interfaces/Particle';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { Grid } from '@/systems/physics/Grid';
import { EXPLOSIVE_LANCE_COLOR_PALETTES } from '@/game/blocks/BlockColorSchemes';
import { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import { findObjectByBlock, findBlockCoordinatesInObject } from '@/game/entities/utils/universalBlockInterfaceUtils';

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
  particle: Particle;
  anchorOffset?: { x: number; y: number };
  ttl: number;
  age: number;
  emissionAccumulatorTrail: number;
  emissionAccumulatorStuck: number;
  firingBlockId: string;
}

export class ExplosiveLanceBackend implements WeaponBackend {
  private activeLances: ActiveExplosiveLance[] = [];

  constructor(
    private readonly combatService: CombatService,
    private readonly particleManager: ParticleManager,
    private readonly grid: Grid,
    private readonly explosionSystem: ExplosionSystem,
    private readonly playerShip: Ship
  ) {}

  update(dt: number, ship: Ship, transform: BlockEntityTransform, intent: WeaponIntent | null): void {
    const plan = ship.getFiringPlan().filter(p => p.block.type.behavior?.fire?.fireType === 'explosiveLance');
    if (plan.length === 0) return;

    const target = intent?.aimAt;
    const fireRequested = intent?.firePrimary ?? false;

    for (let i = plan.length - 1; i >= 0; i--) {
      const lance = plan[i];
      if (!ship.getBlockCoord(lance.block)) continue;

      lance.timeSinceLastShot += dt;
      if (!fireRequested || lance.timeSinceLastShot < lance.fireCooldown) continue;

      lance.timeSinceLastShot = 0;

      const fire = lance.block.type.behavior!.fire!;
      const lifetime = fire.lifetime ?? 1.5;
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
      const particle = this.particleManager.emitParticle({ x: worldX, y: worldY }, {
        colors,
        baseSpeed: 0,
        sizeRange: [4, 4],
        lifeRange: [fire.lifetime ?? 1.5, (fire.lifetime ?? 1.5) + 0.1],
        velocity: { x: vx, y: vy },
      });

      this.activeLances.push({
        position: { x: worldX, y: worldY },
        velocity: { x: vx, y: vy },
        fireDamage: fire.fireDamage ?? 10,
        explosionDamage: fire.explosionDamage ?? 30,
        explosionRadius: fire.explosionRadiusBlocks ?? 2,
        detonationDelay: fire.detonationDelayMs! / 1000,
        elapsed: 0,
        stuck: false,
        targetBlock: null,
        targetShip: null,
        coord: null,
        ownerShipId: ship.id,
        particle,
        ttl: lifetime,
        age: 0,
        emissionAccumulatorTrail: 0,
        emissionAccumulatorStuck: 0,
        firingBlockId: lance.block.type.id,
      });
    }

    this.updateLances(dt);
  }

  private updateLances(dt: number): void {
    const exploded = new Set<ActiveExplosiveLance>();

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
        this.particleManager.removeParticle(lance.particle);
        exploded.add(lance);
        continue;
      }

      if (lance.stuck) {
        if (lance.targetShip && lance.anchorOffset) {
          const shipPos = lance.targetShip.getTransform().position;
          lance.position.x = shipPos.x + lance.anchorOffset.x;
          lance.position.y = shipPos.y + lance.anchorOffset.y;
          lance.particle.x = lance.position.x;
          lance.particle.y = lance.position.y;
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
        if (lance.elapsed >= lance.detonationDelay) {
          this.explodeLance(lance);
          exploded.add(lance);
        }
        continue;
      }

      lance.position.x += lance.velocity.x * dt;
      lance.position.y += lance.velocity.y * dt;

      const cells = this.grid.getRelevantCells(lance.position);
      for (const cell of cells) {
        const blocks = this.grid.getBlocksInCellByCoords(cell.x, cell.y);
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
              lance.stuck = true;
              lance.targetBlock = block;
              lance.targetShip = compositeBlockObject;
              lance.coord = coord;

              // Anchor offset relative to ship at moment of impact
              const shipPos = compositeBlockObject.getTransform().position;
              lance.anchorOffset = {
                x: lance.position.x - shipPos.x,
                y: lance.position.y - shipPos.y,
              };

              lance.velocity = { x: 0, y: 0 };
              lance.particle.vx = 0;
              lance.particle.vy = 0;
              lance.particle.life = lance.detonationDelay + 0.2;
              lance.particle.size *= 1.25;

              const wasDestroyed = this.combatService.applyDamageToBlock(
                compositeBlockObject,
                block,
                coord,
                lance.fireDamage,
                'explosiveLance',
                this.playerShip
              );
              if (wasDestroyed) {
                this.explodeLance(lance);
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

  private explodeLance(lance: ActiveExplosiveLance): void {
    if (!lance.targetShip || !lance.coord) return;

    const blocks = lance.targetShip.getBlocksWithinGridDistance(lance.coord, lance.explosionRadius);
    for (const block of blocks) {
      const coord = lance.targetShip.getBlockCoord(block);
      if (coord) {
        this.explosionSystem.createBlockExplosion(
          lance.targetShip.getTransform().position,
          lance.targetShip.getTransform().rotation,
          coord,
          lance.explosionRadius * 64,
          0.7,
          EXPLOSIVE_LANCE_COLOR_PALETTES[lance.firingBlockId]?.[0],
          EXPLOSIVE_LANCE_COLOR_PALETTES[lance.firingBlockId]
        );
        this.combatService.applyDamageToBlock(
          lance.targetShip,
          block,
          coord,
          lance.explosionDamage,
          'explosiveLanceAoE',
          this.playerShip
        );
      }
    }

    this.particleManager.removeParticle(lance.particle);
  }
}
