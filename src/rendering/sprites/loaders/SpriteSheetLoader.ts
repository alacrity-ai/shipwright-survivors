// src/rendering/sprites/loaders/SpriteSheetLoader.ts

import { getAssetPath } from '@/shared/assetHelpers';
import type { SpriteSheet } from '@/rendering/sprites/interfaces/SpriteSheet';

class SpriteSheetLoader {
  constructor(
    private readonly path: string,
    private readonly columns: number,
    private readonly rows: number,
    private readonly frameWidth: number,
    private readonly frameHeight: number
  ) {}

  public async load(): Promise<SpriteSheet> {
    const image = await this.loadImage();
    return new BasicSpriteSheet(
      image,
      this.columns,
      this.rows,
      this.frameWidth,
      this.frameHeight
    );
  }

  private loadImage(): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = getAssetPath(this.path);
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(new Error(`[SpriteSheetLoader] Failed to load image at: ${img.src}`));
    });
  }
}

class BasicSpriteSheet implements SpriteSheet {
  private readonly frames: CanvasImageSource[] = [];

  constructor(
    image: HTMLImageElement,
    private readonly columns: number,
    private readonly rows: number,
    private readonly frameWidth: number,
    private readonly frameHeight: number
  ) {
    this.sliceFrames(image);
  }

  private sliceFrames(image: HTMLImageElement): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.columns; col++) {
        const canvas = document.createElement('canvas');
        canvas.width = this.frameWidth;
        canvas.height = this.frameHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          image,
          col * this.frameWidth,
          row * this.frameHeight,
          this.frameWidth,
          this.frameHeight,
          0,
          0,
          this.frameWidth,
          this.frameHeight
        );
        this.frames.push(canvas);
      }
    }
  }

  public getFrameAt(col: number, row: number): CanvasImageSource {
    if (col >= this.columns || row >= this.rows) {
      throw new Error(
        `[BasicSpriteSheet] Invalid frame coordinates: col=${col}, row=${row}, max=${this.columns - 1}x${this.rows - 1}`
      );
    }
    return this.frames[row * this.columns + col];
  }

  public getFramesAt(coords: [number, number][]): CanvasImageSource[] {
    return coords.map(([col, row]) => this.getFrameAt(col, row));
  }

  public getTotalFrames(): number {
    return this.frames.length;
  }
}

export { SpriteSheetLoader };
