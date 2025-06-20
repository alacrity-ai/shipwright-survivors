// src/core/Camera.ts

import { getUniformScaleFactor } from '@/config/view';
import { ScreenShakeController } from '@/core/components/ScreenShakeController';

import { GlobalEventBus } from './EventBus';
import type { EventTypes } from './interfaces/EventTypes';

import type { CanvasManager } from '@/core/CanvasManager';

export class Camera {
  private static _instance: Camera | null = null;
  private readonly screenShake = new ScreenShakeController();

  public static getInstance(viewportWidth?: number, viewportHeight?: number): Camera {
    if (!Camera._instance) {
      if (viewportWidth == null || viewportHeight == null) {
        throw new Error('[Camera] Must supply viewport dimensions on first initialization');
      }
      Camera._instance = new Camera(viewportWidth, viewportHeight);
    }
    return Camera._instance;
  }

  public static destroy(): void {
    if (Camera._instance) {
      Camera._instance.cleanup();
      Camera._instance = null;
    }
  }

  private x = 0;
  private y = 0;
  private zoom = 0.3;

  private targetX = 0;
  private targetY = 0;

  private skipSmoothingThisFrame = false;
  private readonly deadZoneRadius = 12;

  private zoomAnimationTarget: number | null = null;
  private zoomAnimationSpeed: number = 0.025;

  private viewportWidth: number;
  private viewportHeight: number;

  private constructor(viewportWidth: number, viewportHeight: number) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
  
    GlobalEventBus.on('camera:shake', this.handleShakeEvent);
  }

  update(dt: number): void {
    this.screenShake.update(dt);

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

    // Apply screen shake to camera position and zoom
    const shakeOffset = this.screenShake.getOffset();
    this.x += shakeOffset.x / this.zoom; // Convert screen space to world space
    this.y += shakeOffset.y / this.zoom;
    
    // // Optional: Apply shake to zoom for more dramatic effect
    // const shakeIntensity = Math.sqrt(shakeOffset.x * shakeOffset.x + shakeOffset.y * shakeOffset.y);
    // const zoomShake = (shakeIntensity / 100) * 0.02; // Adjust multiplier as needed
    // this.zoom += zoomShake;

    // === Zoom interpolation ===
    if (this.zoomAnimationTarget !== null) {
      const delta = this.zoomAnimationTarget - this.zoom;
      if (Math.abs(delta) > 0.001) {
        const zoomStep = this.zoomAnimationSpeed * delta;
        const nextZoom = this.zoom + zoomStep;

        const scrollSteps = Math.log(nextZoom / this.zoom) / Math.log(1.08);
        this.adjustZoom(scrollSteps);
      } else {
        this.zoom = this.zoomAnimationTarget;
        this.zoomAnimationTarget = null;
      }
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

  public animateZoomTo(target: number, speed: number = 0.025): void {
    const uiScale = getUniformScaleFactor();
    const scaledMinZoom = 0.15 * uiScale;
    const scaledMaxZoom = 0.5 * uiScale;

    this.zoomAnimationTarget = Math.min(scaledMaxZoom, Math.max(scaledMinZoom, target));
    this.zoomAnimationSpeed = speed;
  }

  getZoom(): number {
    return this.zoom;
  }

  public abortZoomAnimation(): void {
    this.zoomAnimationTarget = null;
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
    const canvas = canvasManager.getCanvas('unifiedgl2');
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

  private readonly handleShakeEvent = ({ strength, duration, frequency }: EventTypes['camera:shake']) => {
    this.screenShake.trigger(strength, duration, frequency);
  };

  private cleanup(): void {
    // Remove EventBus listeners
    GlobalEventBus.off('camera:shake', this.handleShakeEvent);

    // Reset internal state
    this.x = 0;
    this.y = 0;
    this.zoom = 0.3;
    this.targetX = 0;
    this.targetY = 0;
    this.skipSmoothingThisFrame = false;
    this.viewportWidth = 0;
    this.viewportHeight = 0;

    // Optional: clear shake state
    this.screenShake.trigger(0, 0); // zero out any residual shaking
  }
}
