// src/core/interfaces/events/GlobalMenuReporter.ts

export class GlobalMenuReporter {
  private static instance: GlobalMenuReporter | null = null;

  private openMenus: Set<string> = new Set();
  private hoveredOverlays: Set<string> = new Set();

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
   * Returns true if any menu is currently open.
   */
  public isAnyMenuOpen(): boolean {
    return this.openMenus.size > 0;
  }

  /**
   * Mark the specified overlay tag as hovered.
   */
  public setOverlayHovered(tag: string): void {
    this.hoveredOverlays.add(tag);
  }

  /**
   * Mark the specified overlay tag as no longer hovered.
   */
  public setOverlayNotHovered(tag: string): void {
    this.hoveredOverlays.delete(tag);
  }

  /**
   * Returns true if the given overlay tag is currently hovered.
   */
  public isOverlayHovered(tag: string): boolean {
    return this.hoveredOverlays.has(tag);
  }

  /**
   * Returns true if any overlay is currently hovered.
   */
  public isAnyOverlayHovered(): boolean {
    return this.hoveredOverlays.size > 0;
  }

  /**
   * Clears all tracked menus and resets the singleton instance.
   */
  public destroy(): void {
    this.openMenus.clear();
    GlobalMenuReporter.instance = null;
  }
}
