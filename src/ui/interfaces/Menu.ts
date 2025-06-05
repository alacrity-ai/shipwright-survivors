// src/ui/interfaces/Menu.ts

export interface Menu {
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  isBlocking(): boolean;

  // Add these lifecycle methods
  isOpen(): boolean;
  openMenu(): void;
  closeMenu(): void;
}
