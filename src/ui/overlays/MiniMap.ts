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

    // === Background box ===
    ctx.fillStyle = `rgba(17, 17, 17, ${SETTINGS.MINIMAP_TRANSPARENCY})`; // Apply transparency to the background
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, this.width, this.height, 6);
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

    // === Set transparency for ships using the value from settings ===
    ctx.globalAlpha = SETTINGS.MINIMAP_TRANSPARENCY;

    // === Draw ships ===
    for (const ship of this.registry.getAll()) {
      const { position } = ship.getTransform();
      const { x: px, y: py } = project(position);

      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);

      if (ship === this.player) {
        ctx.fillStyle = '#0f0'; // Green for player
      } else {
        ctx.fillStyle = '#f00'; // Red for others
      }

      ctx.fill();
    }

    // === Border or crosshair (optional) ===
    ctx.strokeStyle = '#444';
    ctx.beginPath();
    ctx.moveTo(x + this.width / 2, y);
    ctx.lineTo(x + this.width / 2, y + this.height);
    ctx.moveTo(x, y + this.height / 2);
    ctx.lineTo(x + this.width, y + this.height / 2);
    ctx.stroke();

    // Reset globalAlpha to default for other UI elements
    ctx.globalAlpha = 1.0;
  }
}
