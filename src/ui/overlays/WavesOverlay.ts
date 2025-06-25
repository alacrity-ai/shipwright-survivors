// src/ui/overlays/WavesOverlay.ts

import type { CanvasManager } from '@/core/CanvasManager';
import { drawLabel } from '@/ui/primitives/UILabel';
import type { WaveOrchestrator } from '@/game/waves/orchestrator/WaveOrchestrator';

import { GlobalEventBus } from '@/core/EventBus';
import { drawUIResourceBar } from '@/ui/primitives/UIResourceBar';
import { getUniformScaleFactor } from '@/config/view';
import type { Ship } from '@/game/ship/Ship';

export class WavesOverlay {
  private readonly onHide = () => this.hide();
  private readonly onShow = () => this.show();

  private readonly bossMassCache = new Map<Ship, number>();

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly waveOrchestrator: WaveOrchestrator,
    private hidden: boolean = false
  ) {
    GlobalEventBus.on('waves:hide', this.onHide);
    GlobalEventBus.on('waves:show', this.onShow);
  }

  public hide(): void {
    this.hidden = true;
  }

  public show(): void {
    this.hidden = false;
  }

  render(): void {
    if (this.hidden) return;

    const ctx = this.canvasManager.getContext('ui');
    const canvas = ctx.canvas;

    const wave = this.waveOrchestrator.getCurrentWaveNumber();
    const countdown = this.waveOrchestrator.getTimeUntilNextWave();
    const isBoss = this.waveOrchestrator.isBossWaveActive();

    const scale = getUniformScaleFactor();
    const x = 240 * scale;
    let y = canvas.height - (36 * scale);
    const lineHeight = 18 * scale;

    drawLabel(ctx, x, y, `Wave: ${wave}`, {}, scale); y += lineHeight;

    if (isBoss) {
      drawLabel(ctx, x, y, `Boss Encounter`, {}, scale);
    } else {
      drawLabel(ctx, x, y, `Next wave in: ${Math.ceil(countdown)}s`, {}, scale);
    }

    // === Boss Mass Bar ===
    if (isBoss) {
      const bossShips = this.waveOrchestrator.getBossShips();

      let totalCurrent = 0;
      let totalMax = 0;

      for (const ship of bossShips) {
        const currentMass = ship.getTotalMass?.() ?? 0;

        // Cache the highest observed mass
        const cachedMax = this.bossMassCache.get(ship) ?? 0;
        if (currentMass > cachedMax) {
          this.bossMassCache.set(ship, currentMass);
        }

        totalCurrent += currentMass;
        totalMax += this.bossMassCache.get(ship)!;
      }

      if (totalMax <= 0) totalMax = 1; // Prevent div-by-zero

      const barWidth = Math.floor(240 * scale);
      const barHeight = Math.floor(14 * scale);

      const barX = Math.floor((canvas.width - barWidth) / 2);
      const barY = Math.floor(16 * scale); // top center

      drawUIResourceBar(ctx, {
        x: barX,
        y: barY,
        width: barWidth,
        height: barHeight,
        value: totalCurrent / totalMax,
        label: `${Math.floor(totalCurrent)} / ${Math.floor(totalMax)} kg`,
        style: {
          barColor: '#ff3333',
          borderColor: '#ff6666',
          backgroundColor: '#220000',
          glow: true,
          textColor: '#ffaaaa',
          font: `${Math.floor(11 * scale)}px "Courier New", monospace`,
          scanlineIntensity: 0.4,
          chromaticAberration: true,
          phosphorDecay: true,
          cornerBevel: true,
          warningThreshold: 0.33,
          criticalThreshold: 0.15,
          warningColor: '#ff6600',
          criticalColor: '#cc0000',
          animated: true,
        }
      }, performance.now());
    }
  }

  destroy(): void {
    GlobalEventBus.off('waves:hide', this.onHide);
    GlobalEventBus.off('waves:show', this.onShow);
    this.bossMassCache.clear();
  }
}
