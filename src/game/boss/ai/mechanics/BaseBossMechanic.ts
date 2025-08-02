// src/game/boss/ai/mechanics/BaseBossMechanic.ts

/**
 * Contract for a time-bound boss mechanic.
 * Mechanics are executed concurrently with FSM states and handle their own lifecycle.
 */
export interface BaseBossMechanic {
  /**
   * Called once when the mechanic is first activated.
   * Use this for setup, emitter spawning, audio, etc.
   */
  start(): void;

  /**
   * Called every simulation frame with time delta in seconds.
   * This is where mechanics perform their logic (damage, visuals, timers, etc.).
   */
  update(dt: number): void;

  /**
   * Returns true if the mechanic has completed and should be removed.
   */
  isFinished(): boolean;

  /**
   * Called once when the mechanic finishes or is forcibly terminated.
   * Use this to clean up emitters, stop sounds, and restore state.
   */
  cleanup(): void;
}
