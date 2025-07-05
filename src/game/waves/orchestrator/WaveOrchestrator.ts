// src/game/waves/orchestrator/WaveOrchestrator.ts

import type { IUpdatable } from '@/core/interfaces/types';
import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { WaveExecutor } from '@/game/waves/executor/WaveExecutor';
import type { WaveExecutionContext } from './WaveExecutionContext';
import type { Ship } from '@/game/ship/Ship';

import { GlobalEventBus } from '@/core/EventBus';
import { missionResultStore } from '@/game/missions/MissionResultStore';

export class WaveOrchestrator implements IUpdatable {
  private readonly waves: WaveDefinition[];

  private currentWaveIndex = 0;
  private hasSpawnedFirstWave = false;

  private timeBeforeFirstWave = 0;
  private accumulatedTimeSinceStart = 0;
  private elapsedTime = 0;

  private readonly initialDelay = 10;
  private readonly defaultWaveInterval = 120;

  private isRunning = false;
  private isPaused = false;

  private activeWave: WaveExecutionContext | null = null;
  private pendingWavePromise: Promise<void> | null = null;

  private readonly singleShotWaves = new Map<string, WaveExecutionContext>();

  public constructor(
    waves: WaveDefinition[],
    private readonly executor: WaveExecutor
  ) {
    GlobalEventBus.on('wave:spawn', this.handleOneShotSpawn);
    GlobalEventBus.on('wave:clear', this.handleOneShotClear);
    this.waves = waves;
  }

  public start(): void {
    this.isRunning = true;
    this.currentWaveIndex = 0;
    this.timeBeforeFirstWave = 0;
    this.accumulatedTimeSinceStart = 0;
    this.elapsedTime = 0;
    this.hasSpawnedFirstWave = false;
    this.activeWave = null;
    this.pendingWavePromise = null;
    missionResultStore.setTotalWaves(this.waves.length);
  }

  public update(dt: number): void {
    if (!this.isRunning || this.isPaused) return;
    if (this.pendingWavePromise) return;

    if (!this.hasSpawnedFirstWave) {
      this.timeBeforeFirstWave += dt;
      if (this.timeBeforeFirstWave >= this.initialDelay) {
        this.pendingWavePromise = this.spawnNextWave().then(() => {
          this.pendingWavePromise = null;
        });
      }
      return;
    }

    // Accumulate total runtime since wave start
    this.accumulatedTimeSinceStart += dt;

    if (this.currentWaveIndex >= this.waves.length) return;

    const currentWaveDef = this.activeWave?.getWave() || this.waves[this.currentWaveIndex - 1];
    const interval = currentWaveDef.duration ?? this.defaultWaveInterval;

    // === sustainMode support ===
    if (currentWaveDef.sustainMode && this.activeWave) {
      void this.activeWave.update(dt); // Fire-and-forget; internally throttled by spawnInterval
    }

    if (interval !== Infinity) {
      this.elapsedTime += dt;
      if (this.elapsedTime >= interval) {
        missionResultStore.incrementWavesCleared();
        this.pendingWavePromise = this.spawnNextWave().then(() => {
          this.pendingWavePromise = null;
        });
      }
    } else {
      if (this.isActiveWaveCompleted()) {
        missionResultStore.incrementWavesCleared();
        this.pendingWavePromise = this.spawnNextWave().then(() => {
          this.pendingWavePromise = null;
        });
      }
    }
  }

  private async spawnNextWave(): Promise<void> {
    if (this.currentWaveIndex >= this.waves.length) return;

    const def = this.waves[this.currentWaveIndex];
    this.activeWave = await this.executor.execute(def, this.currentWaveIndex);
    this.currentWaveIndex++;
    this.elapsedTime = 0;
    this.hasSpawnedFirstWave = true;
  }

  public getCurrentWaveNumber(): number {
    return this.currentWaveIndex;
  }

  public getTimeUntilNextWave(): number {
    if (!this.isRunning || this.isPaused || this.pendingWavePromise) return -1;

    if (!this.hasSpawnedFirstWave) {
      return Math.ceil(this.initialDelay - this.timeBeforeFirstWave);
    }

    const def = this.activeWave?.getWave() || this.waves[Math.max(0, this.currentWaveIndex - 1)];
    const interval = def?.duration ?? this.defaultWaveInterval;
    if (interval === Infinity) return -1;

    return Math.max(0, interval - this.elapsedTime);
  }

  public getTimeSinceFirstWaveStarted(): number {
    return this.accumulatedTimeSinceStart;
  }

  public areAllWavesCompleted(): boolean {
    return this.currentWaveIndex >= this.waves.length;
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public notifyShipDestroyed(ship: Ship, cause: string = 'combat'): void {
    this.activeWave?.notifyShipDestroyed(ship, cause);
  }

  public isBossWaveActive(): boolean {
    return !!this.activeWave?.getWave().isBoss;
  }

  public isActiveWaveCompleted(): boolean {
    return this.activeWave?.isComplete() ?? false;
  }

  public skipToNextWave(): void {
    if (!this.isRunning || this.isPaused) return;
    if (this.pendingWavePromise) return;
    if (this.currentWaveIndex >= this.waves.length) return;

    this.pendingWavePromise = this.spawnNextWave().then(() => {
      missionResultStore.incrementWavesCleared();
      this.pendingWavePromise = null;
    });
  }

  public getBossShips(): Ship[] {
    if (!this.isBossWaveActive()) return [];
    return this.activeWave?.getBossShips() ?? [];
  }

  // === One-shot Wave Handlers ===

  private handleOneShotSpawn = async ({ tag, wave }: { tag: string; wave: WaveDefinition }): Promise<void> => {
    if (this.singleShotWaves.has(tag)) return;

    const ctx = await this.executor.execute(wave, -1, tag, {
      color: '#aa66ff',
      radius: 400,
      intensity: 1.6,
    });

    this.singleShotWaves.set(tag, ctx);
  };

  private handleOneShotClear = ({ tag }: { tag: string }): void => {
    const ctx = this.singleShotWaves.get(tag);
    if (!ctx) return;

    ctx.destroy();
    this.singleShotWaves.delete(tag);
  };

  public destroy(): void {
    this.isRunning = false;
    this.isPaused = true;
    this.pendingWavePromise = null;
    this.activeWave = null;

    GlobalEventBus.off('wave:spawn', this.handleOneShotSpawn);
    GlobalEventBus.off('wave:clear', this.handleOneShotClear);

    for (const ctx of this.singleShotWaves.values()) {
      ctx.destroy();
    }
    this.singleShotWaves.clear();
  }
}
