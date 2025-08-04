// src/game/ship/CompositeBlockDestructionService.ts

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import type { PickupSpawner } from '@/systems/pickups/PickupSpawner';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';

import type { BlockStore } from '@/game/blocks/system/BlockStore';
import { BlockManager } from '@/game/blocks/system/BlockManager';

import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { GlobalEventBus } from '@/core/EventBus';
import { audioManager } from '@/audio/Audio';

import { Ship } from '@/game/ship/Ship';
import { MovementSystemRegistry } from '@/systems/physics/MovementSystemRegistry';
import { getConnectedBlockCoordsFast } from '@/game/ship/utils/shipBlockUtils';
import { DEFAULT_EXPLOSION_SPARK_PALETTE } from '@/game/blocks/BlockColorSchemes';
import { emitDefaultShockwave, emitHugeShockwave } from '@/core/interfaces/events/SpecialFxReporter';

export type DestructionCause =
  | 'projectile' | 'turret' | 'collision' | 'bomb' | 'flameThrower' | 'laser'
  | 'explosiveLance' | 'explosiveLanceAoE' | 'heatSeekerDirect' | 'heatSeekerAoE'
  | 'haloBlade' | 'self' | 'scripted' | 'reflected' | 'replaced' | 'dot';

interface BlockDestructionStep {
  delay: number;
  callback: () => void;
}

interface DestructionJob {
  entityId: string;
  steps: BlockDestructionStep[];
  elapsed: number;
}

interface CachedDestructionData {
  idx: number;
  coord: GridCoord;
  delay: number;
  radius: number;
  scale: number;
}

const SHOCK_WAVE_COOLDOWN = 4.0;

export class CompositeBlockDestructionService {
  private destructionCallbacks = new Set<(entity: CompositeBlockObject, cause: DestructionCause) => void>();
  private activeDestructions = new Map<string, DestructionJob>();
  private store: BlockStore;

  private explosionSounds = [
    'assets/sounds/sfx/explosions/explosion_00.wav',
    'assets/sounds/sfx/explosions/explosion_00.wav',
    'assets/sounds/sfx/explosions/explosion_01.wav',
  ];

  // Reusable buffers to avoid GC thrashing
  private cachedDestructionBuffer: CachedDestructionData[] = [];
  private coordBuffer: GridCoord[] = [];

  // Random ring buffers
  private readonly RANDOM_BUFFER_SIZE = 64;
  private readonly radiusRandBuffer: number[] = [];
  private readonly scaleRandBuffer: number[] = [];
  private readonly delayRandBuffer: number[] = [];
  private randPtr = 0;

  // Reusable data structures for performance optimization
  private reusableConnectedSet?: Set<number>;
  private reusableWorkQueue?: GridCoord[];

  // Temporary limit to shockwaves until multiple rendering fixed
  private shockwaveTimer = 0;

  constructor(
    private readonly explosionSystem: ExplosionSystem,
    private readonly pickupSpawner: PickupSpawner,
    private readonly shipRegistry: ShipRegistry,
    private readonly aiOrchestrator: AIOrchestratorSystem
  ) {
    this.store = BlockManager.getInstance().getBlockStore();
    GlobalEventBus.on('entity:destroy', this.handleDestroyEntity);
    this.seedRandomBuffers();
  }

  private seedRandomBuffers(): void {
    for (let i = 0; i < this.RANDOM_BUFFER_SIZE; i++) {
      this.radiusRandBuffer[i] = Math.random(); // 0–1
      this.scaleRandBuffer[i] = Math.random();
      this.delayRandBuffer[i] = Math.random();

      this.injectSpikesEveryNth(this.radiusRandBuffer, 20, 4);
      this.injectSpikesEveryNth(this.scaleRandBuffer, 20, 4);
      this.injectSpikesEveryNth(this.delayRandBuffer, 20, 4);
    }
  }

  private injectSpikesEveryNth(buffer: number[], every: number, magnitude: number, offset = 0): void {
    for (let i = offset; i < buffer.length; i += every) {
      buffer[i] = magnitude;
    }
  }

  private nextRandom(buffer: number[]): number {
    const val = buffer[this.randPtr];
    this.randPtr = (this.randPtr + 1) % this.RANDOM_BUFFER_SIZE;
    return val;
  }

  public destroy(): void {
    GlobalEventBus.off('entity:destroy', this.handleDestroyEntity);
    this.destructionCallbacks.clear();
    this.activeDestructions.clear();
  }

  public update(dt: number): void {
    for (const [entityId, job] of this.activeDestructions) {
      job.elapsed += dt;
      while (job.steps.length > 0 && job.steps[0].delay <= job.elapsed) {
        const step = job.steps.shift();
        try {
          step?.callback();
        } catch (err) {
          console.error(`[CompositeBlockDestructionService] Error executing block destruction step:`, err);
        }
      }
      if (job.steps.length === 0) {
        this.activeDestructions.delete(entityId);
      }
    }

    this.shockwaveTimer += dt;
  }

  public onEntityDestroyed(callback: (entity: CompositeBlockObject, cause: DestructionCause) => void): void {
    this.destructionCallbacks.add(callback);
  }

