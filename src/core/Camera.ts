// src/core/Camera.ts

export class Camera {
  public x = 0;
  public y = 0;
  public zoom = 0.4; // 1.0 = 100%

  constructor(
    private readonly viewportWidth: number,
    private readonly viewportHeight: number
  ) {}

  follow(position: { x: number; y: number }) {
    this.x = position.x - (this.viewportWidth / 2) / this.zoom;
    this.y = position.y - (this.viewportHeight / 2) / this.zoom;
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: (wx - this.x) * this.zoom,
      y: (wy - this.y) * this.zoom,
    };
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: sx / this.zoom + this.x,
      y: sy / this.zoom + this.y,
    };
  }

  getOffset(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  adjustZoom(delta: number) {
    const scrollSensitivity = 0.05; // change per 100 units of wheel delta
    const clamped = Math.max(-200, Math.min(200, delta));
    const zoomChange = -clamped * scrollSensitivity * 0.01;

    this.zoom += zoomChange;
    this.zoom = Math.min(1.2, Math.max(0.14, this.zoom));
  }

  getZoom(): number {
    return this.zoom;
  }

  getViewportBounds(): { x: number; y: number; width: number; height: number } {
    const width = this.viewportWidth / this.zoom;
    const height = this.viewportHeight / this.zoom;
    return {
      x: this.x,
      y: this.y,
      width,
      height,
    };
  }
}
