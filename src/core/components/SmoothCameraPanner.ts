// src/core/camera/SmoothCameraPanner.ts

import { Camera } from '@/core/Camera';

/**
 * SmoothCameraPanner controls interpolated camera translation
 * toward arbitrary world-space coordinates. It does not override
 * camera.x/y directly, but sets the camera's target offset each frame.
 */
export class SmoothCameraPanner {
  private readonly camera: Camera;

  private targetX: number = 0;
  private targetY: number = 0;

  private isPanning: boolean = false;
  private readonly deadZone: number = 0.5;

  // Interpolation speed in world units per second
  private speed: number = 6.0;

  constructor(camera: Camera) {
    this.camera = camera;

    const { x, y } = this.getCameraCenter();
    this.targetX = x;
    this.targetY = y;
  }

  /**
   * Call this every frame with the elapsed time to apply smooth movement.
   */
  public update(dt: number): void {
    if (!this.isPanning) return;

    const center = this.getCameraCenter();
    const dx = this.targetX - center.x;
    const dy = this.targetY - center.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < this.deadZone * this.deadZone) {
      this.isPanning = false;
      return;
    }

    const distance = Math.sqrt(distSq);
    const t = Math.min(1, (this.speed * dt) / distance); // capped at 1 to prevent overshoot

    const newX = center.x + dx * t;
    const newY = center.y + dy * t;

    this.setCameraCenter(newX, newY);
  }

  /**
   * Initiates a smooth pan toward the specified world position.
   * The camera will center itself over (x, y) gradually.
   */
  public panTo(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
    this.isPanning = true;
  }

  /**
   * Immediately snaps the camera to a position and aborts any pan.
   */
  public jumpTo(x: number, y: number): void {
    this.setCameraCenter(x, y);
    this.targetX = x;
    this.targetY = y;
    this.isPanning = false;
  }

  /**
   * Updates the interpolation speed in world units per second.
   */
  public setSpeed(unitsPerSecond: number): void {
    this.speed = unitsPerSecond;
  }

  /**
   * Returns whether the camera is currently interpolating.
   */
  public isMoving(): boolean {
    return this.isPanning;
  }

  private getCameraCenter(): { x: number; y: number } {
    return this.camera.getPosition();
  }

  private setCameraCenter(x: number, y: number): void {
    const halfW = this.camera.getViewportWidth() / 2 / this.camera.getZoom();
    const halfH = this.camera.getViewportHeight() / 2 / this.camera.getZoom();
    this.camera.setTarget(x - halfW, y - halfH);
  }
}
