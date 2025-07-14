// src/systems/controls/aiming/AimProvider.ts
import type { Ship } from '@/game/ship/Ship';
import type { Vec2 } from '@/systems/ai/helpers/VectorUtils';

export interface AimProvider {
  /**
   * Returns the world-space point at which the player should aim
   * for the current frame.  Implementations may be stateful.
   */
  getAimPoint(ship: Ship): Vec2;

  /** Should be invoked each frame so the provider can update its cache. */
  tick(dt: number, ship: Ship): void;

  /** Returns true while the provider maintains a positive lock on a target */
  isLocked(): boolean;
}
