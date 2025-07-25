// src/systems/combat/backends/HaloBladeBackend.ts

import type { WeaponBackend } from '@/systems/combat/WeaponSystem';
import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { CombatService } from '@/systems/combat/CombatService';
import type { ParticleManager } from '@/systems/fx/ParticleManager';
import type { GLProjectileSprite } from '@/rendering/cache/ProjectileSpriteCache';

import type { BlockStore } from '@/game/blocks/system/BlockStore';
import type { BlockSpatialGrid } from '@/game/blocks/system/BlockSpatialGrid';
import { BlockManager } from '@/game/blocks/system/BlockManager';
import { getBlockTypeByIndex } from '@/game/blocks/BlockRegistry';
import { FACTION_TO_INDEX } from '@/game/interfaces/types/Faction';

import { findBlockCoordinatesInObject } from '@/game/entities/utils/universalBlockInterfaceUtils';

import { Faction } from '@/game/interfaces/types/Faction';
import { GlobalSpriteRequestBus } from '@/rendering/unified/bus/SpriteRenderRequestBus';

import { getGLProjectileSprite } from '@/rendering/cache/ProjectileSpriteCache';
import { FiringMode } from '@/systems/combat/types/WeaponTypes';
import { findObjectByBlock } from '@/game/entities/utils/universalBlockInterfaceUtils';

interface OrbitingBlade {
  blockIdx: number; // Changed to blockIdx
  angle: number;
  radius: number;
  position: { x: number; y: number };
  sprite: GLProjectileSprite;
  size: number;
  damage: number;
}

export class HaloBladeBackend implements WeaponBackend {
  private orbiters: OrbitingBlade[] = [];
  private tierPhases: Map<string, number> = new Map(); // Track phase per tier
  private energyRingSprites: Map<string, GLProjectileSprite> = new Map();
  private static readonly MAX_DAMAGE_APPLICATIONS_PER_FRAME = 1;

  private store: BlockStore;
  private grid: BlockSpatialGrid;
  private gridCellSize: number;

  constructor(
    private readonly combatService: CombatService,
    private readonly particleManager: ParticleManager,
    // Removed grid, keeping ship for now (this is the ship that owns this backend)
    private readonly ship: Ship
  ) {
    this.store = BlockManager.getInstance().getBlockStore();
    this.grid = BlockManager.getInstance().getBlockSpatialGrid();
    this.gridCellSize = this.grid.getCellSize();

    this.energyRingSprites = new Map([
      ['energyRing0', getGLProjectileSprite('energyRing0')],
      ['energyRing1', getGLProjectileSprite('energyRing1')],
      ['energyRing2', getGLProjectileSprite('energyRing2')],
      ['energyRing3', getGLProjectileSprite('energyRing3')],
      ['energyRing4', getGLProjectileSprite('energyRing4')],
      ['energyRing5', getGLProjectileSprite('energyRing5')]
    ]);
  }

  render(dt: number): void {}

