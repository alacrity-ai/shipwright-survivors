// src/game/player/PlayerPassiveManager.ts

import { PlayerMetaCurrencyManager } from './PlayerMetaCurrencyManager';

export type PassiveId =
  | 'harvester-range'
  | 'laser-damage'
  | 'laser-energy-drain'
  | 'laser-block-cost'
  | 'explosive-lance-radius'
  | 'explosive-lance-firing-rate'
  | 'block-durability'
  | 'fin-turn-power'
  | 'engine-thrust'
  | 'charger-rate'
  | 'battery-capacity'
  | 'turret-firing-rate'
  | 'turret-damage'
  | 'turret-accuracy'
  | 'shield-energy-drain'
  | 'shield-radius'
  | 'shield-efficiency'
  | 'facetplate-armor'
  | 'hull-armor'
  | 'hull-mass'
  | 'cockpit-armor'
  | 'block-repair-cost'
  | 'entropium-pickup-bonus'
  | 'block-drop-rate';

export type PassiveTier = 1 | 2 | 3;

interface SerializablePassiveData {
  passives: Record<PassiveId, PassiveTier>;
  passivePoints: number;
}

export class PlayerPassiveManager {
  private static instance: PlayerPassiveManager;
  private passives: Map<PassiveId, PassiveTier> = new Map();
  private passivePoints: number = 0; // Deprecated but retained for serialization

  private constructor() {}

  public static getInstance(): PlayerPassiveManager {
    if (!PlayerPassiveManager.instance) {
      PlayerPassiveManager.instance = new PlayerPassiveManager();
    }
    return PlayerPassiveManager.instance;
  }

  // === Point Management ===

  public addPassivePoints(amount: number): void {
    PlayerMetaCurrencyManager.getInstance().addMetaCurrency(amount);
  }

  public getAvailablePoints(): number {
    return PlayerMetaCurrencyManager.getInstance().getMetaCurrency();
  }

  public getUpgradeCost(nextTier: PassiveTier, currentTier: PassiveTier | null = null): number {
    const from = currentTier ?? 0;

    const tierCost = (tier: number): number => {
      switch (tier) {
        case 1: return 5;
        case 2: return 10;
        case 3: return 15;
        default: return 0;
      }
    };

    let total = 0;
    for (let t = from + 1; t <= nextTier; t++) {
      total += tierCost(t);
    }

    return total;
  }

  public canAfford(tier: PassiveTier): boolean {
    return PlayerMetaCurrencyManager.getInstance().canAfford(tier);
  }

  // === Passive Tier Assignment ===

  public setPassiveTier(id: PassiveId, tier: PassiveTier): boolean {
    const current = this.passives.get(id) ?? null;
    const cost = this.getUpgradeCost(tier, current);

    if (cost < 0) return false; // disallow downgrade
    if (!PlayerMetaCurrencyManager.getInstance().canAfford(cost)) return false;

    PlayerMetaCurrencyManager.getInstance().subtractMetaCurrency(cost);
    this.passives.set(id, tier);
    return true;
  }

  public getPassiveTier(id: PassiveId): PassiveTier | null {
    return this.passives.get(id) ?? null;
  }

  public hasPassive(id: PassiveId): boolean {
    return this.passives.has(id);
  }

  public getAllPassives(): Map<PassiveId, PassiveTier> {
    return new Map(this.passives);
  }

  public getTotalPassivesSpent(): number {
    let total = 0;
    for (const tier of this.passives.values()) {
      total += tier;
    }
    return total;
  }

  public hasAnyPassives(): boolean {
    return this.passives.size > 0;
  }

  // === Refund & Reset ===

  public refundAll(): void {
    let totalRefund = 0;
    for (const tier of this.passives.values()) {
      totalRefund += tier;
    }
    PlayerMetaCurrencyManager.getInstance().addMetaCurrency(totalRefund);
    this.passives.clear();
  }

  public clear(): void {
    this.passives.clear();
    this.passivePoints = 0; // preserved for legacy serialization
  }

  // === Serialization ===

  public toJSON(): string {
    const result: SerializablePassiveData = {
      passivePoints: this.passivePoints, // not used at runtime anymore
      passives: {} as Record<PassiveId, PassiveTier>,
    };
    for (const [id, tier] of this.passives.entries()) {
      result.passives[id] = tier;
    }
    return JSON.stringify(result);
  }

  public fromJSON(json: string): void {
    this.passives.clear();
    this.passivePoints = 0;

    try {
      const parsed: Partial<SerializablePassiveData> = JSON.parse(json);
      if (typeof parsed.passivePoints === 'number') {
        this.passivePoints = parsed.passivePoints; // ignored at runtime
      }

      if (parsed.passives && typeof parsed.passives === 'object') {
        for (const [id, tier] of Object.entries(parsed.passives)) {
          if (this.isValidPassiveId(id) && this.isValidTier(tier)) {
            this.passives.set(id as PassiveId, tier as PassiveTier);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse PlayerPassiveManager data:', e);
    }
  }

  private isValidPassiveId(id: string): id is PassiveId {
    return [
      'harvester-range',
      'laser-damage',
      'laser-energy-drain',
      'laser-block-cost',
      'explosive-lance-radius',
      'explosive-lance-firing-rate',
      'block-durability',
      'fin-turn-power',
      'engine-thrust',
      'charger-rate',
      'battery-capacity',
      'turret-firing-rate',
      'turret-damage',
      'turret-accuracy',
      'shield-energy-drain',
      'shield-radius',
      'shield-efficiency',
      'facetplate-armor',
      'hull-armor',
      'hull-mass',
      'cockpit-armor',
      'block-repair-cost',
      'entropium-pickup-bonus',
      'block-drop-rate',
    ].includes(id);
  }

  private isValidTier(tier: any): tier is PassiveTier {
    return tier === 1 || tier === 2 || tier === 3;
  }
}
