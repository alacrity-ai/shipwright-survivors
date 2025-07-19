// src/systems/ai/fsm/IdleState.ts

import type { IntentSOA } from '@/core/intent/interfaces/ShipIntent';
import type { AIControllerSystem } from '../AIControllerSystem';

import { FormationState } from './FormationState';
import { BaseAIState } from './BaseAIState';
import { SpaceStationBehaviorProfile } from '../types/BehaviorProfile';
import { isWithinRange, findNearestTarget } from '../helpers/ShipUtils';
import { SpaceStationAttackState } from './SpaceStationAttackState';
import { SeekTargetState } from './SeekTargetState';

// Utility to zero all relevant SOA flags
function zeroAllIntents(soa: IntentSOA, idx: number): void {
  soa.thrustForward[idx] = 0;
  soa.brake[idx] = 0;
  soa.rotateLeft[idx] = 0;
  soa.rotateRight[idx] = 0;
  soa.strafeLeft[idx] = 0;
  soa.strafeRight[idx] = 0;

  soa.firePrimary[idx] = 0;
  soa.fireSecondary[idx] = 0;
  soa.aimX[idx] = 0;
  soa.aimY[idx] = 0;

  soa.toggleShields[idx] = 0;
}

export class IdleState extends BaseAIState {
  private readonly wakeRadius = 1600; // Shared for both mobile and station AI

  /**
   * Legacy wrapper: converts SOA intent to a ShipIntent object.
   * This allows old code paths to work while we transition.
   */
  public update(): { movement: any; weapons: any; utility: any } {
    const soa = (this.controller as any).soa as IntentSOA;
    const idx = this.controller.getSOAIndex();

    // Delegate actual logic to SOA writer
    this.updateSOA(0, soa, idx);

    return {
      movement: {
        thrustForward: !!soa.thrustForward[idx],
        brake: !!soa.brake[idx],
        rotateLeft: !!soa.rotateLeft[idx],
        rotateRight: !!soa.rotateRight[idx],
        strafeLeft: !!soa.strafeLeft[idx],
        strafeRight: !!soa.strafeRight[idx],
      },
      weapons: {
        firePrimary: !!soa.firePrimary[idx],
        fireSecondary: !!soa.fireSecondary[idx],
        aimAt: { x: soa.aimX[idx], y: soa.aimY[idx] },
      },
      utility: { toggleShields: !!soa.toggleShields[idx] },
    };
  }

  /**
   * SOA-native intent writer: zeros all inputs (Idle behavior).
   */
  public updateSOA(dt: number, soa: IntentSOA, idx: number): void {
    zeroAllIntents(soa, idx);
  }

  public transitionIfNeeded(): BaseAIState | null {
    const behaviorProfile = this.controller.getBehaviorProfile();
    const nearestTarget = findNearestTarget(this.ship, this.wakeRadius);

    if (!nearestTarget) {
      // Rejoin formation if we're a follower and not engaged
      if (this.controller.isFormationFollower()) {
        const registry = this.controller.getFormationRegistry();
        const leader = this.controller.getFormationLeaderController();
        const formationId = this.controller.getFormationId();

        if (registry && leader && formationId) {
          return new FormationState(this.controller, this.ship);
        }
      }
      return null;
    }

    const selfPos = this.ship.getTransform().position;
    const targetPos = nearestTarget.getTransform().position;

    const inWakeRange = isWithinRange(selfPos, targetPos, this.wakeRadius);
    if (!inWakeRange) return null;

    if (behaviorProfile === SpaceStationBehaviorProfile) {
      return new SpaceStationAttackState(this.controller, this.ship, nearestTarget);
    }

    return new SeekTargetState(this.controller, this.ship, nearestTarget);
  }
}
