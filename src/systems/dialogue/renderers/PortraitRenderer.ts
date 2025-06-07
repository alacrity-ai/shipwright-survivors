// src/systems/dialogue/renderers/PortraitRenderer.ts

import type { DialogueLine } from '@/systems/dialogue/interfaces/DialogueLine';
import type { SpeakerVoiceProfile } from '@/systems/dialogue/interfaces/SpeakerVoiceProfile';
import { getUniformScaleFactor } from '@/config/view';

export class PortraitRenderer {
  private readonly baseLargePortraitSize = { width: 512, height: 512 };
  private readonly baseSmallPortraitSize = { width: 128, height: 128 };

  public render(
    ctx: CanvasRenderingContext2D,
    line: DialogueLine,
    speaker: SpeakerVoiceProfile
  ): void {
    const scale = getUniformScaleFactor();

    const { portrait, portraitOffset } = speaker;
    const { x, y } = line.position;
    const isTransmission = line.mode === 'transmission';

    const offsetX = (portraitOffset?.x ?? 0) * scale;
    const offsetY = (portraitOffset?.y ?? 0) * scale;

    const drawX = x + offsetX;
    const drawY = y + offsetY;

    const baseSize = isTransmission ? this.baseSmallPortraitSize : this.baseLargePortraitSize;
    const width = baseSize.width * scale;
    const height = baseSize.height * scale;

    // Optional transmission-style frame and overlay
    if (isTransmission) {
      this.drawTransmissionFrame(ctx, drawX, drawY, width, height, scale);
    }

    ctx.drawImage(portrait, drawX, drawY, width, height);

    if (isTransmission) {
      this.drawTransmissionOverlay(ctx, drawX, drawY, width, height, scale);
    }
  }

  private drawTransmissionFrame(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    scale: number
  ): void {
    ctx.save();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2 * scale;
    const margin = 4 * scale;
    ctx.strokeRect(x - margin, y - margin, width + 2 * margin, height + 2 * margin);
    ctx.restore();
  }

  private drawTransmissionOverlay(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    scale: number
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 255, 100, 0.05)';
    ctx.fillRect(x, y, width, height);

    // CRT-style scanlines
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.12)';
    ctx.lineWidth = 1 * scale;
    const scanlineSpacing = 4 * scale;

    for (let i = 0; i < height; i += scanlineSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, y + i);
      ctx.lineTo(x + width, y + i);
      ctx.stroke();
    }

    ctx.restore();
  }
}
