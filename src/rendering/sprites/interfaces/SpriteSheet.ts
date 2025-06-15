// src/rendering/spritesheet/interfaces/SpriteSheet.ts

export interface SpriteSheet {
  getFrameAt(col: number, row: number): CanvasImageSource;
  getFramesAt(coords: [number, number][]): CanvasImageSource[];
  getTotalFrames(): number;
}
