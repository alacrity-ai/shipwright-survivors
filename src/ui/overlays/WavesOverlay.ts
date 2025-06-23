// src/ui/overlays/WavesOverlay.ts

import type { CanvasManager } from '@/core/CanvasManager';
import { drawLabel } from '@/ui/primitives/UILabel';
import type { WaveOrchestrator } from '@/game/waves/orchestrator/WaveOrchestrator';

import { GlobalEventBus } from '@/core/EventBus';

import { getUniformScaleFactor } from '@/config/view';

export class WavesOverlay {
  private readonly onHide = () => this.hide();
  private readonly onShow = () => this.show();
  
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

    let y = canvas.height - (36 * scale); // 36px from bottom of screen
    const lineHeight = 18 * scale;

    drawLabel(ctx, x, y, `Wave: ${wave}`, {}, scale); y += lineHeight;

    if (isBoss) {
      drawLabel(ctx, x, y, `Boss Encounter`, {}, scale);
    } else {
      drawLabel(ctx, x, y, `Next wave in: ${Math.ceil(countdown)}s`, {}, scale);
    }
  }

  destroy(): void {
    GlobalEventBus.off('waves:hide', this.onHide);
    GlobalEventBus.off('waves:show', this.onShow);
  }
}
