// src/ui/overlays/DebugOverlay.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import { drawLabel } from '@/ui/primitives/UILabel';

export class DebugOverlay {
  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly shipRegistry: ShipRegistry,
    private readonly aiOrchestrator: AIOrchestratorSystem
  ) {}

  render(): void {
    const ctx = this.canvasManager.getContext('ui');

    const shipCount = this.shipRegistry.count();
    const aiControllerCount = this.aiOrchestrator.getControllerCount();

    const x = 1080; // Right side of 1280px canvas
    let y = 12;
    const lineHeight = 18;

    drawLabel(ctx, x, y, `DEBUG`); y += lineHeight;
    drawLabel(ctx, x, y, `Ships: ${shipCount}`); y += lineHeight;
    drawLabel(ctx, x, y, `AI Controllers: ${aiControllerCount}`);
  }
}
