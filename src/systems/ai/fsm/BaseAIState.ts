// src/systems/ai/fsm/BaseAIState.ts

import type { Ship } from '@/game/ship/Ship';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';
import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';

export abstract class BaseAIState {
  protected ship: Ship;
  protected controller: AIControllerSystem;

  constructor(controller: AIControllerSystem, ship: Ship) {
    this.controller = controller;
    this.ship = ship;
  }

  /**
   * Called once upon entering this state.
   * Default implementation is a no-op. Override as needed.
   */
  public onEnter(): void {
    // NOOP by default
  }

  /**
   * Emit a ShipIntent for this frame.
   */
  abstract update(dt: number): ShipIntent;

  /**
   * Optionally transition to a new state. Called after `update()`.
   */
  abstract transitionIfNeeded(): BaseAIState | null;
}
