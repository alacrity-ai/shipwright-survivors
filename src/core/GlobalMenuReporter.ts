// src/core/interfaces/events/GlobalMenuReporter.ts

export class GlobalMenuReporter {
  private static instance: GlobalMenuReporter | null = null;

  private openMenus: Set<string> = new Set();

  private constructor() {
    // Singleton: disallow external instantiation
  }

  public static getInstance(): GlobalMenuReporter {
    if (!GlobalMenuReporter.instance) {
      GlobalMenuReporter.instance = new GlobalMenuReporter();
    }
    return GlobalMenuReporter.instance;
  }

  /**
   * Mark the specified menu tag as open.
   */
  public setMenuOpen(tag: string): void {
    this.openMenus.add(tag);
  }

  /**
   * Mark the specified menu tag as closed.
   */
  public setMenuClosed(tag: string): void {
    this.openMenus.delete(tag);
  }

  /**
   * Returns true if the given menu tag is currently open.
   */
  public isMenuOpen(tag: string): boolean {
    return this.openMenus.has(tag);
  }

  /**
   * Clears all tracked menus and resets the singleton instance.
   */
  public destroy(): void {
    this.openMenus.clear();
    GlobalMenuReporter.instance = null;
  }
}
