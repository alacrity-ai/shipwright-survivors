// src/ui/MenuManager.ts

import type { Menu } from '@/ui/interfaces/Menu';

export class MenuManager {
  private static instance: MenuManager;

  private readonly stack: Menu[] = [];
  private readonly registry: Record<string, Menu> = {};

  private pauseFn?: () => void;
  private resumeFn?: () => void;

  private constructor() {}

  /** Singleton accessor */
  public static getInstance(): MenuManager {
    if (!MenuManager.instance) {
      MenuManager.instance = new MenuManager();
    }
    return MenuManager.instance;
  }

  /** Clears all menu state and registered entries */
  public reset(): void {
    this.clearAll();
    for (const key in this.registry) {
      delete this.registry[key];
    }
    this.pauseFn = undefined;
    this.resumeFn = undefined;
  }

  /** Registers callbacks for pausing and resuming the game */
  registerPauseHandlers(pause: () => void, resume: () => void): void {
    this.pauseFn = pause;
    this.resumeFn = resume;
  }

  pause(): void {
    this.pauseFn?.();
  }

  resume(): void {
    this.resumeFn?.();
  }

  open(menu: Menu): void {
    const top = this.getTop();
    if (top === menu) return;

    if (!this.stack.includes(menu)) {
      this.stack.push(menu);
    }

    menu.openMenu();
  }

  close(menu: Menu): void {
    const idx = this.stack.indexOf(menu);
    if (idx !== -1) {
      this.stack.splice(idx, 1);
      menu.closeMenu();
    }
  }

  transition(to: Menu): void {
    this.pop();
    this.open(to);
  }

  pop(): void {
    const popped = this.stack.pop();
    popped?.closeMenu();
  }

  getTop(): Menu | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  anyOpen(): boolean {
    return this.stack.length > 0;
  }

  clearAll(): void {
    while (this.stack.length > 0) {
      this.stack.pop()?.closeMenu();
    }
  }

  registerMenu(key: string, menu: Menu): void {
    this.registry[key] = menu;
  }

  getMenu(key: string): Menu | undefined {
    return this.registry[key];
  }
}
