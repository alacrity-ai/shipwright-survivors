// src/ui/interfaces/Menu.ts

export interface Menu {
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  isBlocking(): boolean; // Should block game updates?
}
