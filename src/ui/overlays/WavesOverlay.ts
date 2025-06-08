// src/ui/overlays/WavesOverlay.ts

import type { CanvasManager } from '@/core/CanvasManager';
import { drawLabel } from '@/ui/primitives/UILabel';
import type { WaveSpawner } from '@/systems/wavespawner/WaveSpawner';

import { getUniformScaleFactor } from '@/config/view';

export class WavesOverlay {
  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly waveSpawner: WaveSpawner
  ) {}

  render(): void {
    const ctx = this.canvasManager.getContext('ui');
    const canvas = ctx.canvas;

    const wave = this.waveSpawner.getCurrentWaveNumber();
    const countdown = this.waveSpawner.getTimeUntilNextWave();
    const isBoss = this.waveSpawner.isBossWaveActive();

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
}
