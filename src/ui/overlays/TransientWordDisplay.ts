// src/ui/primitives/controllers/TransientWordDisplay.ts

import { CanvasManager } from '@/core/CanvasManager';
import { WordRenderer } from '@/ui/primitives/controllers/WordRenderer';
import {
  getUniformScaleFactor,
  getViewportWidth,
  getViewportHeight,
} from '@/config/view';
import { TransientWordDisplayAnimator } from '@/ui/overlays/TransientWordDisplayAnimator';
import { GlobalEventBus } from '@/core/EventBus';

export type HorizontalAlignment = 'left' | 'center' | 'right';

export class TransientWordDisplay {
  private titleRenderer: WordRenderer;
  private subtitleRenderer: WordRenderer | null;
  private duration: number;
  private scale: number;
  private alignment: HorizontalAlignment;
  private title: string;
  private subtitle: string | null;

  private animator: TransientWordDisplayAnimator;

  private ctx: CanvasRenderingContext2D;
  private elapsed: number = 0;
  private active: boolean = false;
  private started: boolean = false;

  constructor(
    title: string,
    subtitle?: string,
    durationSeconds: number = 2.0,
    alignment: HorizontalAlignment = 'center',
    color: string = '#00ffff',
  ) {
    GlobalEventBus.on('title:show', this.handleRestart);

    this.title = title;
    this.subtitle = subtitle ?? null;
    this.duration = durationSeconds;
    this.alignment = alignment;
    this.scale = getUniformScaleFactor();

    this.ctx = CanvasManager.getInstance().getContext('overlay');

    const titleY = this.getTitleY();

    this.titleRenderer = new WordRenderer(0, titleY, this.scale);
    this.titleRenderer.setWord(title, color);
    this.titleRenderer.setSubtlePulse();

    if (this.subtitle) {
      const subtitleY = titleY + this.getSubtitleOffsetY();
      this.subtitleRenderer = new WordRenderer(0, subtitleY, this.scale * 0.6);
      this.subtitleRenderer.setWord(this.subtitle, color);
      this.subtitleRenderer.setSubtlePulse();
    } else {
      this.subtitleRenderer = null;
    }

    this.recalculateAlignment();
    this.animator = new TransientWordDisplayAnimator(this.titleRenderer, this.subtitleRenderer ?? undefined);
  }

  private getTitleY(): number {
    return getViewportHeight() / 2 - 64 * this.scale;
  }

  private getSubtitleOffsetY(): number {
    return 100 * this.scale;
  }

  private recalculateAlignment(): void {
    const screenWidth = getViewportWidth();

    const titleWidth = this.estimateWordWidth(this.title, this.scale);
    const titleX = this.computeAlignedX(titleWidth, screenWidth);
    const titleY = this.getTitleY();
    this.titleRenderer.setPosition(titleX, titleY);

    if (this.subtitleRenderer && this.subtitle) {
      const subtitleWidth = this.estimateWordWidth(this.subtitle, this.scale * 0.6);
      const subtitleX = this.computeAlignedX(subtitleWidth, screenWidth);
      const subtitleY = titleY + this.getSubtitleOffsetY();
      this.subtitleRenderer.setPosition(subtitleX, subtitleY);
    }
  }

  private estimateWordWidth(word: string, scale: number): number {
    const baseSize = 128 * scale;
    const spacing = 4 * scale;

    let width = 0;
    let i = 0;

    while (i < word.length) {
      let emphasize = false;

      if (word[i] === '<' && i + 2 < word.length && word[i + 2] === '>') {
        emphasize = true;
        i += 3;
      } else {
        i++;
      }

      const glyphSize = emphasize ? baseSize * 1.35 : baseSize;
      const isSpace = word[i - 1] === ' ';

      if (isSpace) {
        width += baseSize * 0.5;
      } else {
        width += (glyphSize / 2) + spacing;
      }
    }

    return width;
  }

  private computeAlignedX(textWidth: number, containerWidth: number): number {
    switch (this.alignment) {
      case 'left':
        return 0;
      case 'right':
        return containerWidth - textWidth;
      case 'center':
      default:
        return (containerWidth - textWidth) / 2;
    }
  }

  public start(): void {
    this.started = true;
    this.active = true;
    this.elapsed = 0;
  }

  public restart(
    title: string,
    subtitle?: string,
    durationSeconds: number = 2.0,
    scale: number = 1.0,
    alignment: HorizontalAlignment = 'center',
    color: string = '#00ffff',
  ): void {
    this.title = title;
    this.subtitle = subtitle ?? null;
    this.duration = durationSeconds;
    this.alignment = alignment;
    this.scale = scale * getUniformScaleFactor();
    this.elapsed = 0;
    this.active = true;
    this.started = true;

    // Reconstruct title renderer
    const titleY = this.getTitleY();
    this.titleRenderer = new WordRenderer(0, titleY, this.scale);
    this.titleRenderer.setWord(this.title, color);
    this.titleRenderer.setSubtlePulse(); // default pulse

    // Reconstruct subtitle renderer if needed
    if (this.subtitle) {
      const subtitleY = titleY + this.getSubtitleOffsetY();
      this.subtitleRenderer = new WordRenderer(0, subtitleY, this.scale * 0.6);
      this.subtitleRenderer.setWord(this.subtitle, color);
      this.subtitleRenderer.setSubtlePulse();
    } else {
      this.subtitleRenderer = null;
    }

    this.recalculateAlignment();
    this.animator = new TransientWordDisplayAnimator(this.titleRenderer, this.subtitleRenderer ?? undefined);
  }

  private readonly handleRestart = (data: {
    title: string;
    subtitle?: string;
    durationSeconds?: number;
    scale?: number;
    alignment?: HorizontalAlignment;
    color?: string;
  }): void => {
    this.restart(data.title, data.subtitle, data.durationSeconds, data.scale, data.alignment, data.color);
  }

  public isActive(): boolean {
    return this.active;
  }

  public hasStarted(): boolean {
    return this.started;
  }

  public update(dt: number): void {
    if (!this.active) return;

    this.elapsed += dt;

    const t = this.elapsed / this.duration;
    this.animator.update(Math.min(Math.max(t, 0), 1)); // Clamp for safety

    if (this.elapsed >= this.duration) {
      this.active = false;
    }
  }

  public render(dt: number): void {
    if (!this.active) return;

    this.titleRenderer.render(this.ctx, dt);
    if (this.subtitleRenderer) {
      this.subtitleRenderer.render(this.ctx, dt);
    }
  }

  public setPulseStyle(style: 'subtle' | 'energetic' | 'breathing' | 'sync'): void {
    const apply = (r: WordRenderer) => {
      switch (style) {
        case 'subtle': r.setSubtlePulse(); break;
        case 'energetic': r.setEnergeticPulse(); break;
        case 'breathing': r.setBreathingPulse(); break;
        case 'sync': r.setSynchronizedPulse(); break;
      }
    };

    apply(this.titleRenderer);
    if (this.subtitleRenderer) apply(this.subtitleRenderer);
  }

  public setY(y: number): void {
    const liftedY = y - 64 * this.scale;
    this.titleRenderer.setPosition(this.titleRenderer['x'], liftedY);

    if (this.subtitleRenderer) {
      const subtitleY = liftedY + this.getSubtitleOffsetY();
      this.subtitleRenderer.setPosition(this.subtitleRenderer['x'], subtitleY);
    }
  }

  public destroy(): void {
    GlobalEventBus.off('title:show', this.handleRestart);
  }
}
