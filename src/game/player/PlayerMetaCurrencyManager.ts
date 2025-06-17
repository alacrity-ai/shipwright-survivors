// src/game/player/PlayerMetaCurrencyManager.ts

export class PlayerMetaCurrencyManager {
  private static instance: PlayerMetaCurrencyManager;

  private metaCurrency: number = 0;

  private constructor() {}

  public static getInstance(): PlayerMetaCurrencyManager {
    if (!PlayerMetaCurrencyManager.instance) {
      PlayerMetaCurrencyManager.instance = new PlayerMetaCurrencyManager();
    }
    return PlayerMetaCurrencyManager.instance;
  }

  // === Getters & Setters ===

  public getMetaCurrency(): number {
    return this.metaCurrency;
  }

  public setMetaCurrency(value: number): void {
    this.metaCurrency = Math.max(0, Math.floor(value));
  }

  public addMetaCurrency(amount: number): void {
    this.metaCurrency = Math.max(0, this.metaCurrency + Math.floor(amount));
  }

  public subtractMetaCurrency(amount: number): boolean {
    const value = Math.floor(amount);
    if (this.metaCurrency < value) return false;
    this.metaCurrency -= value;
    return true;
  }

  public canAfford(amount: number): boolean {
    return this.metaCurrency >= Math.floor(amount);
  }

  // === Serialization ===

  public toJSON(): string {
    return JSON.stringify({
      metaCurrency: this.metaCurrency,
    });
  }

  public fromJSON(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed === 'object' && parsed !== null && typeof parsed.metaCurrency === 'number') {
        this.setMetaCurrency(parsed.metaCurrency);
      }
    } catch (e) {
      console.warn('Failed to parse PlayerMetaCurrencyManager data:', e);
    }
  }

  public reset(): void {
    this.metaCurrency = 0;
  }
}
