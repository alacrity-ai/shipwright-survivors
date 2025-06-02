// src/game/missions/MissionResultStore.ts

export interface MissionResultData {
  outcome: 'victory' | 'defeat';
  enemiesDestroyed: number;
  currencyGathered: number;
  blocksUnlocked: string[];
  blockPlacedCount: number;
  passivePointsEarned: number;
  bonusObjectives?: string[];
  timeTakenSeconds?: number;
}

class MissionResultStore {
  private result: MissionResultData | null = null;

  public initialize(): void {
    this.result = {
      outcome: 'victory', // default placeholder, will be finalized
      enemiesDestroyed: 0,
      currencyGathered: 0,
      blocksUnlocked: [],
      blockPlacedCount: 0,
      passivePointsEarned: 0,
      bonusObjectives: [],
      timeTakenSeconds: 0
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

  public addCurrency(amount: number) {
    this.ensureInitialized();
    this.result!.currencyGathered += amount;
  }

  public incrementKillCount(by = 1) {
    this.ensureInitialized();
    this.result!.enemiesDestroyed += by;
  }

  public incrementBlockPlacedCount(by = 1) {
    this.ensureInitialized();
    this.result!.blockPlacedCount += by;
  }

  public addBlockUnlock(blockId: string) {
    this.ensureInitialized();
    const blocks = this.result!.blocksUnlocked;
    if (!blocks.includes(blockId)) {
      blocks.push(blockId);
    }
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
