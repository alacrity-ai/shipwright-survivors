// src/ui/overlays/MiniMap.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { Ship } from '@/game/ship/Ship';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import { WORLD_WIDTH, WORLD_HEIGHT, WORLD_CENTER } from '@/config/world';
import { SETTINGS } from '@/config/settings'; // Import the settings

export class MiniMap {
  private readonly width = 220;
  private readonly height = 220;
  private readonly margin = 12;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly player: Ship,
    private readonly registry: ShipRegistry
  ) {}

  render(): void {
    const ctx = this.canvasManager.getContext('ui');

    const canvasW = ctx.canvas.width;
    const canvasH = ctx.canvas.height;
    const x = canvasW - this.width - this.margin;
    const y = canvasH - this.height - this.margin;

    const borderRadius = 8;
    const alpha = SETTINGS.MINIMAP_TRANSPARENCY ?? 0.5;

    // === CRT Background Box ===
    ctx.save();
    ctx.globalAlpha = alpha;

    const gradient = ctx.createLinearGradient(x, y, x, y + this.height);
    gradient.addColorStop(0, '#002200');
    gradient.addColorStop(1, '#001500');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, this.width, this.height, borderRadius);
    ctx.fill();
    ctx.stroke();

    // === Coordinate projection helper ===
    const scaleX = this.width / WORLD_WIDTH;
    const scaleY = this.height / WORLD_HEIGHT;

    const project = (worldPos: { x: number; y: number }) => {
      const relX = worldPos.x - WORLD_CENTER.x + WORLD_WIDTH / 2;
      const relY = worldPos.y - WORLD_CENTER.y + WORLD_HEIGHT / 2;
      return {
        x: x + relX * scaleX,
        y: y + relY * scaleY
      };
    };

    // === Draw ships ===
    for (const ship of this.registry.getAll()) {
      const { position } = ship.getTransform();
      const { x: px, y: py } = project(position);

      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);

      ctx.fillStyle = ship === this.player ? '#33ff33' : '#ff4444';
      ctx.fill();
    }

    // === CRT-style Crosshairs ===
    ctx.strokeStyle = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(x + this.width / 2, y);
    ctx.lineTo(x + this.width / 2, y + this.height);
    ctx.moveTo(x, y + this.height / 2);
    ctx.lineTo(x + this.width, y + this.height / 2);
    ctx.stroke();

    ctx.restore(); // Reset alpha, fill, stroke
  }
}
