// src/systems/dialogue/renderers/TextboxRenderer.ts

import type { DialogueLine } from '@/systems/dialogue/interfaces/DialogueLine';
import type { SpeakerVoiceProfile } from '@/systems/dialogue/interfaces/SpeakerVoiceProfile';

export class TextboxRenderer {
  public render(
    ctx: CanvasRenderingContext2D,
    line: DialogueLine,
    speaker: SpeakerVoiceProfile
  ): void {
    const { x, y, width, height } = line.textBoxRect;

    if (line.mode === 'transmission' || speaker.transmissionStyle) {
      this.drawTransmissionBox(ctx, x, y, width, height);
    } else {
      this.drawSpeechBubble(ctx, x, y, width, height, line.textBoxAlpha ?? 0.8);
    }
  }

  private drawSpeechBubble(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    alpha: number
  ): void {
    const radius = 16;
    ctx.save();

    // Bubble body
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();

    // Tail
    ctx.beginPath();
    ctx.moveTo(x + 40, y + height);
    ctx.lineTo(x + 32, y + height + 12);
    ctx.lineTo(x + 48, y + height);
    ctx.fill();

    ctx.restore();
  }

  private drawTransmissionBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    ctx.save();

    // CRT background
    ctx.fillStyle = 'rgba(0, 255, 100, 0.08)';
    ctx.fillRect(x, y, width, height);

    // Border
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, width + 2, height + 2);

    // Horizontal scanlines
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.07)';
    for (let i = 2; i < height; i += 4) {
      ctx.beginPath();
      ctx.moveTo(x, y + i);
      ctx.lineTo(x + width, y + i);
      ctx.stroke();
    }

    ctx.restore();
  }
}
