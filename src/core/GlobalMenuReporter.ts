// src/core/interfaces/events/GlobalMenuReporter.ts

export class GlobalMenuReporter {
  private static instance: GlobalMenuReporter | null = null;

  private openMenus: Set<string> = new Set();
  private hoveredOverlays: Set<string> = new Set();
  private specialBlockers: Set<string> = new Set();

  // Track delayed removal timers to avoid redundant timeouts
  private pendingMenuRemovalTimers: Map<string, number> = new Map();
  private pendingOverlayRemovalTimers: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): GlobalMenuReporter {
    if (!GlobalMenuReporter.instance) {
      GlobalMenuReporter.instance = new GlobalMenuReporter();
    }
    return GlobalMenuReporter.instance;
  }

  // === Special Blockers ===
  public setSpecialBlocker(tag: string): void {
    this.specialBlockers.add(tag);
  }

  public clearSpecialBlocker(tag: string): void {
    this.specialBlockers.delete(tag);
  }

  public hasSpecialBlocker(tag: string): boolean {
    return this.specialBlockers.has(tag);
  }

  public isSpecialBlocked(): boolean {
    return this.specialBlockers.size > 0;
  }

  // === Menu Open / Close ===
  public setMenuOpen(tag: string): void {
    this.openMenus.add(tag);

    // Cancel pending removal if it exists
    const timer = this.pendingMenuRemovalTimers.get(tag);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.pendingMenuRemovalTimers.delete(tag);
    }
  }

  public setMenuClosed(tag: string): void {
    // Debounce: if already pending, do nothing
    if (this.pendingMenuRemovalTimers.has(tag)) return;

    const timer = window.setTimeout(() => {
      this.openMenus.delete(tag);
      this.pendingMenuRemovalTimers.delete(tag);
    }, 100);

    this.pendingMenuRemovalTimers.set(tag, timer);
  }

  public isMenuOpen(tag: string): boolean {
    return this.openMenus.has(tag);
  }

  public isAnyMenuOpen(): boolean {
    return this.openMenus.size > 0;
  }

  // === Overlay Hover Tracking ===
  public setOverlayHovered(tag: string): void {
    this.hoveredOverlays.add(tag);

    // Cancel pending removal if it exists
    const timer = this.pendingOverlayRemovalTimers.get(tag);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.pendingOverlayRemovalTimers.delete(tag);
    }
  }

  public setOverlayNotHovered(tag: string): void {
    // Debounce: if already pending, do nothing
    if (this.pendingOverlayRemovalTimers.has(tag)) return;

    const timer = window.setTimeout(() => {
      this.hoveredOverlays.delete(tag);
      this.pendingOverlayRemovalTimers.delete(tag);
    }, 100);

    this.pendingOverlayRemovalTimers.set(tag, timer);
  }

  public isOverlayHovered(tag: string): boolean {
    return this.hoveredOverlays.has(tag);
  }

  public isAnyOverlayHovered(): boolean {
    return this.hoveredOverlays.size > 0;
  }

  public destroy(): void {
    this.openMenus.clear();
    this.hoveredOverlays.clear();
    this.specialBlockers.clear();

    this.pendingMenuRemovalTimers.forEach(clearTimeout);
    this.pendingOverlayRemovalTimers.forEach(clearTimeout);
    this.pendingMenuRemovalTimers.clear();
    this.pendingOverlayRemovalTimers.clear();

    GlobalMenuReporter.instance = null;
  }
}
