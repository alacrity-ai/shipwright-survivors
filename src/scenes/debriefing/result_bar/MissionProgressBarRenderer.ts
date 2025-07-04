// src/scenes/debriefing/result_bar/MissionProgressBarRenderer.ts

import { getUniformScaleFactor } from '@/config/view';
import { drawMissionBarFrame } from './drawMissionBarFrame';
import { drawBossCrownIcon } from './drawBossCrownIcon';

export interface MissionProgressRenderState {
  progressRatio: number;         // 0.0 to 1.0
  tickPopFlags: boolean[];       // length == totalWaves
  tickPulseTimers: number[];     // seconds since tick pop, or -1
  totalWaves: number;
  didReachBoss: boolean;
  crownPulseTimer: number;       // seconds since boss reached, or -1
}

export class MissionProgressBarRenderer {
  private posX: number;
  private posY: number;

  private barWidth: number = 400;
  private barHeight: number = 32;
  private crownSize: number = 28;

  private renderState: MissionProgressRenderState | null = null;

  constructor(posX: number, posY: number) {
    this.posX = posX;
    this.posY = posY;
  }

  public setRenderState(state: MissionProgressRenderState): void {
    this.renderState = state;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.renderState) return;

    const scale = getUniformScaleFactor();
    const x = this.posX;
    const y = this.posY;
    const width = this.barWidth * scale;
    const height = this.barHeight * scale;

    const {
      progressRatio,
      tickPopFlags,
      tickPulseTimers,
      totalWaves,
      didReachBoss,
      crownPulseTimer
    } = this.renderState;

    // === Frame ===
    drawMissionBarFrame(ctx, x, y, width, height);

    // === Fill ===
    const fillWidth = Math.floor(width * progressRatio);
    ctx.save();

    const fillGradient = ctx.createLinearGradient(x, y, x + fillWidth, y + height);
    fillGradient.addColorStop(0, '#00FFFF');
    fillGradient.addColorStop(1, '#0077AA');

    ctx.fillStyle = fillGradient;
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 12;
    ctx.fillRect(x, y, fillWidth, height);
    ctx.restore();

    // === Tick Marks ===
    const spacing = width / totalWaves;

    for (let i = 1; i < totalWaves; i++) {
      const tx = x + i * spacing;
      const isPopped = tickPopFlags[i] ?? false;
      const pulseT = tickPulseTimers[i];

      ctx.save();

      // Pulse effect — expanding, fading teal ring
      if (pulseT >= 0 && pulseT < 0.4) {
        const progress = pulseT / 0.4;
        const radius = 6 * scale + 8 * scale * progress;
        const alpha = 1.0 - progress;

        ctx.beginPath();
        ctx.arc(tx, y + height / 2, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 255, ${alpha.toFixed(2)})`;
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
      }

      // Static tick line
      ctx.lineWidth = 2 * scale;
      ctx.globalAlpha = isPopped ? 1.0 : 0.4;
      ctx.strokeStyle = isPopped ? '#00FFFF' : '#004466';

      ctx.beginPath();
      ctx.moveTo(tx, y + 4);
      ctx.lineTo(tx, y + height - 4);
      ctx.stroke();

      ctx.restore();
    }

    // === Boss Crown Icon ===
    const crownX = x + width - (this.crownSize * scale) / 2;
    const crownY = y + height / 2 - (this.crownSize * scale) / 2;

    // Optional crown pulse
    if (crownPulseTimer >= 0 && crownPulseTimer < 0.6) {
      const t = crownPulseTimer / 0.6;
      const radius = (this.crownSize * 0.6 + this.crownSize * 0.6 * t) * scale;
      const alpha = 1.0 - t;

      ctx.save();
      ctx.beginPath();
      ctx.arc(crownX + (this.crownSize * scale) / 2, crownY + (this.crownSize * scale) / 2, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 255, ${alpha.toFixed(2)})`;
      ctx.lineWidth = 3 * scale;
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();
    }

    drawBossCrownIcon(ctx, crownX, crownY, this.crownSize * scale, {
      glow: didReachBoss,
      alpha: 1.0,
    });
  }

  public setPosition(x: number, y: number): void {
    this.posX = x;
    this.posY = y;
  }

  public getBounds(): { x: number; y: number; width: number; height: number } {
    const scale = getUniformScaleFactor();
    return {
      x: this.posX,
      y: this.posY,
      width: this.barWidth * scale,
      height: this.barHeight * scale,
    };
  }
}
