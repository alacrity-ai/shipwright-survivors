import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';
import type { AIControllerSystem } from '../AIControllerSystem';

import { BaseAIState } from './BaseAIState';
import { SpaceStationBehaviorProfile } from '../types/BehaviorProfile';
import { isWithinRange } from '../helpers/ShipUtils';
import { findNearestTarget } from '../helpers/ShipUtils'; // Assumed
import { SpaceStationAttackState } from './SpaceStationAttackState';
import { SeekTargetState } from './SeekTargetState';

export class IdleState extends BaseAIState {
  private readonly wakeRadius = 1600; // Shared for both mobile and station AI

  update(): ShipIntent {
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
        firePrimary: false,
        fireSecondary: false,
        aimAt: { x: 0, y: 0 },
      },
      utility: {
        toggleShields: false,
      },
    };
  }

  transitionIfNeeded(): BaseAIState | null {
    const behaviorProfile = this.controller.getBehaviorProfile();
    const nearestTarget = findNearestTarget(this.ship, this.wakeRadius);

    if (!nearestTarget) return null;

    const selfPos = this.ship.getTransform().position;
    const targetPos = nearestTarget.getTransform().position;

    const inWakeRange = isWithinRange(selfPos, targetPos, this.wakeRadius);

    if (!inWakeRange) return null;

    console.log('[AI] Behavior profile: ', behaviorProfile);

    if (behaviorProfile === SpaceStationBehaviorProfile) {
      return new SpaceStationAttackState(this.controller, this.ship, nearestTarget);
    }

    // Default AI profiles transition to SeekTargetState
    return new SeekTargetState(this.controller, this.ship, nearestTarget);
  }
}
