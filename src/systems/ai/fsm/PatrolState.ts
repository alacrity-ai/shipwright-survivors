import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { Ship } from '@/game/ship/Ship';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { WORLD_WIDTH, WORLD_HEIGHT } from '@/config/world';
import { BaseAIState } from './BaseAIState';
import { approachTarget } from '@/systems/ai/steering/SteeringHelper';
import { isWithinRange } from '@/systems/ai/helpers/ShipUtils';
import { findNearestTarget } from '@/systems/ai/helpers/ShipUtils';
import { SeekTargetState } from './SeekTargetState';

export class PatrolState extends BaseAIState {
  private patrolTarget: { x: number; y: number };
  private dwellTime = 0;
  private readonly dwellDuration = 4; // seconds
  private readonly patrolRadius = 6000;
  private readonly wakeRadius = 3600;

  constructor(controller: AIControllerSystem, ship: Ship) {
    super(controller, ship);
    this.patrolTarget = this.chooseNewPatrolTarget();
  }

  update(dt: number): ShipIntent {
    const selfPos = this.ship.getTransform().position;
    const velocity = this.ship.getTransform().velocity;

    // Are we near our patrol target?
    const closeEnough = isWithinRange(selfPos, this.patrolTarget, 100);

    if (closeEnough) {
      this.dwellTime += dt;
      if (this.dwellTime >= this.dwellDuration) {
        this.patrolTarget = this.chooseNewPatrolTarget();
        this.dwellTime = 0;
      }

      // Idle for now
      return {
        movement: {
          thrustForward: false,
          brake: true,
          rotateLeft: false,
          rotateRight: false,
          strafeLeft: false,
          strafeRight: false,
        },
        weapons: {
          firePrimary: false,
          fireSecondary: false,
          aimAt: this.patrolTarget,
        },
        utility: {
          toggleShields: false,
        },
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
      utility: {
        toggleShields: false,
      },
    };
  }

  transitionIfNeeded(): BaseAIState | null {
    // === Hunter override: always seek if a target is visible ===
    if (this.controller.isHunter()) {
      const playerShip = ShipRegistry.getInstance().getPlayerShip();
      if (playerShip) {
        this.controller.setInitialState(new SeekTargetState(this.controller, this.ship, playerShip));
        return new SeekTargetState(this.controller, this.ship, playerShip);
      }
    }

    const nearestTarget = findNearestTarget(this.ship, this.wakeRadius);
    if (!nearestTarget) return null;

    // === Normal behavior: only seek if within range ===
    const targetPos = nearestTarget.getTransform().position;
    const selfPos = this.ship.getTransform().position;

    const inRange = isWithinRange(selfPos, targetPos, this.wakeRadius);
    return inRange
      ? new SeekTargetState(this.controller, this.ship, nearestTarget)
      : null;
  }

  private chooseNewPatrolTarget(): { x: number; y: number } {
    const selfPos = this.ship.getTransform().position;

    // Generate a random offset within the patrol radius
    const angle = Math.random() * 2 * Math.PI;
    const radius = Math.random() * this.patrolRadius;

    const rawX = selfPos.x + Math.cos(angle) * radius;
    const rawY = selfPos.y + Math.sin(angle) * radius;

    // Enforce a 1000-unit margin from world borders
    const halfWidth = WORLD_WIDTH / 2;
    const halfHeight = WORLD_HEIGHT / 2;
    const borderMargin = 1000;

    const minX = -halfWidth + borderMargin;
    const maxX = +halfWidth - borderMargin;
    const minY = -halfHeight + borderMargin;
    const maxY = +halfHeight - borderMargin;

    return {
      x: Math.max(minX, Math.min(maxX, rawX)),
      y: Math.max(minY, Math.min(maxY, rawY)),
    };
  }
}