  update(dt: number, ship: Ship, transform: BlockEntityTransform, intent: WeaponIntent | null): void {
    // Updated API: returns Map<number (blockIdx), { orbitingRadius, sprite, size, damage, color, orbitingSpeed }>
    const bladeMap = this.ship.getHaloBladeIndices();

    let sizeBonus = ship.getPassiveBonus('halo-blade-size');
    const { haloBladeDamage = 0, haloBladeSize = 0, haloBladeOrbitRadius = 0 } = ship.getSkillEffects();
    sizeBonus += haloBladeSize;

    let damageBonus = ship.getPassiveBonus('halo-blade-damage');
    const { baseDamageMultiplier = 0 } = ship.getPowerupBonus();
    damageBonus += baseDamageMultiplier;

    const currentIndices = Array.from(bladeMap.keys());

    // Prune orbiters for missing blades
    this.orbiters = this.orbiters.filter(o => bladeMap.has(o.blockIdx));

    // Add new orbiters
    for (const idx of currentIndices) {
      if (!this.orbiters.find(o => o.blockIdx === idx)) {
        const props = bladeMap.get(idx)!;

        this.orbiters.push({
          blockIdx: idx,
          angle: 0,
          radius: props.orbitingRadius * (1 + haloBladeOrbitRadius),
          position: { x: 0, y: 0 },
          sprite: this.energyRingSprites.get(props.sprite)!,
          size: props.size * sizeBonus,
          damage: props.damage * damageBonus + haloBladeDamage,
        });
      }
    }

    const shipCenter = ship.getTransform().position;

    // === Group orbiters by type ID (derived via typeIndex) ===
    const tierGroups = new Map<string, OrbitingBlade[]>();
    for (const orbiter of this.orbiters) {
      const typeIdx = this.store.typeIndex[orbiter.blockIdx];
      const type = getBlockTypeByIndex(typeIdx);
      const id = type?.id ?? `unknown-${typeIdx}`;
      if (!tierGroups.has(id)) tierGroups.set(id, []);
      tierGroups.get(id)!.push(orbiter);
    }

    // === Update each tier group with uniform distribution ===
    for (const [tierId, group] of tierGroups.entries()) {
      if (group.length === 0) continue;

      const firstIdx = group[0].blockIdx;
      const props = bladeMap.get(firstIdx);
      if (!props) continue;

      const firingModeIsSequence = ship.getFiringMode() === FiringMode.Sequence;
      const rotationDirection = firingModeIsSequence ? 1 : -1;

      let baseAngle = this.tierPhases.get(tierId) ?? Math.random() * Math.PI * 2;
      baseAngle += props.orbitingSpeed * dt * rotationDirection;
      this.tierPhases.set(tierId, baseAngle);

      // Sort orbiters by numeric block index for stable ordering
      group.sort((a, b) => a.blockIdx - b.blockIdx);

      const count = group.length;
      for (let i = 0; i < count; i++) {
        const orbiter = group[i];
        const angle = baseAngle + (i / count) * Math.PI * 2;

        orbiter.angle = angle;

        const firingModeRadius = firingModeIsSequence ? orbiter.radius : orbiter.radius * 0.5;

        orbiter.position.x = shipCenter.x + Math.cos(angle) * firingModeRadius;
        orbiter.position.y = shipCenter.y + Math.sin(angle) * firingModeRadius;

        GlobalSpriteRequestBus.add({
          texture: orbiter.sprite.texture,
          worldX: orbiter.position.x,
          worldY: orbiter.position.y,
          widthPx: 64 * sizeBonus,
          heightPx: 64 * sizeBonus,
          alpha: 1.0,
        });

        // 50% chance to emit particles
        if (Math.random() > 0.5) continue;

        const isEnemy = ship.getFaction() === Faction.Enemy;
        const color = isEnemy ? '#ff0000' : props.color;
        this.particleManager.emitParticle(orbiter.position, {
          colors: [color],
          baseSpeed: 0,
          sizeRange: [1.2, 1.6],
          lifeRange: [0.3, 0.8],
          fadeOut: true,
          light: true,
          lightRadiusScalar: 32,
          lightIntensity: 0.7,
        });
      }
    }

    // Remove tier phases for inactive tiers
    const activeTiers = new Set(tierGroups.keys());
    for (const tierId of this.tierPhases.keys()) {
      if (!activeTiers.has(tierId)) {
        this.tierPhases.delete(tierId);
      }
    }

    // === Collision and damage pass using BlockSpatialGrid ===
    let damageApplications = 0;
    const spatialGrid = this.grid;
    const gridCellSize = this.gridCellSize;

    for (const orbiter of this.orbiters) {
      const x = orbiter.position.x;
      const y = orbiter.position.y;

      // Compute the cell this orbiter is in (no "getRelevantCells" needed)
      const cellX = Math.floor(x / gridCellSize);
      const cellY = Math.floor(y / gridCellSize);

      // Get all blocks in this cell, excluding our own faction
      const enemyIndices = spatialGrid.getBlocksInCellFiltered(cellX, cellY, FACTION_TO_INDEX[ship.getFaction()]);

      for (let i = 0; i < enemyIndices.length; i++) {
        if (damageApplications >= HaloBladeBackend.MAX_DAMAGE_APPLICATIONS_PER_FRAME) break;

        const idx = enemyIndices[i];
        const bx = this.store.worldX[idx];
        const by = this.store.worldY[idx];
        const dx = x - bx;
        const dy = y - by;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < orbiter.size / 2 + 16) {
          const enemyShip = findObjectByBlock(idx);
          const coord = enemyShip ? findBlockCoordinatesInObject(idx, enemyShip) : null;

          const chanceOfLightFlash = Math.random() < 0.2;

          if (enemyShip && coord) {
            this.combatService.applyDamageToBlock(
              enemyShip,
              ship,
              idx,           // Block index
              coord,
              orbiter.damage,
              'haloBlade',
              chanceOfLightFlash
            );
            damageApplications++;
          }
        }
      }

      if (damageApplications >= HaloBladeBackend.MAX_DAMAGE_APPLICATIONS_PER_FRAME) break;
    }
  }
}
