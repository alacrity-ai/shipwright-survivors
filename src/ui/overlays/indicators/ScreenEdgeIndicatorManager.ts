// src/ui/overlays/indicators/ScreenEdgeIndicatorManager.ts

import { Camera } from '@/core/Camera';

import { CanvasManager } from '@/core/CanvasManager';
import { GlobalEventBus } from '@/core/EventBus';
import { getUniformScaleFactor } from '@/config/view';

interface Indicator {
  id: string;
  worldX: number;
  worldY: number;
  color?: string;
  icon?: HTMLImageElement | HTMLCanvasElement;
}

export class ScreenEdgeIndicatorManager {
  private indicators: Map<string, Indicator> = new Map();

  private readonly camera = Camera.getInstance();
  private ctx: CanvasRenderingContext2D;

  private handleCreateIndicator = (
    payload: { id: string; worldX: number; worldY: number; color?: string; icon?: HTMLImageElement | HTMLCanvasElement }
  ) => {
    this.createIndicator(payload.id, payload.worldX, payload.worldY, {
      color: payload.color,
      icon: payload.icon,
    });
  };

  private handleRemoveIndicator = (payload: { id: string }) => {
    this.removeIndicator(payload.id);
  };

  constructor() {
    this.ctx = CanvasManager.getInstance().getContext('overlay');

    GlobalEventBus.on('indicator:create', this.handleCreateIndicator);
    GlobalEventBus.on('indicator:remove', this.handleRemoveIndicator);
  }

  createIndicator(id: string, worldX: number, worldY: number, options?: { color?: string; icon?: HTMLImageElement | HTMLCanvasElement }) {
    this.indicators.set(id, {
      id,
      worldX,
      worldY,
      color: options?.color ?? '#ffffff',
      icon: options?.icon,
    });
  }

  removeIndicator(id: string): void {
    this.indicators.delete(id);
  }

  clearAll(): void {
    this.indicators.clear();
  }

  update(_dt: number): void {
    // Placeholder for future animated indicators or tracking dynamic targets
  }

  render(): void {
    const cam = this.camera;
    const viewportWidth = cam.getViewportWidth();
    const viewportHeight = cam.getViewportHeight();

    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;

    // Use the radius for each icon to render it
    for (const indicator of this.indicators.values()) {
      const screenPos = cam.worldToScreen(indicator.worldX, indicator.worldY);
      const isOnScreen =
        screenPos.x >= 0 && screenPos.x <= viewportWidth &&
        screenPos.y >= 0 && screenPos.y <= viewportHeight;

      if (isOnScreen) continue;

      const dx = screenPos.x - centerX;
      const dy = screenPos.y - centerY;
      const angle = Math.atan2(dy, dx);

      // Viewport clamping logic
      const padding = 32;
      const halfW = centerX - padding;
      const halfH = centerY - padding;

      const tan = Math.tan(angle);
      let edgeX = 0;
      let edgeY = 0;

      if (Math.abs(dx) > Math.abs(dy)) {
        edgeX = dx > 0 ? halfW : -halfW;
        edgeY = edgeX * tan;
        if (Math.abs(edgeY) > halfH) {
          edgeY = halfH * Math.sign(dy);
          edgeX = edgeY / tan;
        }
      } else {
        edgeY = dy > 0 ? halfH : -halfH;
        edgeX = edgeY / tan;
        if (Math.abs(edgeX) > halfW) {
          edgeX = halfW * Math.sign(dx);
          edgeY = edgeX * tan;
        }
      }

      const clampedX = centerX + edgeX;
      const clampedY = centerY + edgeY;

      // === Render ===
      const ctx = this.ctx;

      ctx.save();
      ctx.translate(clampedX, clampedY);
      ctx.rotate(angle);
      ctx.fillStyle = indicator.color ?? '#ffffff';

      const radius = 18 * getUniformScaleFactor();
      if (indicator.icon) {
        ctx.drawImage(indicator.icon, -radius, -radius, radius * 2, radius * 2);
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -radius);
        ctx.lineTo(-radius * 0.6, radius);
        ctx.lineTo(radius * 0.6, radius);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
  }

  destroy(): void {
    GlobalEventBus.off('indicator:create', this.handleCreateIndicator);
    GlobalEventBus.off('indicator:remove', this.handleRemoveIndicator);
  }
}
