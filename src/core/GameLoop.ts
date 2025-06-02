// src/core/GameLoop.ts
type UpdateCallback = (deltaTime: number) => void;
type RenderCallback = (deltaTime: number) => void;

export class GameLoop {
  private lastFrameTime: number = performance.now();
  private startTime: number = this.lastFrameTime;
  private isRunning = false;
  private updateCallbacks: UpdateCallback[] = [];
  private renderCallbacks: RenderCallback[] = [];
  private frameRequestId: number | null = null;
  private currentDeltaTime: number = 0;

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.startTime = this.lastFrameTime;
    this.frameRequestId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.isRunning = false;
    if (this.frameRequestId !== null) {
      cancelAnimationFrame(this.frameRequestId);
      this.frameRequestId = null;
    }
  }

  getElapsedSeconds(): number {
    return (performance.now() - this.startTime) / 1000;
  }

  private tick = (timestamp: number) => {
    if (!this.isRunning) return;

    const deltaTime = (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;
    this.currentDeltaTime = deltaTime;

    this.updateCallbacks.forEach(cb => cb(deltaTime));
    this.renderCallbacks.forEach(cb => cb(deltaTime));

    this.frameRequestId = requestAnimationFrame(this.tick);
  };

  getDeltaTime(): number {
    return this.currentDeltaTime;
  }

  onUpdate(cb: UpdateCallback) {
    this.updateCallbacks.push(cb);
  }

  offUpdate(cb: UpdateCallback) {
    this.updateCallbacks = this.updateCallbacks.filter(fn => fn !== cb);
  }

  onRender(cb: RenderCallback) {
    this.renderCallbacks.push(cb);
  }

  offRender(cb: RenderCallback) {
    this.renderCallbacks = this.renderCallbacks.filter(fn => fn !== cb);
  }
}
