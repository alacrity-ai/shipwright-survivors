// src/systems/ai/fsm/BaseAIState.ts

import type { Ship } from '@/game/ship/Ship';
import type { ShipIntent, IntentSOA } from '@/core/intent/interfaces/ShipIntent';
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
   * Called once when exiting this state.
   * Default implementation is a no-op. Override as needed.
   * Use this for cleanup (e.g., releasing anchor slots).
   */
  public onExit(): void {
    // NOOP by default
  }

  /**
   * LEGACY: Emit a ShipIntent object for this frame.
   * This will be phased out as all states move to SOA.
   */
  abstract update(dt: number): ShipIntent;

  /**
   * NEW: Write directly into the SOA for this controller’s slot.
   * Avoids any object allocation.
   */
  abstract updateSOA(dt: number, soa: IntentSOA, idx: number): void;

  /**
   * Optionally transition to a new state. Called after update/updateSOA.
   */
  abstract transitionIfNeeded(): BaseAIState | null;
}
