// src/core/Camera.ts

import { getUniformScaleFactor } from '@/config/view';
import type { CanvasManager } from '@/core/CanvasManager';

export class Camera {
  private static _instance: Camera | null = null;

  public static getInstance(viewportWidth?: number, viewportHeight?: number): Camera {
    if (!Camera._instance) {
      if (viewportWidth == null || viewportHeight == null) {
        throw new Error('[Camera] Must supply viewport dimensions on first initialization');
      }
      Camera._instance = new Camera(viewportWidth, viewportHeight);
    }
    return Camera._instance;
  }

  private x = 0;
  private y = 0;
  private zoom = 0.3;

  private targetX = 0;
  private targetY = 0;

  private skipSmoothingThisFrame = false;
  private readonly deadZoneRadius = 12;

  private viewportWidth: number;
  private viewportHeight: number;

  private constructor(viewportWidth: number, viewportHeight: number) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
  }

  update(dt: number): void {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distSq = dx * dx + dy * dy;

    if (this.skipSmoothingThisFrame) {
      this.x = this.targetX;
      this.y = this.targetY;
    } else if (distSq > this.deadZoneRadius * this.deadZoneRadius) {
      const smoothingFactor = 1.05;
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

  getPosition(): { x: number; y: number } {
    return {
      x: this.x + (this.viewportWidth / 2) / this.zoom,
      y: this.y + (this.viewportHeight / 2) / this.zoom,
    };
  }

  adjustZoom(delta: number): void {
    const baseFactor = 1.08;
    const scrollSteps = Math.max(-1, Math.min(1, delta));

    const centerWorldBefore = this.screenToWorld(this.viewportWidth / 2, this.viewportHeight / 2);

    const newZoom =
      scrollSteps > 0
        ? this.zoom * Math.pow(baseFactor, scrollSteps)
        : this.zoom / Math.pow(baseFactor, -scrollSteps);

    const uiScale = getUniformScaleFactor();
    const scaledMinZoom = 0.15 * uiScale;
    const scaledMaxZoom = 0.5 * uiScale;
    this.zoom = Math.min(scaledMaxZoom, Math.max(scaledMinZoom, newZoom));

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

  getViewBounds(canvasManager: CanvasManager): { left: number; right: number; top: number; bottom: number } {
    const canvas = canvasManager.getCanvas('entitygl');
    const width = canvas.width / this.zoom;
    const height = canvas.height / this.zoom;

    return {
      left: this.x,
      right: this.x + width,
      bottom: this.y + height,
      top: this.y,
    };
  }

  getViewportWidth(): number {
    return this.viewportWidth;
  }

  getViewportHeight(): number {
    return this.viewportHeight;
  }

  resize(newWidth: number, newHeight: number): void {
    this.viewportWidth = newWidth;
    this.viewportHeight = newHeight;
  }

  public static destroy(): void {
    if (Camera._instance) {
      Camera._instance.cleanup();
      Camera._instance = null;
    }
  }

  private cleanup(): void {
    // Wipe all internal state if needed (not strictly necessary here)
    this.x = 0;
    this.y = 0;
    this.zoom = 0.3;
    this.targetX = 0;
    this.targetY = 0;
    this.skipSmoothingThisFrame = false;
    this.viewportWidth = 0;
    this.viewportHeight = 0;
  }
}
