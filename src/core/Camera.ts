// src/core/Camera.ts

export class Camera {
  public x = 0;
  public y = 0;
  public zoom = 0.3;

  private targetX = 0;
  private targetY = 0;

  private skipSmoothingThisFrame = false;

  private readonly deadZoneRadius = 4;

  constructor(
    private readonly viewportWidth: number,
    private readonly viewportHeight: number
  ) {}

  /** Smooth update toward target, or snap if zooming occurred */
  update(dt: number): void {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distSq = dx * dx + dy * dy;

    if (this.skipSmoothingThisFrame) {
      this.x = this.targetX;
      this.y = this.targetY;
    } else if (distSq > this.deadZoneRadius * this.deadZoneRadius) {
      const smoothingFactor = 0.05;
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

      this.x = lerp(this.x, this.targetX, smoothingFactor);
      this.y = lerp(this.y, this.targetY, smoothingFactor);
    }

    this.skipSmoothingThisFrame = false;
  }

  follow(position: { x: number; y: number }): void {
    this.targetX = position.x - (this.viewportWidth / 2) / this.zoom;
    this.targetY = position.y - (this.viewportHeight / 2) / this.zoom;
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

  adjustZoom(delta: number): void {
    const baseFactor = 1.05;
    const scrollSteps = Math.max(-1, Math.min(1, delta));

    const centerWorldBefore = this.screenToWorld(this.viewportWidth / 2, this.viewportHeight / 2);

    const newZoom =
      scrollSteps > 0
        ? this.zoom * Math.pow(baseFactor, scrollSteps)
        : this.zoom / Math.pow(baseFactor, -scrollSteps);

    this.zoom = Math.min(1, Math.max(0.2, newZoom));

    const centerWorldAfter = this.screenToWorld(this.viewportWidth / 2, this.viewportHeight / 2);

    const dx = centerWorldBefore.x - centerWorldAfter.x;
    const dy = centerWorldBefore.y - centerWorldAfter.y;

    this.x += dx;
    this.y += dy;
    this.targetX += dx;
    this.targetY += dy;

    this.skipSmoothingThisFrame = true;
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
