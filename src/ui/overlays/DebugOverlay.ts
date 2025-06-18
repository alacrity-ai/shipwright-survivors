// src/ui/overlays/DebugOverlay.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import { CompositeBlockObjectRegistry } from '@/game/entities/registries/CompositeBlockObjectRegistry';
import { drawLabel } from '@/ui/primitives/UILabel';
import { missionLoader } from '@/game/missions/MissionLoader';

export class DebugOverlay {
  private smoothedFps: number = 60;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly shipRegistry: ShipRegistry,
    private readonly aiOrchestrator: AIOrchestratorSystem
  ) {}

  render(dt: number): void {
    const ctx = this.canvasManager.getContext('ui');
    const canvas = ctx.canvas;
    const compositeBlockRegistry = CompositeBlockObjectRegistry.getInstance();

    // === FPS CALCULATION ===
    const instantaneousFps = 1 / dt;
    const smoothingFactor = 0.05; // Higher = more responsive, lower = more stable
    this.smoothedFps += (instantaneousFps - this.smoothedFps) * smoothingFactor;

    const shipCount = this.shipRegistry.count();
    const aiControllerCount = this.aiOrchestrator.getControllerCount();
    const hunterControllerCount = this.aiOrchestrator.getHunterControllerCount();

    // === Aggregate shielded block count and shieldEfficiency
    let totalShieldedBlocks = 0;
    let totalShieldEfficiency = 0;

    for (const ship of this.shipRegistry.getAll()) {
      for (const [, block] of ship.getAllBlocks()) {
        if (block.isShielded) {
          totalShieldedBlocks++;
          totalShieldEfficiency += block.shieldEfficiency ?? 0;
        }
      }
    }

    // === Label layout
    const x = canvas.width - 220;
    let y = 12;
    const lineHeight = 18;

    drawLabel(ctx, x, y, `DEBUG`); y += lineHeight;
    drawLabel(ctx, x, y, `FPS: ${this.smoothedFps.toFixed(1)}`); y += lineHeight;
    drawLabel(ctx, x, y, `Ships: ${shipCount}`); y += lineHeight;
    drawLabel(ctx, x, y, `AI Controllers: ${aiControllerCount}`); y += lineHeight;
    drawLabel(ctx, x, y, `AI Hunter Controllers: ${hunterControllerCount}`); y += lineHeight;
    drawLabel(ctx, x, y, `Shielded Blocks: ${totalShieldedBlocks}`); y += lineHeight;
    drawLabel(ctx, x, y, `Total Shield Efficiency: ${totalShieldEfficiency.toFixed(2)}`);
    y += lineHeight;
    drawLabel(ctx, x, y, `Enemy Power: ${missionLoader.getEnemyPower()}`);
  }
}
