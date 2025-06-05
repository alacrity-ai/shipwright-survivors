// src/game/player/PlayerPassiveManager.ts

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
  private passivePoints: number = 0;

  private constructor() {}

  public static getInstance(): PlayerPassiveManager {
    if (!PlayerPassiveManager.instance) {
      PlayerPassiveManager.instance = new PlayerPassiveManager();
    }
    return PlayerPassiveManager.instance;
  }

  // === Point Management ===

  public addPassivePoints(amount: number): void {
    this.passivePoints += amount;
  }

  public getAvailablePoints(): number {
    return this.passivePoints;
  }

  public canAfford(tier: PassiveTier): boolean {
    return this.passivePoints >= tier;
  }

  // === Passive Tier Assignment ===

  public setPassiveTier(id: PassiveId, tier: PassiveTier): boolean {
    const current = this.passives.get(id) ?? 0;
    const cost = tier - current;

    if (cost < 0) return false; // disallow downgrade
    if (this.passivePoints < cost) return false;

    this.passivePoints -= cost;
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

  // === Refund & Reset ===

  public refundAll(): void {
    for (const tier of this.passives.values()) {
      this.passivePoints += tier;
    }
    this.passives.clear();
  }

  public clear(): void {
    this.passives.clear();
    this.passivePoints = 0;
  }

  // === Serialization ===

  public toJSON(): string {
    const result: SerializablePassiveData = {
      passivePoints: this.passivePoints,
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
        this.passivePoints = parsed.passivePoints;
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
