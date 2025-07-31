// src/game/boss/ai/BossAIController.ts

export class BossAIController {
  constructor() {
    // Future: initialize FSM, timers, state tracking, etc.
  }

  /** Called every simulation tick by BossFightManager. */
  public update(dt: number): void {
    // Stub — no-op for now
  }

  /** Called on clear() or destroy() to reset internal state. */
  public destroy(): void {
    // Stub — cleanup hooks, detach listeners if needed
  }

  public start(): void {
    // Maybe take initialstate as an argument?
    // Future: Initialize FSM, timers, state tracking, etc.
  }
}
