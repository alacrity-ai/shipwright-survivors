// src/ui/primitives/controllers/TransientWordDisplayAnimator.ts

import type { WordRenderer } from '@/ui/primitives/controllers/WordRenderer';

export class TransientWordDisplayAnimator {
  private readonly title: WordRenderer;
  private readonly subtitle?: WordRenderer;

  constructor(title: WordRenderer, subtitle?: WordRenderer) {
    this.title = title;
    this.subtitle = subtitle;
  }

  /**
   * Apply fade-in and fade-out opacity transitions based on normalized time [0, 1]
   */
  public update(normalizedTime: number): void {
    let opacity: number;

    if (normalizedTime < 0.15) {
      // Fade in
      opacity = normalizedTime / 0.15;
    } else if (normalizedTime > 0.85) {
      // Fade out
      opacity = (1.0 - normalizedTime) / 0.15;
    } else {
      // Fully visible
      opacity = 1.0;
    }

    this.title.setOpacity(opacity);
    if (this.subtitle) {
      this.subtitle.setOpacity(opacity);
    }
  }
}
