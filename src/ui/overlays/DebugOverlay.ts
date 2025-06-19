// src/ui/overlays/DebugOverlay.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import { drawLabel } from '@/ui/primitives/UILabel';
import { missionLoader } from '@/game/missions/MissionLoader';

export class DebugOverlay {
  private smoothedFps: number = 60;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly shipRegistry: ShipRegistry
  ) {}

  render(dt: number): void {
    const ctx = this.canvasManager.getContext('ui');
    const canvas = ctx.canvas;

    // === FPS CALCULATION ===
    const instantaneousFps = 1 / dt;
    const smoothingFactor = 0.05;
    this.smoothedFps += (instantaneousFps - this.smoothedFps) * smoothingFactor;

    const shipCount = this.shipRegistry.count();
    const enemyPower = missionLoader.getEnemyPower();

    // === Label layout
    const x = canvas.width - 220;
    let y = 12;
    const lineHeight = 18;

    drawLabel(ctx, x, y, `DEBUG`); y += lineHeight;
    drawLabel(ctx, x, y, `FPS: ${this.smoothedFps.toFixed(1)}`); y += lineHeight;
    drawLabel(ctx, x, y, `Ships: ${shipCount}`); y += lineHeight;
    drawLabel(ctx, x, y, `Enemy Power: ${enemyPower}`);
  }
}
