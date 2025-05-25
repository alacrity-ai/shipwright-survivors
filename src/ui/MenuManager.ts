// src/ui/MenuManager.ts

import type { Menu } from '@/ui/interfaces/Menu';

export class MenuManager {
  private currentMenu: Menu | null = null;

  open(menu: Menu) {
    this.currentMenu = menu;
  }

  close() {
    this.currentMenu = null;
  }

  isBlocking(): boolean {
    return this.currentMenu?.isBlocking() ?? false;
  }

  update(dt: number) {
    this.currentMenu?.update(dt);
  }

  render(ctx: CanvasRenderingContext2D) {
    this.currentMenu?.render(ctx);
  }

  isMenuOpen(): boolean {
    return !!this.currentMenu;
  }

  getCurrentMenu(): Menu | null {
    return this.currentMenu;
  }
}
