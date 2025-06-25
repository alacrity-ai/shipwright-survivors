// src/ui/PopupMessageSystem.ts

import { CanvasManager } from '@/core/CanvasManager';
import { drawLabel } from '@/ui/primitives/UILabel';

interface PopupMessage {
  text: string;
  duration: number;
  elapsed: number;
  color?: string;
  font?: string;
  glow?: boolean;
  yOffset: number;
}

export class PopupMessageSystem {
  private ctx: CanvasRenderingContext2D;
  private messages: PopupMessage[] = [];

  private activeTimer: {
    remaining: number;
    font: string;
    color: string;
    glow: boolean;
  } | null = null;

  constructor() {
    this.ctx = CanvasManager.getInstance().getContext('ui');
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

  /**
   * Sets an active persistent HUD timer (in seconds).
   * Automatically updated and rendered each frame.
   */
  setTimer(seconds: number): void {
    this.activeTimer = {
      remaining: seconds,
      font: '36px monospace',
      color: '#ffaa00',
      glow: true,
    };
  }

  /**
   * Clears the active HUD timer if present.
   */
  clearTimer(): void {
    this.activeTimer = null;
  }

  update(dt: number): void {
    for (const msg of this.messages) {
      msg.elapsed += dt;
    }
    this.messages = this.messages.filter(msg => msg.elapsed < msg.duration);

    if (this.activeTimer) {
      this.activeTimer.remaining -= dt;
      if (this.activeTimer.remaining <= 0) {
        this.activeTimer = null;
      }
    }
  }

  render(): void {
    const baseX = this.ctx.canvas.width / 2;
    const baseY = this.ctx.canvas.height * 0.35;
    const lineHeight = 36;

    for (let i = 0; i < this.messages.length; i++) {
      const msg = this.messages[i];

      const progress = msg.elapsed / msg.duration;
      const alpha = 1 - progress;
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

    // === Timer HUD ===
    if (this.activeTimer) {
      const seconds = Math.max(0, Math.ceil(this.activeTimer.remaining));
      const text = `${seconds}s`;
      const y = this.ctx.canvas.height * 0.18;

      drawLabel(this.ctx, baseX, y, text, {
        font: this.activeTimer.font,
        align: 'center',
        alpha: 1,
        glow: this.activeTimer.glow,
        color: this.activeTimer.color,
        shadowBlur: 4,
      });
    }
  }
}
