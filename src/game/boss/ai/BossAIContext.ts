// src/game/boss/ai/BossAIContext.ts

import type { Ship } from '@/game/ship/Ship';

/**
 * Scratch runtime context object passed into every BossState on update().
 * Reused each frame to avoid allocation, and precomputes core spatial/health data.
 */
export class BossAIContext {
  public ship: Ship;
  public player: Ship;

  /** Fractional boss HP (0.0–1.0) */
  public healthPercent: number = 1.0;

  /** Angle (radians) from boss to player in world-space */
  public angleToPlayer: number = 0;

  /** Euclidean distance to player (precomputed for efficiency) */
  public distanceToPlayer: number = 0;

  constructor(ship: Ship, player: Ship) {
    this.ship = ship;
    this.player = player;
    this.update(ship, player);
  }

  /**
   * Refreshes all derived values based on the current frame state.
   * Must be called before each `BossState.update()`.
   */
  public update(ship: Ship, player: Ship): void {
    this.ship = ship;
    this.player = player;

    const hp = ship.getCurrentHealth();
    const maxHp = ship.getMaxHealth();
    this.healthPercent = maxHp > 0 ? hp / maxHp : 1.0;

    const bossPos = ship.getTransform().position;
    const playerPos = player.getTransform().position;

    const dx = playerPos.x - bossPos.x;
    const dy = playerPos.y - bossPos.y;

    this.angleToPlayer = Math.atan2(dy, dx) + Math.PI / 2;
    this.distanceToPlayer = Math.hypot(dx, dy);
  }
}