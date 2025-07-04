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

  private overlayCacheCanvas: HTMLCanvasElement;
  private overlayCacheCtx: CanvasRenderingContext2D;

  private bossBarCacheCanvas: HTMLCanvasElement;
  private bossBarCacheCtx: CanvasRenderingContext2D;

  private lastWave = -1;
  private lastCountdown = -1;

  private lastBossCurrent = -1;
  private lastBossMax = -1;
  private bossBarVisible = false;

  private hidden = false;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly waveOrchestrator: WaveOrchestrator
  ) {
    GlobalEventBus.on('waves:hide', this.onHide);
    GlobalEventBus.on('waves:show', this.onShow);

    const scale = getUniformScaleFactor();

    this.overlayCacheCanvas = document.createElement('canvas');
    this.overlayCacheCanvas.width = 400 * scale;
    this.overlayCacheCanvas.height = 60 * scale;
    this.overlayCacheCtx = this.overlayCacheCanvas.getContext('2d')!;

    this.bossBarCacheCanvas = document.createElement('canvas');
    this.bossBarCacheCanvas.width = 300 * scale;
    this.bossBarCacheCanvas.height = 30 * scale;
    this.bossBarCacheCtx = this.bossBarCacheCanvas.getContext('2d')!;
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
    const countdown = Math.ceil(this.waveOrchestrator.getTimeUntilNextWave());
    const isBoss = this.waveOrchestrator.isBossWaveActive();

    const scale = getUniformScaleFactor();

    // === Text Overlay Cache ===
    if (wave !== this.lastWave || countdown !== this.lastCountdown) {
      this.lastWave = wave;
      this.lastCountdown = countdown;

      const octx = this.overlayCacheCtx;
      octx.clearRect(0, 0, this.overlayCacheCanvas.width, this.overlayCacheCanvas.height);

      const x = 0;
      let y = 0;
      const lineHeight = 18 * scale;

      drawLabel(octx, x, y, `Wave: ${wave}`, {}, scale);
      y += lineHeight;

      if (isBoss) {
        drawLabel(octx, x, y, `Boss Encounter`, {}, scale);
      } else {
        drawLabel(octx, x, y, `Next wave in: ${countdown}s`, {}, scale);
      }
    }

    // === Blit Text Overlay Cache ===
    const overlayX = 240 * scale;
    const overlayY = canvas.height - (36 * scale);
    ctx.drawImage(this.overlayCacheCanvas, overlayX, overlayY);

    // === Boss Mass Bar (if active) ===
    if (isBoss) {
      const bossShips = this.waveOrchestrator.getBossShips();

      let totalCurrent = 0;
      let totalMax = 0;

      for (const ship of bossShips) {
        const currentMass = ship.getTotalMass?.() ?? 0;
        const cachedMax = this.bossMassCache.get(ship) ?? 0;

        if (currentMass > cachedMax) {
          this.bossMassCache.set(ship, currentMass);
        }

        totalCurrent += currentMass;
        totalMax += this.bossMassCache.get(ship)!;
      }

      if (totalMax <= 0) totalMax = 1;

      const changed =
        totalCurrent !== this.lastBossCurrent ||
        totalMax !== this.lastBossMax ||
        !this.bossBarVisible;

      if (changed) {
        this.lastBossCurrent = totalCurrent;
        this.lastBossMax = totalMax;
        this.bossBarVisible = true;

        this.bossBarCacheCtx.clearRect(0, 0, this.bossBarCacheCanvas.width, this.bossBarCacheCanvas.height);

        drawUIResourceBar(this.bossBarCacheCtx, {
          x: 10,
          y: 10,
          width: this.bossBarCacheCanvas.width - 20,
          height: this.bossBarCacheCanvas.height - 20,
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

      const barX = Math.floor((canvas.width - this.bossBarCacheCanvas.width) / 2);
      const barY = Math.floor(16 * scale);
      ctx.drawImage(this.bossBarCacheCanvas, barX, barY);
    } else {
      this.bossBarVisible = false;
    }
  }

  destroy(): void {
    GlobalEventBus.off('waves:hide', this.onHide);
    GlobalEventBus.off('waves:show', this.onShow);
    this.bossMassCache.clear();
  }
}
