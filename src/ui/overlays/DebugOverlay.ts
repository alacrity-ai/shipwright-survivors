// src/ui/overlays/DebugOverlay.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import { drawLabel } from '@/ui/primitives/UILabel';
import { missionLoader } from '@/game/missions/MissionLoader';
import { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';

const DEBUG_MODE = false;

export class DebugOverlay {
  private smoothedFps: number = 60;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly shipRegistry: ShipRegistry,
    private readonly aiOrchestrator: AIOrchestratorSystem,
  ) {}

  render(dt: number): void {
    const ctx = this.canvasManager.getContext('ui');
    const canvas = ctx.canvas;

    // === FPS CALCULATION ===
    const instantaneousFps = 1 / dt;
    const smoothingFactor = 0.05;
    this.smoothedFps += (instantaneousFps - this.smoothedFps) * smoothingFactor;

    // === Label layout
    const x = canvas.width - 300;
    let y = 12;
    const lineHeight = 18;

    if (DEBUG_MODE) drawLabel(ctx, x, y, `DEBUG`); y += lineHeight;
    drawLabel(ctx, x, y, `FPS: ${this.smoothedFps.toFixed(1)}`); y += lineHeight;

    if (!DEBUG_MODE) return;

    const shipCount = this.shipRegistry.count();
    const enemyPower = missionLoader.getEnemyPower();
    const controllerEntries = Array.from(this.aiOrchestrator.getAllControllers());

    const formationLeaders = controllerEntries.filter(([controller]) =>
      controller.isFormationLeader()
    ).length;

    const formationFollowers = controllerEntries.filter(([controller]) =>
      controller.isFormationFollower()
    ).length;

    const inFormation = controllerEntries.filter(([controller]) =>
      controller.isInFormation()
    ).length;

    const stateCounts: Record<string, number> = {};
    for (const [controller] of controllerEntries) {
      const stateName = controller.getCurrentState()?.constructor?.name ?? 'Unknown';
      stateCounts[stateName] = (stateCounts[stateName] ?? 0) + 1;
    }

    drawLabel(ctx, x, y, `Ships: ${shipCount}`); y += lineHeight;
    drawLabel(ctx, x, y, `Enemy Power: ${enemyPower}`); y += lineHeight;
    drawLabel(ctx, x, y, `Formation: ${inFormation} (Leaders: ${formationLeaders}, Followers: ${formationFollowers})`); y += lineHeight;

    // === State Breakdown ===
    for (const [state, count] of Object.entries(stateCounts)) {
      drawLabel(ctx, x, y, `${state}: ${count}`);
      y += lineHeight;
    }
  }

}
