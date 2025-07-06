import { getMinimalistLetterIcon } from '@/rendering/cache/Letters';

import { getUniformScaleFactor } from '@/config/view';

export class WordRenderer {
  private word: string = '';
  private readonly icons: (HTMLCanvasElement | null)[] = [];

  constructor(
    private x: number,
    private y: number,
    private scale: number = getUniformScaleFactor(),
  ) {}

  public setWord(word: string): void {
    this.word = word.toUpperCase();
    this.icons.length = 0;

    for (const char of this.word) {
      if (char === ' ') {
        this.icons.push(null);
      } else {
        try {
          this.icons.push(getMinimalistLetterIcon(char));
        } catch {
          console.warn(`[WordRenderer] Unsupported character: '${char}'`);
          this.icons.push(null);
        }
      }
    }
  }

  public setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  public setScale(scale: number): void {
    this.scale = scale;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const glyphSize = 128 * this.scale;
    const spacing = 4 * this.scale;

    let cursorX = this.x;

    for (const icon of this.icons) {
      if (icon === null) {
        // Space character or unsupported glyph
        cursorX += glyphSize * 0.5;
        continue;
      }

      const drawWidth = glyphSize;
      const drawHeight = glyphSize;
      const drawY = this.y - drawHeight / 2;

      ctx.drawImage(icon, cursorX, drawY, drawWidth, drawHeight);
      cursorX += (glyphSize / 2) + spacing;
    }
  }
}

/* Usage:
const wordRenderer = new WordRenderer(100, 200, 1.5);
wordRenderer.setWord('SHIP HOP');

function draw(ctx: CanvasRenderingContext2D) {
  wordRenderer.render(ctx);
}
*/