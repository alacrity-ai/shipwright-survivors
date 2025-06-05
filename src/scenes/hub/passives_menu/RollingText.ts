// src/scenes/hub/passives_menu/RollingText.ts

export class RollingText {
  private currentLength = 0;
  private startTime = 0;
  private isFinished = false;
  private schedule: number[] = [];

  constructor(
    private readonly fullText: string,
    private readonly baseDelayMs: number,
    private readonly jitter: number = 0 // e.g., ±20ms
  ) {}

  start(now: number): void {
    this.startTime = now;
    this.currentLength = 0;
    this.isFinished = false;

    // Precompute randomized schedule
    this.schedule = [];
    let acc = 0;
    for (let i = 0; i < this.fullText.length; i++) {
      const delta = this.baseDelayMs + (Math.random() * 2 - 1) * this.jitter;
      acc += Math.max(0, delta); // clamp negative jitter
      this.schedule.push(acc);
    }
  }

  update(now: number): void {
    if (this.isFinished) return;
    const elapsed = now - this.startTime;

    while (
      this.currentLength < this.schedule.length &&
      elapsed >= this.schedule[this.currentLength]
    ) {
      this.currentLength++;
    }

    if (this.currentLength >= this.fullText.length) {
      this.currentLength = this.fullText.length;
      this.isFinished = true;
    }
  }

  getText(): string {
    return this.fullText.slice(0, this.currentLength);
  }

  done(): boolean {
    return this.isFinished;
  }
}
