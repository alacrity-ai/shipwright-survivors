// src/systems/ai/fsm/PatrolState.ts

import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { Ship } from '@/game/ship/Ship';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { getWorldWidth, getWorldHeight } from '@/config/world';
import { BaseAIState } from './BaseAIState';
import { approachTarget } from '@/systems/ai/steering/SteeringHelper';
import { findNearestTarget } from '@/systems/ai/helpers/ShipUtils';
import { SeekTargetState } from './SeekTargetState';

// === Preallocated idle intent structures ===
const IDLE_MOVEMENT = {
  thrustForward: false,
  brake: true,
  rotateLeft: false,
  rotateRight: false,
  strafeLeft: false,
  strafeRight: false,
} as const;

const IDLE_UTILITY = {
  toggleShields: false,
} as const;

export class PatrolState extends BaseAIState {
  private patrolTarget: { x: number; y: number };
  private dwellTime = 0;
  private readonly dwellDuration = 4;
  private readonly patrolRadius = 6000;
  private readonly wakeRadius = 3400;

  constructor(controller: AIControllerSystem, ship: Ship) {
    super(controller, ship);
    this.patrolTarget = this.chooseNewPatrolTarget();
  }

  public update(dt: number): ShipIntent {
    const transform = this.ship.getTransform();
    const selfPos = transform.position;
    const velocity = transform.velocity;

    const dx = selfPos.x - this.patrolTarget.x;
    const dy = selfPos.y - this.patrolTarget.y;
    const distSq = dx * dx + dy * dy;

    const closeEnough = distSq <= 100 * 100;
    if (closeEnough) {
      this.dwellTime += dt;
      if (this.dwellTime >= this.dwellDuration) {
        this.patrolTarget = this.chooseNewPatrolTarget();
        this.dwellTime = 0;
      }

      return {
        movement: IDLE_MOVEMENT,
        weapons: {
          firePrimary: false,
          fireSecondary: false,
          aimAt: this.patrolTarget,
        },
        utility: IDLE_UTILITY,
      };
    }

    const movement = approachTarget(this.ship, this.patrolTarget, velocity);

    return {
      movement,
      weapons: {
        firePrimary: false,
        fireSecondary: false,
        aimAt: this.patrolTarget,
      },
      utility: IDLE_UTILITY,
    };
  }

  public transitionIfNeeded(): BaseAIState | null {
    // === Hunter override: always seek if player is visible ===
    if (this.controller.isHunter()) {
      const playerShip = ShipRegistry.getInstance().getPlayerShip();
      if (playerShip) {
        const seek = new SeekTargetState(this.controller, this.ship, playerShip);
        this.controller.setInitialState(seek);
        return seek;
      }
    }

    const nearestTarget = findNearestTarget(this.ship, this.wakeRadius);
    if (!nearestTarget) return null;

    const targetPos = nearestTarget.getTransform().position;
    const selfPos = this.ship.getTransform().position;

    const dx = selfPos.x - targetPos.x;
    const dy = selfPos.y - targetPos.y;
    const distSq = dx * dx + dy * dy;

    return distSq <= this.wakeRadius * this.wakeRadius
      ? new SeekTargetState(this.controller, this.ship, nearestTarget)
      : null;
  }

  private chooseNewPatrolTarget(): { x: number; y: number } {
    const { x: px, y: py } = this.ship.getTransform().position;

    const angle = Math.random() * 2 * Math.PI;
    const radius = Math.random() * this.patrolRadius;

    const rawX = px + Math.cos(angle) * radius;
    const rawY = py + Math.sin(angle) * radius;

    const halfWidth = getWorldWidth() / 2;
    const halfHeight = getWorldHeight() / 2;
    const margin = 1000;

    return {
      x: Math.max(-halfWidth + margin, Math.min(halfWidth - margin, rawX)),
      y: Math.max(-halfHeight + margin, Math.min(halfHeight - margin, rawY)),
    };
  }
}
