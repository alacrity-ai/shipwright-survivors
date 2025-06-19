import type { Ship } from '@/game/ship/Ship';
import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { BaseAIState } from './BaseAIState';
import { isWithinRange } from '@/systems/ai/helpers/ShipUtils';
import { leadTarget } from '@/systems/ai/steering/SteeringHelper';
import { IdleState } from './IdleState';

export class SpaceStationAttackState extends BaseAIState {
  private readonly target: Ship;
  private readonly attackRange = 1600;
  private readonly projectileSpeed = 400;

  constructor(controller: AIControllerSystem, ship: Ship, target: Ship) {
    super(controller, ship);
    this.target = target;
  }

  update(dt: number): ShipIntent {
    const selfTransform = this.ship.getTransform();
    const targetTransform = this.target.getTransform();

    return {
      movement: {
        thrustForward: false,
        brake: false,
        rotateLeft: false,
        rotateRight: false,
        strafeLeft: false,
        strafeRight: false,
      },
      weapons: {
        firePrimary: true,
        fireSecondary: false,
        aimAt: leadTarget(
          selfTransform.position,
          targetTransform.position,
          targetTransform.velocity,
          this.projectileSpeed
        ),
      },
      utility: {
        toggleShields: false,
      },
    };
  }

  transitionIfNeeded(): BaseAIState | null {
    const selfTransform = this.ship.getTransform();
    const targetTransform = this.target.getTransform();

    if (!isWithinRange(selfTransform.position, targetTransform.position, this.attackRange)) {
      return new IdleState(this.controller, this.ship);
    }

    return null;
  }
}
