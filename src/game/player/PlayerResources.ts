// src/game/player/PlayerResources.ts

/**
 * Manages player resources like currency, materials, etc.
 * Implemented as a singleton for global access.
 */
export class PlayerResources {
  private static instance: PlayerResources;
  
  // Current resources
  private currency: number = 0;
  
  // Resource change callbacks
  private onCurrencyChangeCallbacks: ((newValue: number) => void)[] = [];
  
  private constructor() {
    // Private constructor to enforce singleton pattern
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): PlayerResources {
    if (!PlayerResources.instance) {
      PlayerResources.instance = new PlayerResources();
    }
    return PlayerResources.instance;
  }
  
  /**
   * Initialize player resources with starting values
   */
  public initialize(startingCurrency: number = 0): void {
    this.currency = startingCurrency;
  }
  
  /**
   * Get current currency amount
   */
  public getCurrency(): number {
    return this.currency;
  }
  
  public hasEnoughCurrency(amount: number): boolean {
    return this.currency >= amount;
  }

  /**
   * Add currency to player resources
   * @param amount Amount to add (positive value)
   * @returns New currency total
   */
  public addCurrency(amount: number): number {
    if (amount <= 0) return this.currency;
    
    this.currency += amount;
    this.notifyCurrencyChange();
    return this.currency;
  }
  
  /**
   * Remove currency from player resources
   * @param amount Amount to remove (positive value)
   * @returns true if successful, false if insufficient funds
   */
  public spendCurrency(amount: number): boolean {
    if (amount <= 0) return true;
    if (this.currency < amount) return false;
    
    this.currency -= amount;
    this.notifyCurrencyChange();
    return true;
  }
  
  /**
   * Register a callback for currency changes
   */
  public onCurrencyChange(callback: (newValue: number) => void): void {
    this.onCurrencyChangeCallbacks.push(callback);
  }
  
  /**
   * Notify all listeners about currency change
   */
  private notifyCurrencyChange(): void {
    for (const callback of this.onCurrencyChangeCallbacks) {
      callback(this.currency);
    }
  }
  
  /**
   * Reset all resources to default values
   */
  public reset(): void {
    this.currency = 0;
    this.notifyCurrencyChange();
  }
}