// src/systems/dialogue/renderers/PortraitRenderer.ts

import type { DialogueLine } from '@/systems/dialogue/interfaces/DialogueLine';
import type { SpeakerVoiceProfile } from '@/systems/dialogue/interfaces/SpeakerVoiceProfile';

export class PortraitRenderer {
  private readonly largePortraitSize = { width: 512, height: 512 };
  private readonly smallPortraitSize = { width: 128, height: 128 };

  public render(
    ctx: CanvasRenderingContext2D,
    line: DialogueLine,
    speaker: SpeakerVoiceProfile
  ): void {
    const { portrait, portraitOffset } = speaker;
    const { x, y } = line.position;
    const isTransmission = line.mode === 'transmission';

    const offsetX = portraitOffset?.x ?? 0;
    const offsetY = portraitOffset?.y ?? 0;
    const drawX = x + offsetX;
    const drawY = y + offsetY;

    const { width, height } = isTransmission
      ? this.smallPortraitSize
      : this.largePortraitSize;

    // Optional transmission-style frame and overlay
    if (isTransmission) {
      this.drawTransmissionFrame(ctx, drawX, drawY, width, height);
    }

    ctx.drawImage(portrait, drawX, drawY, width, height);

    if (isTransmission) {
      this.drawTransmissionOverlay(ctx, drawX, drawY, width, height);
    }
  }

  private drawTransmissionFrame(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    ctx.save();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 4, y - 4, width + 8, height + 8);
    ctx.restore();
  }

  private drawTransmissionOverlay(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 255, 100, 0.05)';
    ctx.fillRect(x, y, width, height);

    // CRT-style scanlines
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < height; i += 4) {
      ctx.beginPath();
      ctx.moveTo(x, y + i);
      ctx.lineTo(x + width, y + i);
      ctx.stroke();
    }

    ctx.restore();
  }
}
