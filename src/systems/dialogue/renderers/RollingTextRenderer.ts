// src/systems/dialogue/renderers/RollingTextRenderer.ts

import type { DialogueLine } from '@/systems/dialogue/interfaces/DialogueLine';
import { getUniformScaleFactor } from '@/config/view';

export class RollingTextRenderer {
  private fullText: string = '';
  private lines: string[] = [];
  private revealedCharCount = 0;
  private elapsed = 0;
  private charDelay = 0.075; // seconds per character (already correct)
  private paddingX = 16; // Will scale in render
  private baseLineHeight = 22; // Will scale in render

  public start(line: DialogueLine): void {
    this.fullText = line.text;
    this.lines = this.wrapText(line);
    this.revealedCharCount = 0;
    this.elapsed = 0;
    this.charDelay = line.textSpeed ?? this.charDelay;
  }

  public update(dt: number): void {
    this.elapsed += dt;
    const targetCount = Math.floor(this.elapsed / this.charDelay);
    this.revealedCharCount = Math.min(targetCount, this.fullText.length);
  }

  public render(ctx: CanvasRenderingContext2D, line: DialogueLine): void {
    const scale = getUniformScaleFactor();
    const { x, y, width, height } = line.textBoxRect;
    const font = line.font ?? '24px monospace';
    const color = line.textColor ?? (line.mode === 'transmission' ? '#00ff88' : '#ffffff');

    const lineHeight = this.baseLineHeight * scale;
    const paddingX = this.paddingX * scale;

    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;

    const maxVisibleLines = Math.floor(height / lineHeight) - 1;
    let visibleChars = this.revealedCharCount;
    let drawY = y + (32 * scale);

    for (let i = 0; i < this.lines.length && i < maxVisibleLines; i++) {
      const wrappedLine = this.lines[i];
      if (visibleChars <= 0) break;

      const textToDraw = wrappedLine.slice(0, visibleChars);
      ctx.fillText(textToDraw, x + paddingX, drawY);
      drawY += lineHeight;
      visibleChars -= wrappedLine.length;
    }

    // If text is truncated, show ellipsis on last line
    if (this.lines.length > maxVisibleLines && visibleChars > 0) {
      ctx.fillText('…', x + width - paddingX - (8 * scale), drawY - lineHeight);
    }

    ctx.restore();
  }

  public isFinished(): boolean {
    return this.revealedCharCount >= this.fullText.length;
  }

  public clear(): void {
    this.fullText = '';
    this.lines = [];
    this.revealedCharCount = 0;
    this.elapsed = 0;
  }

  public skipToEnd(): void {
    this.revealedCharCount = this.fullText.length;
    this.elapsed = this.fullText.length * this.charDelay;
  }

  private wrapText(line: DialogueLine): string[] {
    const { width } = line.textBoxRect;
    const words = line.text.split(/\s+/);
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.font = line.font ?? '24px monospace';

    const scale = getUniformScaleFactor();
    const paddingX = this.paddingX * scale;

    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > width - 2 * paddingX && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
}
