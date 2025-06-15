// src/rendering/spritesheet/AnimatedSprite.ts

export class AnimatedSprite {
  private currentFrameIndex = 0;
  private timeAccumulator = 0;
  private playing = true;
  private scale = 1.0;

  constructor(
    private frames: CanvasImageSource[],
    private animationSpeed: number // in frames/sec
  ) {}

  update(dt: number): void {
    if (!this.playing) return;
    this.timeAccumulator += dt;
    const frameDuration = 1 / this.animationSpeed;
    while (this.timeAccumulator >= frameDuration) {
      this.currentFrameIndex = (this.currentFrameIndex + 1) % this.frames.length;
      this.timeAccumulator -= frameDuration;
    }
  }

  draw(ctx: CanvasRenderingContext2D, x: number = 0, y: number = 0): void {
    const frame = this.frames[this.currentFrameIndex];
    const width = (frame as HTMLCanvasElement).width * this.scale;
    const height = (frame as HTMLCanvasElement).height * this.scale;

    ctx.drawImage(frame, x, y, width, height);
  }

  play() { this.playing = true; }
  pause() { this.playing = false; }
  reset(): void {
    this.currentFrameIndex = 0;
    this.timeAccumulator = 0;
  }

  setScale(scale: number): void {
    this.scale = scale;
  }
}
