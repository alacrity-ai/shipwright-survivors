// src/ui/overlays/DebugOverlay.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import { drawLabel } from '@/ui/primitives/UILabel';

export class DebugOverlay {
  private smoothedFps: number = 60;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly shipRegistry: ShipRegistry,
    private readonly aiOrchestrator: AIOrchestratorSystem
  ) {}

  render(dt: number): void {
    const ctx = this.canvasManager.getContext('ui');

    // === FPS CALCULATION ===
    const instantaneousFps = 1 / dt;
    const smoothingFactor = 0.05; // Higher = more responsive, lower = more stable
    this.smoothedFps += (instantaneousFps - this.smoothedFps) * smoothingFactor;

    const shipCount = this.shipRegistry.count();
    const aiControllerCount = this.aiOrchestrator.getControllerCount();

    const x = 1080; // Right side of 1280px canvas
    let y = 12;
    const lineHeight = 18;

    drawLabel(ctx, x, y, `DEBUG`); y += lineHeight;
    drawLabel(ctx, x, y, `FPS: ${this.smoothedFps.toFixed(1)}`); y += lineHeight;
    drawLabel(ctx, x, y, `Ships: ${shipCount}`); y += lineHeight;
    drawLabel(ctx, x, y, `AI Controllers: ${aiControllerCount}`);
  }
}
