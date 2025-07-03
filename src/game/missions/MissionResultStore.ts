// src/game/missions/MissionResultStore.ts

import { GlobalEventBus } from '@/core/EventBus';

export interface MissionResultData {
  outcome: 'victory' | 'defeat';
  enemiesDestroyed: number;
  entropiumGathered: number;
  blocksUnlocked: string[];
  blockPlacedCount: number;
  passivePointsEarned: number;
  bonusObjectives?: string[];
  timeTakenSeconds?: number;
  blocksLost: number;
  blockRefinedCount: number;
  blocksCollected: number;
  wavesCleared: number;
  totalWaves: number;
  incidentsCompleted: number;
  massAchieved: number;
  shipsDiscovered: string[];
}

class MissionResultStore {
  private result: MissionResultData | null = null;

  public initialize(): void {
    this.result = {
      outcome: 'victory', // default placeholder, will be finalized
      enemiesDestroyed: 0,
      entropiumGathered: 0,
      blocksUnlocked: [],
      blockPlacedCount: 0,
      passivePointsEarned: 0,
      bonusObjectives: [],
      timeTakenSeconds: 0,
      blocksLost: 0,
      blockRefinedCount: 0,
      blocksCollected: 0,
      wavesCleared: 0,
      totalWaves: 0,
      incidentsCompleted: 0,
      massAchieved: 0,
      shipsDiscovered: [],
    };
  }

  public finalize(outcome: 'victory' | 'defeat', elapsedSeconds: number): void {
    this.ensureInitialized();
    this.result!.outcome = outcome;
    this.result!.timeTakenSeconds = Math.round(elapsedSeconds);
  }

  public setOutcome(outcome: 'victory' | 'defeat') {
    this.ensureInitialized();
    this.result!.outcome = outcome;
  }

  public addEntropium(amount: number) {
    this.ensureInitialized();
    this.result!.entropiumGathered += amount;
  }

  public incrementKillCount(by = 1) {
    this.ensureInitialized();

    // Camera shake
    // TODO:
    // Putting this here for now, as enemies keep shaking the screen when they kill asteroids
    GlobalEventBus.emit('camera:shake', {
      strength: 10,
      duration: 0.2,
      frequency: 15,
    });

    this.result!.enemiesDestroyed += by;
  }

  public incrementBlockCollectedCount(by = 1) {
    this.ensureInitialized();
    this.result!.blocksCollected += by;
  }

  public incrementWavesCleared(by = 1) {
    this.ensureInitialized();
    this.result!.wavesCleared += by;
  }

  public setTotalWaves(total = 1) {
    this.ensureInitialized();
    this.result!.totalWaves = total;
  }

  public incrementIncidentsCompleted(by = 1) {
    this.ensureInitialized();
    this.result!.incidentsCompleted += by;
  }

  public addShipDiscovery(shipName: string) {
    this.ensureInitialized();
    this.result!.shipsDiscovered.push(shipName);
  }

  public incrementMassAchieved(totalMass: number) {
    // If mass passed in is higher than the current mass achieved, update it, otherwise do nothing
    this.ensureInitialized();
    if (totalMass > this.result!.massAchieved) {
      this.result!.massAchieved = totalMass;
    }
  }

  public incrementBlockPlacedCount(by = 1) {
    this.ensureInitialized();
    this.result!.blockPlacedCount += by;
  }

  public incrementBlockRefinedCount(by = 1) {
    this.ensureInitialized();
    this.result!.blockRefinedCount += by;
  }

  public addBlockPickup(blockId: string) {
    this.ensureInitialized();
    const blocks = this.result!.blocksUnlocked;
    if (!blocks.includes(blockId)) {
      blocks.push(blockId);
    }
  }

  public incrementBlocksLost(by = 1) {
    this.ensureInitialized();
    this.result!.blocksLost += by;
  }

  public getBlocksLost(): number {
    this.ensureInitialized();
    return this.result!.blocksLost;
  }

  public addBonusObjective(description: string) {
    this.ensureInitialized();
    this.result!.bonusObjectives!.push(description);
  }

  public setPassivePoints(points: number) {
    this.ensureInitialized();
    this.result!.passivePointsEarned = points;
  }

  public get(): MissionResultData {
    this.ensureInitialized();
    return this.result!;
  }

  public clear(): void {
    this.result = null;
  }

  public hasResult(): boolean {
    return this.result !== null;
  }

  private ensureInitialized() {
    if (!this.result) {
      throw new Error('MissionResultStore accessed before initialize()');
    }
  }
}

export const missionResultStore = new MissionResultStore();
