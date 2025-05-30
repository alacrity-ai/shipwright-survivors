// src/core/GameLoop.ts

type UpdateCallback = (deltaTime: number) => void;
type RenderCallback = (deltaTime: number) => void;

export class GameLoop {
  private lastFrameTime: number = performance.now();
  private isRunning = false;
  private updateCallbacks: UpdateCallback[] = [];
  private renderCallbacks: RenderCallback[] = [];

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    requestAnimationFrame(this.tick);
  }

  stop() {
    this.isRunning = false;
  }

  private tick = (timestamp: number) => {
    if (!this.isRunning) return;

    const deltaTime = (timestamp - this.lastFrameTime) / 1000; // in seconds
    this.lastFrameTime = timestamp;

    this.updateCallbacks.forEach(cb => cb(deltaTime));
    this.renderCallbacks.forEach(cb => cb(deltaTime));

    requestAnimationFrame(this.tick);
  };

  onUpdate(cb: UpdateCallback) {
    this.updateCallbacks.push(cb);
  }

  onRender(cb: RenderCallback) {
    this.renderCallbacks.push(cb);
  }
}
