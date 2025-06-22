// src/game/waves/orchestrator/WaveOrchestrator.ts

import type { IUpdatable } from '@/core/interfaces/types';
import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { WaveExecutor } from '@/game/waves/executor/WaveExecutor';
import type { WaveExecutionContext } from '@/game/waves/WaveExecutionContext';
import type { Ship } from '@/game/ship/Ship';

export class WaveOrchestrator implements IUpdatable {
  private currentWaveIndex = 0;
  private elapsedTime = 0;
  private timeSinceStart = 0;

  private readonly initialDelay = 10;
  private readonly defaultWaveInterval = 120;
  private readonly interWaveDelay = 10;

  private waitingToSpawnNextWave = false;
  private interWaveCountdown = -1;

  private hasSpawnedFirstWave = false;
  private isRunning = false;
  private isPaused = false;

  private activeWave: WaveExecutionContext | null = null;
  private readonly waves: WaveDefinition[];

  public constructor(
    waves: WaveDefinition[],
    private readonly executor: WaveExecutor,
    private readonly onMissionComplete: () => void
  ) {
    this.waves = waves;
  }

  public start(): void {
    this.isRunning = true;
    this.timeSinceStart = 0;
    this.currentWaveIndex = 0;
  }

  public update(dt: number): void {
    if (!this.isRunning || this.isPaused) return;

    if (!this.hasSpawnedFirstWave) {
      this.timeSinceStart += dt;
      if (this.timeSinceStart >= this.initialDelay) {
        this.spawnWave();
        this.hasSpawnedFirstWave = true;
      }
      return;
    }

    if (this.waitingToSpawnNextWave) {
      this.interWaveCountdown -= dt;
      if (this.interWaveCountdown <= 0) {
        this.waitingToSpawnNextWave = false;
        this.spawnWave();
      }
      return;
    }

    if (this.activeWave?.isBoss() && !this.activeWave.isComplete()) return;

    if (this.shouldCompleteMission()) {
      this.onMissionComplete();
      this.isRunning = false;
      return;
    }

    this.elapsedTime += dt;
    const currentDef = this.waves[this.currentWaveIndex - 1];
    const duration = currentDef?.duration ?? this.defaultWaveInterval;
    if (this.elapsedTime >= duration) {
      this.spawnWave();
    }
  }

  private spawnWave(): void {
    if (this.currentWaveIndex >= this.waves.length) return;

    const def = this.waves[this.currentWaveIndex++];
    this.activeWave = this.executor.execute(def, this.currentWaveIndex - 1);
    this.elapsedTime = 0;

    if (def.type === 'boss' && this.currentWaveIndex < this.waves.length) {
      this.waitingToSpawnNextWave = true;
      this.interWaveCountdown = this.interWaveDelay;
    }
  }

  private shouldCompleteMission(): boolean {
    return (
      this.currentWaveIndex >= this.waves.length &&
      (this.activeWave?.isComplete() ?? true) &&
      !this.waitingToSpawnNextWave
    );
  }

  public getCurrentWaveNumber(): number {
    return this.currentWaveIndex;
  }

  public getTimeUntilNextWave(): number {
    if (!this.isRunning || this.isPaused) return -1;

    if (this.waitingToSpawnNextWave) {
      return Math.ceil(this.interWaveCountdown);
    }

    if (!this.hasSpawnedFirstWave) {
      return Math.ceil(this.initialDelay - this.timeSinceStart);
    }

    const currentDef = this.waves[Math.max(0, this.currentWaveIndex - 1)];
    const interval = currentDef?.duration ?? this.defaultWaveInterval;
    return Math.max(0, interval - this.elapsedTime);
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public isBossWaveActive(): boolean {
    return this.activeWave?.isBoss() && !this.activeWave.isComplete();
  }

  public notifyShipDestroyed(ship: Ship): void {
    this.activeWave?.notifyShipDestroyed(ship);
  }
}
