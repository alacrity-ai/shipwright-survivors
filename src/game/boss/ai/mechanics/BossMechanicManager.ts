// src/game/boss/ai/mechanics/BossMechanicManager.ts

import type { BaseBossMechanic } from './BaseBossMechanic';

/**
 * Central runtime manager for time-bound boss mechanics.
 * Owned by the FSM controller; updated each simulation frame.
 */
export class BossMechanicManager {
  private readonly activeMechanics: BaseBossMechanic[] = [];

  /**
   * Adds a new mechanic to the active pool and immediately calls its start() hook.
   * @param mechanic A time-bound, autonomous boss mechanic.
   */
  add(mechanic: BaseBossMechanic): void {
    this.activeMechanics.push(mechanic);
    mechanic.start();
  }

  /**
   * Updates all active mechanics, removing those that have completed.
   * Should be called once per simulation frame.
   * @param dt Time delta in seconds.
   */
  update(dt: number): void {
    const survivors: BaseBossMechanic[] = [];

    for (let i = 0; i < this.activeMechanics.length; i++) {
      const mech = this.activeMechanics[i];
      mech.update(dt);

      if (!mech.isFinished()) {
        survivors.push(mech);
      } else {
        mech.cleanup();
      }
    }

    this.activeMechanics.length = 0;
    for (let i = 0; i < survivors.length; i++) {
      this.activeMechanics[i] = survivors[i];
    }
  }

  /**
   * Immediately clears all active mechanics, calling their cleanup() hooks.
   * Useful on boss death or transition cancellation.
   */
  clear(): void {
    for (let i = 0; i < this.activeMechanics.length; i++) {
      this.activeMechanics[i].cleanup();
    }
    this.activeMechanics.length = 0;
  }

  /**
   * Returns true if any mechanics are currently active.
   * Can be used to block transitions or synchronize state expiry.
   */
  hasActiveMechanics(): boolean {
    return this.activeMechanics.length > 0;
  }
}
