// src/rendering/coachmarks/CoachMarkEntity.ts

import type { CoachMarkBehaviorOptions } from '@/rendering/coachmarks/interfaces/CoachMarkBehaviorOptions';
export type CoachMarkPositionResolver = () => { x: number, y: number };

export abstract class CoachMarkEntity {
  protected elapsed = 0;

  constructor(
    protected getPosition: CoachMarkPositionResolver,
    protected behavior: CoachMarkBehaviorOptions
  ) {}

  update(dt: number): void {
    this.elapsed += dt;
  }

  isExpired(): boolean {
    return this.elapsed >= (this.behavior.duration ?? 2.5);
  }

  abstract render(ctx: CanvasRenderingContext2D): void;
}