  public offEntityDestroyed(callback: (entity: CompositeBlockObject, cause: DestructionCause) => void): void {
    this.destructionCallbacks.delete(callback);
  }

  private handleDestroyEntity = ({ entity, cause }: { entity: CompositeBlockObject; cause: DestructionCause }): void => {
    this.destroyEntity(entity, cause);
  };

  public destroyEntity(entity: CompositeBlockObject, cause: DestructionCause = 'scripted'): void {
    if (this.activeDestructions.has(entity.id)) return;

    const transform = entity.getTransform();
    const indices = [...entity.getAllBlockIndices()];
    const entityId = entity.id;
    const store = this.store;

    for (const cb of this.destructionCallbacks) {
      try {
        cb(entity, cause);
      } catch (err) {
        console.error('[CompositeBlockDestructionService] Error in destruction callback:', err);
      }
    }

    entity.setDestroying(true);

    const isShip = entity instanceof Ship;
    const replaced = cause === 'replaced';

    if (isShip) {
      this.shipRegistry.remove(entity, cause, replaced);
      MovementSystemRegistry.unregister(entity);
      this.aiOrchestrator.removeControllersForShip?.(entityId);
      entity.clearAllStatusEffects();
    } else {
      entity.destroy();
      return;
    }

    if (replaced) {
      entity.setDestructionCause('replaced');
      entity.destroy();
      return;
    }

    const steps: BlockDestructionStep[] = [];
    const blockIndicesLength = indices.length;

    createLightFlash(
      transform.position.x,
      transform.position.y,
      4 * entity.getTotalMass(),
      1.25,
      0.5,
      '#ffffff',
      `explosion-${entityId}`
    );

    // If large ship, emit shockwave
    if (this.shockwaveTimer > SHOCK_WAVE_COOLDOWN) {
      if (blockIndicesLength > 40) {
        emitHugeShockwave(transform.position.x, transform.position.y);
        this.shockwaveTimer = 0;
      } else if (blockIndicesLength > 20) {
        emitDefaultShockwave(transform.position.x, transform.position.y);
        this.shockwaveTimer = 0;
      }
    }

    const soundIndex = Math.floor(Math.random() * this.explosionSounds.length);
    audioManager.play(this.explosionSounds[soundIndex], 'sfx', { maxSimultaneous: 5 });

    const buf = this.cachedDestructionBuffer;
    const coordBuf = this.coordBuffer;
    buf.length = 0;

    for (let i = 0; i < blockIndicesLength; i++) {
      const idx = indices[i];

      let coord = coordBuf[i];
      if (!coord) {
        coord = { x: 0, y: 0 };
        coordBuf[i] = coord;
      }
      coord.x = store.localX[idx];
      coord.y = store.localY[idx];

      buf.push({
        idx,
        coord,
        delay: i * 0.005,
        radius: 50 + this.nextRandom(this.radiusRandBuffer) * 40,
        scale: 0.5 + this.nextRandom(this.scaleRandBuffer) * 0.5,
      });
    }

    for (const data of buf) {
      steps.push({
        delay: data.delay,
        callback: () => {
          this.explosionSystem.createBlockExplosion(
            entity.id,
            transform.position,
            transform.rotation,
            data.coord,
            data.radius,
            data.scale,
            undefined,
            DEFAULT_EXPLOSION_SPARK_PALETTE
          );
          const dropRateMulti = entity.getAffixes?.().blockDropRateMulti ?? 1;
          this.pickupSpawner.spawnPickupOnBlockDestruction(data.idx, dropRateMulti);
          entity.removeBlockByIndex(data.idx);
        }
      });
    }

    entity.setDestructionCause(cause);
    const cockpitCoord = entity.getCockpitCoord();
    if (cockpitCoord) {
      const connected = getConnectedBlockCoordsFast(
        entity,
        cockpitCoord,
        this.reusableConnectedSet ??= new Set<number>(),
        this.reusableWorkQueue ??= []
      );

      for (const data of this.cachedDestructionBuffer) {
        const key = (data.coord.x << 16) | (data.coord.y & 0xffff);
        if (connected.has(key)) continue;

        const radius = 60 + this.nextRandom(this.radiusRandBuffer) * 20;
        const scale = 0.5 + this.nextRandom(this.scaleRandBuffer) * 0.3;
        const delay = 0.005 + this.nextRandom(this.delayRandBuffer) * 0.5;

        steps.push({
          delay,
          callback: () => {
            this.explosionSystem.createBlockExplosion(
              entity.id,
              transform.position,
              transform.rotation,
              data.coord,
              radius,
              scale,
              undefined,
              DEFAULT_EXPLOSION_SPARK_PALETTE
            );
            const dropRateMulti = entity.getAffixes?.().blockDropRateMulti ?? 1;
            this.pickupSpawner.spawnPickupOnBlockDestruction(data.idx, dropRateMulti);
            entity.removeBlockByIndex(data.idx);
          }
        });
      }
    }

    this.activeDestructions.set(entityId, {
      entityId,
      steps: steps.sort((a, b) => a.delay - b.delay),
      elapsed: 0,
    });
  }
}
