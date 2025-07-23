// src/ui/overlays/WavesOverlay.ts

import type { CanvasManager } from '@/core/CanvasManager';
import { drawLabel } from '@/ui/primitives/UILabel';
import type { WaveOrchestrator } from '@/game/waves/orchestrator/WaveOrchestrator';

import { GlobalEventBus } from '@/core/EventBus';
import { getUniformScaleFactor } from '@/config/view';

// Utility to format seconds as mm:ss
function formatElapsedTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export class WavesOverlay {
  private readonly onHide = () => this.hide();
  private readonly onShow = () => this.show();

  private overlayCacheCanvas: HTMLCanvasElement;
  private overlayCacheCtx: CanvasRenderingContext2D;

  private lastElapsedTime = -1;
  private elapsedSampleTimer = 0;

  private hidden = false;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly waveOrchestrator: WaveOrchestrator
  ) {
    GlobalEventBus.on('waves:hide', this.onHide);
    GlobalEventBus.on('waves:show', this.onShow);

    const scale = getUniformScaleFactor();
    this.overlayCacheCanvas = document.createElement('canvas');
    this.overlayCacheCanvas.width = 200 * scale;
    this.overlayCacheCanvas.height = 40 * scale;
    this.overlayCacheCtx = this.overlayCacheCanvas.getContext('2d')!;
  }

  public hide(): void {
    this.hidden = true;
  }

  public show(): void {
    this.hidden = false;
  }

  public render(): void {
    if (this.hidden) return;

    const ctx = this.canvasManager.getContext('overlay');
    const canvas = ctx.canvas;
    const scale = getUniformScaleFactor();

    // === Throttled Elapsed Time Sampling ===
    this.elapsedSampleTimer += 1 / 60;
    let sampledElapsed = this.lastElapsedTime;

    if (this.elapsedSampleTimer >= 1) {
      sampledElapsed = Math.floor(this.waveOrchestrator.getTimeSinceFirstWaveStarted());
      this.elapsedSampleTimer = 0;
    }

    if (sampledElapsed !== this.lastElapsedTime) {
      this.lastElapsedTime = sampledElapsed;

      const formattedTime = formatElapsedTime(sampledElapsed);
      const octx = this.overlayCacheCtx;
      octx.clearRect(0, 0, this.overlayCacheCanvas.width, this.overlayCacheCanvas.height);

      drawLabel(octx, 0, 0, formattedTime, {}, scale);
    }

    const overlayWidth = this.overlayCacheCanvas.width;

    const overlayX = Math.floor((canvas.width - overlayWidth) / 2 + (88 * scale));
    const overlayY = Math.floor(canvas.height - 100 * scale);

    ctx.drawImage(this.overlayCacheCanvas, overlayX, overlayY);
  }

  public destroy(): void {
    GlobalEventBus.off('waves:hide', this.onHide);
    GlobalEventBus.off('waves:show', this.onShow);
  }
}
