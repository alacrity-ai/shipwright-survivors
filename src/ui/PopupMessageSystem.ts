import type { CanvasManager } from '@/core/CanvasManager';
import { drawLabel } from '@/ui/primitives/UILabel';

interface PopupMessage {
  text: string;
  duration: number;
  elapsed: number;
  color?: string;
  font?: string;
  glow?: boolean;
  yOffset: number; // dynamic Y offset for vertical stack
}

export class PopupMessageSystem {
  private ctx: CanvasRenderingContext2D;
  private messages: PopupMessage[] = [];

  constructor(private readonly canvasManager: CanvasManager) {
    this.ctx = canvasManager.getContext('ui');
  }

  /**
   * Displays a CRT-style popup message
   * @param text The message to display
   * @param options Optional appearance and timing
   */
  displayMessage(
    text: string,
    options?: {
      duration?: number;      // default: 3 seconds
      color?: string;         // default: '#00ff00'
      font?: string;          // default: '28px monospace'
      glow?: boolean;         // default: true
    }
  ): void {
    this.messages.push({
      text,
      duration: options?.duration ?? 3,
      elapsed: 0,
      color: options?.color ?? '#00ff00',
      font: options?.font ?? '28px monospace',
      glow: options?.glow ?? true,
      yOffset: 0,
    });
  }

  update(dt: number): void {
    for (const msg of this.messages) {
      msg.elapsed += dt;
    }
    this.messages = this.messages.filter(msg => msg.elapsed < msg.duration);
  }

  render(): void {
    const baseX = this.ctx.canvas.width / 2;
    const baseY = this.ctx.canvas.height * 0.35; // upper-center

    const lineHeight = 36;
    const now = performance.now() / 1000;

    for (let i = 0; i < this.messages.length; i++) {
      const msg = this.messages[i];

      const progress = msg.elapsed / msg.duration;
      const alpha = 1 - progress;

      // Float upward
      const y = baseY - i * lineHeight - progress * 30;

      drawLabel(this.ctx, baseX, y, msg.text, {
        font: msg.font,
        align: 'center',
        alpha,
        glow: msg.glow,
        shadowBlur: 0,
        color: msg.color,
      });
    }
  }
}
