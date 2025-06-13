// src/systems/combat/backends/HaloBladeBackend.ts

import type { WeaponBackend } from '@/systems/combat/WeaponSystem';
import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { CombatService } from '@/systems/combat/CombatService';
import type { ParticleManager } from '@/systems/fx/ParticleManager';
import type { Grid } from '@/systems/physics/Grid';
import type { GLProjectileSprite } from '@/rendering/cache/ProjectileSpriteCache';

import { SpriteRendererGL } from '@/rendering/gl/SpriteRendererGL';
import { getGLProjectileSprite } from '@/rendering/cache/ProjectileSpriteCache';
import { CanvasManager } from '@/core/CanvasManager';
import { FiringMode } from '@/systems/combat/types/WeaponTypes';
import { Camera } from '@/core/Camera';
import { findObjectByBlock } from '@/game/entities/utils/universalBlockInterfaceUtils';

interface OrbitingBlade {
  block: BlockInstance;
  angle: number;
  radius: number;
  position: { x: number; y: number };
}

export class HaloBladeBackend implements WeaponBackend {
  private orbiters: OrbitingBlade[] = [];
  private tierPhases: Map<string, number> = new Map(); // Track phase per tier

  private readonly spriteRenderer: SpriteRendererGL;
  private gl: WebGLRenderingContext;
  private energyRingSprites: Map<string, GLProjectileSprite> = new Map(); // New

  constructor(
    private readonly combatService: CombatService,
    private readonly particleManager: ParticleManager,
    private readonly grid: Grid,
    private readonly ship: Ship
  ) {
    this.gl = CanvasManager.getInstance().getWebGLContext('entitygl');
    this.spriteRenderer = SpriteRendererGL.getInstance(this.gl);

    // New
    this.energyRingSprites = new Map([
      ['energyRing0', getGLProjectileSprite('energyRing0')],
      ['energyRing1', getGLProjectileSprite('energyRing1')],
      ['energyRing2', getGLProjectileSprite('energyRing2')],
      ['energyRing3', getGLProjectileSprite('energyRing3')],
      ['energyRing4', getGLProjectileSprite('energyRing4')],
    ]);
  }

  render(dt: number): void {
    const ship = this.ship;
    if (!ship) return;

    const bladeMap = ship.getHaloBladeBlocks();
    const camera = Camera.getInstance();
    const zoom = camera.getZoom();

    for (const orbiter of this.orbiters) {
      const props = bladeMap.get(orbiter.block);
      if (!props) continue;

      // New usage of cached sprites
      const sprite = this.energyRingSprites.get(props.sprite);
      if (!sprite) continue;

      this.spriteRenderer.renderTexture(
        sprite.texture,
        orbiter.position.x,
        orbiter.position.y,
        64,
        64,
        1.0
      ); 
    }
  }

  update(dt: number, ship: Ship, transform: BlockEntityTransform, intent: WeaponIntent | null): void {
    console.log('[HaloBladeBackend] Updating called from: ', new Error().stack);
    const bladeMap = ship.getHaloBladeBlocks();
    const currentBlades = Array.from(bladeMap.keys());

    // === Prune removed orbiters ===
    this.orbiters = this.orbiters.filter(o => bladeMap.has(o.block));

    // === Add new orbiters ===
    for (const block of currentBlades) {
      if (!this.orbiters.find(o => o.block === block)) {
        const props = bladeMap.get(block)!;

        this.orbiters.push({
          block,
          angle: 0, // will be set by tier logic
          radius: props.orbitingRadius,
          position: { x: 0, y: 0 }
        });
      }
    }

    const shipCenter = ship.getTransform().position;

    // === Group orbiters by tier ID ===
    const tierGroups = new Map<string, OrbitingBlade[]>();
    for (const orbiter of this.orbiters) {
      const id = orbiter.block.type.id; // e.g., 'haloBlade2'
      if (!tierGroups.has(id)) tierGroups.set(id, []);
      tierGroups.get(id)!.push(orbiter);
    }

    // === Update each tier group with uniform distribution ===
    for (const [tierId, group] of tierGroups.entries()) {
      if (group.length === 0) continue;

      const props = bladeMap.get(group[0].block);
      if (!props) continue;

      // Determine rotation direction based on firing mode
      const firingModeIsSequence = ship.getFiringMode() === FiringMode.Sequence;
      const rotationDirection = firingModeIsSequence ? 1 : -1;

      // Initialize or advance the tier's base phase
      let baseAngle = this.tierPhases.get(tierId) ?? Math.random() * Math.PI * 2;
      baseAngle += props.orbitingSpeed * dt * rotationDirection; // Apply direction to base rotation
      this.tierPhases.set(tierId, baseAngle);

      // FIX: Sort orbiters by stable identifier to ensure consistent ordering
      group.sort((a, b) => {
        const idA = a.block.id;
        const idB = b.block.id;
        return idA.localeCompare(idB);
      });

      // Distribute blades evenly around the circle
      const count = group.length;
      for (let i = 0; i < count; i++) {
        const orbiter = group[i];
        // For distribution, we can keep it simple since base rotation handles direction
        const angle = baseAngle + (i / count) * Math.PI * 2;

        orbiter.angle = angle;
        orbiter.radius = props.orbitingRadius;

        // Determine radius based on firing mode
        const firingModeRadius = firingModeIsSequence ? orbiter.radius : orbiter.radius * 0.5;

        // Update world position
        orbiter.position.x = shipCenter.x + Math.cos(angle) * firingModeRadius;
        orbiter.position.y = shipCenter.y + Math.sin(angle) * firingModeRadius;

        // Emit particle from orbiter blade
        this.particleManager.emitParticle(orbiter.position, {
          colors: [props.color, '#fff'],
          baseSpeed: 0,
          sizeRange: [0.8, 1.2],
          lifeRange: [0.3, 0.8],
          fadeOut: true,
          light: true,
          lightRadiusScalar: 32,
          lightIntensity: 0.8,
        });
      }
    }

    // === Clean up phases for removed tiers ===
    const activeTiers = new Set(tierGroups.keys());
    for (const tierId of this.tierPhases.keys()) {
      if (!activeTiers.has(tierId)) {
        this.tierPhases.delete(tierId);
      }
    }

    // === Collision and damage pass ===
    for (const orbiter of this.orbiters) {
      const props = bladeMap.get(orbiter.block);
      if (!props) continue;

      const x = orbiter.position.x;
      const y = orbiter.position.y;

      const cells = this.grid.getRelevantCells({ x, y });
      for (const cell of cells) {
        const enemyBlocks = this.grid.getBlocksInCellByCoords(cell.x, cell.y, ship.getFaction());
        for (const block of enemyBlocks) {
          if (!block.position) continue;

          const dx = x - block.position.x;
          const dy = y - block.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < props.size / 2 + 16) {
            const enemyShip = findObjectByBlock(block);
            const coord = enemyShip?.getBlockCoord(block);
            if (enemyShip && coord) {
              this.combatService.applyDamageToBlock(
                enemyShip,
                ship,
                block,
                coord,
                props.damage,
                'haloBlade',
                this.ship
              );
            }
          }
        }
      }
    }
  }
}
