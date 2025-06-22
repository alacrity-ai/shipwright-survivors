// src/game/waves/orchestrator/WaveExecutionContext.ts

import type { Ship } from '@/game/ship/Ship';
import type { ScriptRunner } from '@/game/waves/scripting/ScriptRunner';
import type { WaveDefinition, WaveShipEntry } from '@/game/waves/types/WaveDefinition';
import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';

import { missionResultStore } from '@/game/missions/MissionResultStore';

interface ShipGroup {
  remaining: Set<Ship>;
  onAllDefeated?: string;
  scriptFired: boolean;
}

export class WaveExecutionContext {
  private readonly allShips = new Set<Ship>();
  private readonly groupMap = new Map<WaveShipEntry, ShipGroup>();

  constructor(
    private readonly wave: WaveDefinition,
    private readonly waveIndex: number,
    private readonly scriptRunner: ScriptRunner
  ) {}

  public trackShip(ship: Ship, controller: AIControllerSystem, origin: WaveShipEntry): void {
    this.allShips.add(ship);

    let group = this.groupMap.get(origin);
    if (!group) {
      group = {
        remaining: new Set(),
        onAllDefeated: origin.onAllDefeated,
        scriptFired: false,
      };
      this.groupMap.set(origin, group);
    }

    group.remaining.add(ship);

    // Register destruction callback
    ship.onDestroyedCallback(() => this.notifyShipDestroyed(ship));
  }

  public notifyShipDestroyed(ship: Ship): void {
    this.allShips.delete(ship);
    missionResultStore.incrementKillCount();

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
}
