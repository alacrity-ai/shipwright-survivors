// src/game/waves/orchestrator/WaveOrchestrator.ts

import type { IUpdatable } from '@/core/interfaces/types';
import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { WaveExecutor } from '@/game/waves/executor/WaveExecutor';
import type { WaveExecutionContext } from './WaveExecutionContext';
import type { Ship } from '@/game/ship/Ship';

import { missionResultStore } from '@/game/missions/MissionResultStore';

export class WaveOrchestrator implements IUpdatable {
  private readonly waves: WaveDefinition[];

  private currentWaveIndex = 0;
  private hasSpawnedFirstWave = false;

  private timeSinceStart = 0;
  private elapsedTime = 0;

  private readonly initialDelay = 10;
  private readonly defaultWaveInterval = 120;

  private isRunning = false;
  private isPaused = false;

  private activeWave: WaveExecutionContext | null = null;

  private pendingWavePromise: Promise<void> | null = null;

  public constructor(
    waves: WaveDefinition[],
    private readonly executor: WaveExecutor
  ) {
    this.waves = waves;
  }

  public start(): void {
    this.isRunning = true;
    this.currentWaveIndex = 0;
    this.timeSinceStart = 0;
    this.elapsedTime = 0;
    this.hasSpawnedFirstWave = false;
    this.activeWave = null;
    this.pendingWavePromise = null;
  }

  public update(dt: number): void {
    if (!this.isRunning || this.isPaused) return;

    // If we're currently waiting on async wave spawn, defer updates
    if (this.pendingWavePromise) return;

    if (!this.hasSpawnedFirstWave) {
      this.timeSinceStart += dt;
      if (this.timeSinceStart >= this.initialDelay) {
        this.pendingWavePromise = this.spawnNextWave().then(() => {
          this.pendingWavePromise = null;
          this.hasSpawnedFirstWave = true;
        });
      }
      return;
    }

    if (this.currentWaveIndex >= this.waves.length) return;

    const currentWaveDef = this.waves[this.currentWaveIndex - 1];
    const interval = currentWaveDef.duration ?? this.defaultWaveInterval;

    if (interval !== Infinity) {
      this.elapsedTime += dt;
      if (this.elapsedTime >= interval) {
        this.pendingWavePromise = this.spawnNextWave().then(() => {
          this.pendingWavePromise = null;
        });
      }
    }
  }

  private async spawnNextWave(): Promise<void> {
    if (this.currentWaveIndex >= this.waves.length) return;

    missionResultStore.incrementWavesCleared();

    const def = this.waves[this.currentWaveIndex++];
    this.activeWave = await this.executor.execute(def, this.currentWaveIndex - 1);
    this.elapsedTime = 0;
  }

  public getCurrentWaveNumber(): number {
    return this.currentWaveIndex;
  }

  public getTimeUntilNextWave(): number {
    if (!this.isRunning || this.isPaused || this.pendingWavePromise) return -1;

    if (!this.hasSpawnedFirstWave) {
      return Math.ceil(this.initialDelay - this.timeSinceStart);
    }

    const def = this.waves[Math.max(0, this.currentWaveIndex - 1)];
    const interval = def?.duration ?? this.defaultWaveInterval;
    if (interval === Infinity) return -1;

    return Math.max(0, interval - this.elapsedTime);
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

  public notifyShipDestroyed(ship: Ship): void {
    this.activeWave?.notifyShipDestroyed(ship);
  }

  public isBossWaveActive(): boolean {
    return !!this.activeWave?.getWave().isBoss;
  }

  public skipToNextWave(): void {
    if (!this.isRunning || this.isPaused) return;
    if (this.pendingWavePromise) return;
    if (this.currentWaveIndex >= this.waves.length) return;

    this.pendingWavePromise = this.spawnNextWave().then(() => {
      this.pendingWavePromise = null;
      this.hasSpawnedFirstWave = true; // In case skip was called before first wave
    });
  }

  public destroy(): void {
    this.isRunning = false;
    this.isPaused = true;
    this.pendingWavePromise = null;
    this.activeWave = null;
  }
}
