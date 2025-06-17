// src/rendering/FadeManager.ts

import { CanvasManager } from '@/core/CanvasManager';

type FadeCallback = () => void;

class FadeManager {
  private static instance: FadeManager;

  private fadeAlpha = 0;
  private isFading = false;
  private fadeDuration = 500; // milliseconds
  private fadeStartTime = 0;
  private onComplete: FadeCallback | null = null;

  private constructor() {
    // Private to enforce singleton
  }

  public static getInstance(): FadeManager {
    if (!FadeManager.instance) {
      FadeManager.instance = new FadeManager();
    }
    return FadeManager.instance;
  }

  public startFade(callback: FadeCallback, duration: number = 500): void {
    if (this.isFading) return;

    this.isFading = true;
    this.fadeDuration = duration;
    this.fadeAlpha = 0;
    this.fadeStartTime = performance.now();
    this.onComplete = callback;
  }

  public update(): void {
    if (!this.isFading) return;

    const now = performance.now();
    const elapsed = now - this.fadeStartTime;
    const t = Math.min(elapsed / this.fadeDuration, 1);
    this.fadeAlpha = t;

    if (t >= 1) {
      this.isFading = false;
      this.fadeAlpha = 0;
      if (this.onComplete) {
        this.onComplete();
        this.onComplete = null;
      }
    }
  }

  public render(): void {
    if (!this.isFading || this.fadeAlpha <= 0) return;

    const ctx = CanvasManager.getInstance().getContext('overlay');
    if (!ctx) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  public isFadeInProgress(): boolean {
    return this.isFading;
  }
}

export { FadeManager };
