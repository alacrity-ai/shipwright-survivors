export class PlayerResources {
  private static instance: PlayerResources;
  
  private currency: number = 0;

  private onCurrencyChangeCallbacks: Set<(newValue: number) => void> = new Set();

  private constructor() {}

  public static getInstance(): PlayerResources {
    if (!PlayerResources.instance) {
      PlayerResources.instance = new PlayerResources();
    }
    return PlayerResources.instance;
  }

  public initialize(startingCurrency: number = 0): void {
    this.currency = startingCurrency;
  }

  public getCurrency(): number {
    return this.currency;
  }

  public hasEnoughCurrency(amount: number): boolean {
    return this.currency >= amount;
  }

  public addCurrency(amount: number): number {
    if (amount <= 0) return this.currency;

    this.currency += amount;
    this.notifyCurrencyChange();
    return this.currency;
  }

  public spendCurrency(amount: number): boolean {
    if (amount <= 0) return true;
    if (this.currency < amount) return false;

    this.currency -= amount;
    this.notifyCurrencyChange();
    return true;
  }

  /**
   * Register a callback for currency changes.
   * Returns a disposer to unsubscribe the callback.
   */
  public onCurrencyChange(callback: (newValue: number) => void): () => void {
    this.onCurrencyChangeCallbacks.add(callback);

    return () => {
      this.onCurrencyChangeCallbacks.delete(callback);
    };
  }

  private notifyCurrencyChange(): void {
    for (const callback of this.onCurrencyChangeCallbacks) {
      callback(this.currency);
    }
  }

  public reset(): void {
    this.currency = 0;
    this.notifyCurrencyChange();
  }

  public destroy(): void {
    this.currency = 0;
    this.onCurrencyChangeCallbacks.clear();
  }
}
