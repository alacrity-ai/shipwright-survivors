// src/ui/overlays/DebugOverlay.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import { drawLabel } from '@/ui/primitives/UILabel';
import { missionLoader } from '@/game/missions/MissionLoader';
import { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { ShipGrid } from '@/game/ship/ShipGrid';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';

import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { CompositeBlockObjectGrid } from '@/game/entities/CompositeBlockObjectGrid';

import { Camera } from '@/core/Camera';

export class DebugOverlay {
  private smoothedFps: number = 60;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly shipRegistry: ShipRegistry,
    private readonly aiOrchestrator: AIOrchestratorSystem,
    private readonly shipGrid: ShipGrid,
    private readonly objectGrid: CompositeBlockObjectGrid<CompositeBlockObject>
  ) {}

  render(dt: number): void {
    const DEBUG_MODE = PlayerSettingsManager.getInstance().getDebugMode();
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

    const lightingOrch = LightingOrchestrator.getInstance();
    const allLights = lightingOrch.getActiveLights();
    const visibleLights = lightingOrch.collectVisibleLights(Camera.getInstance());
    const orphanedLights = functionfindOrphanedAuraLights(lightingOrch, this.shipRegistry, false);

    const auraLightCount = allLights.filter(l => l.id?.startsWith('aura-')).length;
    const visibleAuraLights = visibleLights.filter(l => l.id?.startsWith('aura-')).length;

    const shipCount = this.shipRegistry.count();
    const visibleShips = this.shipGrid.getShipsInCameraView(0).length;
    const activeAIShips = this.shipGrid.getShipsInCameraView(2000).length;

    const compositeBlockObjectsInGrid = this.objectGrid.getAllObjects();

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

    // === Render Metrics ===
    drawLabel(ctx, x, y, `Ships: ${shipCount}`); y += lineHeight;
    drawLabel(ctx, x, y, `Visible Ships: ${visibleShips}`); y += lineHeight;
    drawLabel(ctx, x, y, `Active AI Ships (2000): ${activeAIShips}`); y += lineHeight;
    drawLabel(ctx, x, y, `Enemy Power: ${enemyPower}`); y += lineHeight;
    drawLabel(ctx, x, y, `Formation: ${inFormation} (Leaders: ${formationLeaders}, Followers: ${formationFollowers})`); y += lineHeight;
    drawLabel(ctx, x, y, `Aura Lights: ${auraLightCount}`); y += lineHeight;
    drawLabel(ctx, x, y, `Visible Aura Lights: ${visibleAuraLights}`); y += lineHeight;
    drawLabel(ctx, x, y, `Orphaned Aura Lights: ${orphanedLights.length}`); y += lineHeight;
    drawLabel(ctx, x, y, `Composite Block Objects: ${compositeBlockObjectsInGrid.length}`); y += lineHeight;
    const destroyedObjects = compositeBlockObjectsInGrid.filter(o => o.isDestroyed());
    drawLabel(ctx, x, y, `Destroyed Composite Objects: ${destroyedObjects.length}`); y += lineHeight;

    // === Residual Block Count in Grid (from one ship's grid ref)
    const sampleShip = this.shipRegistry.getPlayerShip();
    if (sampleShip) {
      const grid = sampleShip.getGrid?.();
      if (grid) {
        let blockCount = 0;
        const seen = new Set<BlockInstance>();

        const scanMap = (map: Map<number, Map<number, BlockInstance[]>>) => {
          for (const row of map.values()) {
            for (const cell of row.values()) {
              for (const block of cell) {
                if (!seen.has(block)) {
                  seen.add(block);
                  blockCount++;
                }
              }
            }
          }
        };

        // Scan global + faction cells
        scanMap((grid as any).cells);
        for (const factionMap of (grid as any).factionCells.values()) {
          scanMap(factionMap);
        }

        drawLabel(ctx, x, y, `BlockInstances in Grid: ${blockCount}`); y += lineHeight;
      }
    }


    // // === State Breakdown ===
    // for (const [state, count] of Object.entries(stateCounts)) {
    //   drawLabel(ctx, x, y, `${state}: ${count}`);
    //   y += lineHeight;
    // }
  }
}

/**
 * Diagnostic method to find and optionally clean up orphaned aura lights
 */
export function functionfindOrphanedAuraLights(
  lightingOrchestrator: LightingOrchestrator,
  shipRegistry: ShipRegistry,
  cleanup: boolean = false
): string[] {
  const orphanedLightIds: string[] = [];

  for (const [id, light] of lightingOrchestrator.getActiveLightEntries()) {
    if (!id.startsWith('aura-')) continue;

    const shipId = id.substring(5);
    const shipExists = shipRegistry.getById(shipId) !== undefined;

    if (!shipExists) {
      orphanedLightIds.push(id);

      if (cleanup) {
        lightingOrchestrator.removeLight(id);
        console.log(`[LightingOrchestrator] Removed orphaned aura light: ${id}`);
      }
    }
  }

  return orphanedLightIds;
}
