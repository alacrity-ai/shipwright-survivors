// src/game/waves/orchestrator/WaveExecutionContext.ts

import type { Ship } from '@/game/ship/Ship';
import type { ScriptRunner } from '@/game/waves/scripting/ScriptRunner';
import type { WaveDefinition, WaveShipEntry } from '@/game/waves/types/WaveDefinition';
import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { SpawnCoordinateResolver } from '@/game/waves/executor/SpawnCoordinateResolver';
import type { ShipFactory } from '@/game/ship/factories/ShipFactory';
import type { WaveModifiersApplier } from '@/game/waves/executor/WaveModifiersApplier';

import { GlobalEnemyCullingSystem } from '@/systems/culling/GlobalEnemyCullingSystem';

import { DefaultBehaviorProfile } from '@/systems/ai/types/BehaviorProfile';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { getDistance } from '@/shared/vectorUtils';

import { destroyEntityExternally } from '@/core/interfaces/events/EntityReporter';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { completeWave } from '@/core/interfaces/events/WaveSpawnReporter';

interface ShipGroup {
  remaining: Set<Ship>;
  onAllDefeated?: string;
  scriptFired: boolean;
  entry: WaveShipEntry;
}

export class WaveExecutionContext {
  private readonly allShips = new Set<Ship>();
  private readonly groupMap = new Map<WaveShipEntry, ShipGroup>();
  private isDestroyed = false;

  private readonly enemyCullingSystem: GlobalEnemyCullingSystem;

  // Sustained wave support
  private timeSinceLastSpawnCheck = 0;
  private readonly spawnInterval: number;

  constructor(
    private readonly wave: WaveDefinition,
    private readonly waveIndex: number,
    private readonly scriptRunner: ScriptRunner,
    private readonly tag: string | undefined,
    private readonly spawnResolver: SpawnCoordinateResolver,
    private readonly shipFactory: ShipFactory,
    private readonly modApplier: WaveModifiersApplier
  ) {
    this.enemyCullingSystem = new GlobalEnemyCullingSystem();
    this.spawnInterval = this.wave.spawnDelay ?? 2;
  }

  /**
   * Used for normal wave entries that should be tracked for sustainMode and onAllDefeated.
   */
  public trackShip(ship: Ship, controller: AIControllerSystem, origin: WaveShipEntry): void {
    this.allShips.add(ship);

    let group = this.groupMap.get(origin);
    if (!group) {
      group = {
        remaining: new Set(),
        onAllDefeated: origin.onAllDefeated,
        scriptFired: false,
        entry: origin,
      };
      this.groupMap.set(origin, group);
    }

    group.remaining.add(ship);
    ship.onDestroyedCallback((ship, cause) => this.notifyShipDestroyed(ship, cause));
  }

  /**
   * Used for formation ships and other non-respawning ships that should not participate in sustain logic.
   */
  public trackFormationShip(ship: Ship, controller: AIControllerSystem): void {
    this.allShips.add(ship);
    ship.onDestroyedCallback((ship, cause) => this.notifyShipDestroyed(ship, cause));
  }

  public notifyShipDestroyed(ship: Ship, cause: string): void {
    this.allShips.delete(ship);

    if (cause !== 'replaced') {
      missionResultStore.incrementKillCount();
    }

    for (const [entry, group] of this.groupMap.entries()) {
      if (!group.remaining.has(ship)) continue;

      group.remaining.delete(ship);

      if (group.remaining.size === 0 && group.onAllDefeated && !group.scriptFired) {
        this.scriptRunner.execute(group.onAllDefeated, {
          waveIndex: this.waveIndex,
          waveDefinition: this.wave,
        });
        group.scriptFired = true;
      }
    }

    if (this.tag && this.isComplete() && !this.isDestroyed) {
      completeWave(this.tag);
    }
  }

  public getBossShips(): Ship[] {
    if (!this.wave.isBoss) return [];

    const result: Ship[] = [];

    for (const group of this.groupMap.values()) {
      const isBossEntry =
        group.entry.shipId?.startsWith('boss_') || this.wave.isBoss;

      if (isBossEntry) {
        for (const ship of group.remaining) {
          ship.addTag('persistent');
          ship.addTag('boss');
          result.push(ship);
        }
      }
    }

    return result;
  }

  public isComplete(): boolean {
    return this.allShips.size === 0;
  }

  public getWave(): WaveDefinition {
    return this.wave;
  }

  public getWaveIndex(): number {
    return this.waveIndex;
  }

  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    for (const ship of this.allShips) {
      ship.setDestructionCause('replaced');
      destroyEntityExternally(ship, 'replaced');
    }

    this.allShips.clear();
    this.groupMap.clear();

    if (this.tag) {
      completeWave(this.tag);
    }
  }

  /**
   * Update loop for sustainMode waves.
   * Will skip ships that were not registered via trackShip (e.g., formation members).
   */
  public async update(dt: number): Promise<void> {
    if (!this.wave.sustainMode || this.isDestroyed) return;

    this.timeSinceLastSpawnCheck += dt;
    if (this.timeSinceLastSpawnCheck < this.spawnInterval) return;
    this.timeSinceLastSpawnCheck = 0;

    const playerShip = ShipRegistry.getInstance().getPlayerShip();
    const playerPos = playerShip?.getTransform().position;
    if (!playerPos) return;

    this.enemyCullingSystem.update(dt);

    for (const group of this.groupMap.values()) {
      // // Cull ships that are too far
      // for (const ship of [...group.remaining]) {
      //   const shipPos = ship.getTransform().position;
      //   const dist = getDistance(playerPos, shipPos);
      //   if (dist > MAX_THREAT_DISTANCE) {
      //     ship.setDestructionCause('replaced');
      //     destroyEntityExternally(ship, 'replaced');
      //   }
      // }

      // Replenish quota
      const desiredCount = group.entry.count ?? 0;
      const currentCount = group.remaining.size;
      const deficit = desiredCount - currentCount;

      if (deficit <= 0) continue;

      for (let i = 0; i < deficit; i++) {
        const { x, y } = this.spawnResolver.getCoords(this.wave);

        const { ship, controller } = await this.shipFactory.createShip(
          group.entry.shipId,
          x,
          y,
          true,
          group.entry.behaviorProfile,
          group.entry.affixes ?? {}
        );

        this.modApplier.apply(ship, this.wave.mods);
        this.trackShip(ship, controller!, group.entry);
      }
    }
  }
}
