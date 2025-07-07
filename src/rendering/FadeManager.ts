// src/rendering/FadeManager.ts

import { CanvasManager } from '@/core/CanvasManager';

type FadeCallback = () => void;
type FadeMode = 'in' | 'out';

class FadeManager {
  private static instance: FadeManager;

  private fadeAlpha = 0;
  private isFading = false;
  private fadeDuration = 500; // milliseconds
  private fadeStartTime = 0;
  private fadeMode: FadeMode = 'out';
  private onComplete: FadeCallback | null = null;

  private constructor() {}

  public static getInstance(): FadeManager {
    if (!FadeManager.instance) {
      FadeManager.instance = new FadeManager();
    }
    return FadeManager.instance;
  }

  /**
   * Starts a new fade, even if one is already in progress.
   * Interrupts any current fade cleanly.
   */
  public startFade(callback: FadeCallback, duration: number = 500): void {
    this.isFading = true;
    this.fadeMode = 'out';
    this.fadeDuration = duration;
    this.fadeAlpha = 0;
    this.fadeStartTime = performance.now();
    this.onComplete = callback;
  }

  public fadeFromBlackAfterDelay(holdDuration = 3000, fadeInDuration = 800): void {
    this.isFading = true;
    this.fadeMode = 'in';
    this.fadeAlpha = 1.0;
    this.fadeDuration = fadeInDuration;
    this.fadeStartTime = performance.now() + holdDuration;
    this.onComplete = null;
  }

  public update(): void {
    if (!this.isFading) return;

    const now = performance.now();
    const delayElapsed = now >= this.fadeStartTime;

    if (!delayElapsed) {
      this.fadeAlpha = this.fadeMode === 'in' ? 1.0 : 0.0;
      return;
    }

    const elapsed = now - this.fadeStartTime;
    const t = Math.min(elapsed / this.fadeDuration, 1);

    if (this.fadeMode === 'out') {
      this.fadeAlpha = t;

      if (t >= 1) {
        const cb = this.onComplete;
        this.onComplete = null;

        // Scene transition may trigger a new fade, so do it before changing state.
        if (cb) cb();

        // If a new fade began during the callback, we must not override it.
        // So only switch to 'in' if still fading *and* no new fade has started.
        if (this.isFading && this.fadeMode === 'out') {
          this.fadeMode = 'in';
          this.fadeAlpha = 1.0;
          this.fadeStartTime = performance.now();
        }
      }
    } else if (this.fadeMode === 'in') {
      this.fadeAlpha = 1 - t;

      if (t >= 1) {
        this.fadeAlpha = 0;
        this.isFading = false;
        CanvasManager.getInstance().clearLayer('fade');
      }
    }
  }

  public render(): void {
    if (!this.isFading || this.fadeAlpha <= 0) return;

    const ctx = CanvasManager.getInstance().getContext('fade');
    if (!ctx) {
      console.warn('[FadeManager] Fade canvas not found');
      return;
    }

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  public isFadeInProgress(): boolean {
    return this.isFading;
  }
}

export { FadeManager };
