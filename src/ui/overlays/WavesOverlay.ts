// src/ui/overlays/WavesOverlay.ts

import type { CanvasManager } from '@/core/CanvasManager';
import { drawLabel } from '@/ui/primitives/UILabel';
import type { WaveSpawner } from '@/systems/wavespawner/WaveSpawner';

export class WavesOverlay {
  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly waveSpawner: WaveSpawner
  ) {}

  render(): void {
    const ctx = this.canvasManager.getContext('ui');

    const wave = this.waveSpawner.getCurrentWaveNumber();
    const countdown = this.waveSpawner.getTimeUntilNextWave();
    const isBoss = this.waveSpawner.isBossWaveActive();

    const x = 240;
    let y = 680;
    const lineHeight = 18;

    drawLabel(ctx, x, y, `Wave: ${wave}`); y += lineHeight;

    if (isBoss) {
      drawLabel(ctx, x, y, `Boss Encounter`);
    } else {
      drawLabel(ctx, x, y, `Next wave in: ${Math.ceil(countdown)}s`);
    }
  }
}
