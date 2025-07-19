// src/systems/ai/fsm/FormationState.ts

import type { Ship } from '@/game/ship/Ship';
import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { IntentSOA } from '@/core/intent/interfaces/ShipIntent';

import { BaseAIState } from '@/systems/ai/fsm/BaseAIState';
import { approachTargetSOA } from '@/systems/ai/steering/SteeringHelper';
import { FormationSeekTargetState } from '@/systems/ai/fsm/FormationSeekTargetState';
import { FormationAttackState } from '@/systems/ai/fsm/FormationAttackState';
import { SeekTargetState } from '@/systems/ai/fsm/SeekTargetState';
import { AttackState } from '@/systems/ai/fsm/AttackState';

import { getWorldPositionFromShipOffset } from '@/systems/ai/helpers/ShipUtils';
import { handleFormationLeaderDeath } from '@/systems/ai/helpers/FormationHelpers';

export class FormationState extends BaseAIState {
  constructor(controller: AIControllerSystem, ship: Ship) {
    super(controller, ship);
  }

  /**
   * Compatibility wrapper for systems still consuming `ShipIntent`.
   * Pulls back values from SOA so the transition is gradual.
   */
  public update(): {
    movement: any;
    weapons: any;
    utility: any;
  } {
    const soa = (this.controller as any).soa as IntentSOA;
    const idx = this.controller.getSOAIndex();
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
      utility: {
        toggleShields: !!soa.toggleShields[idx],
      },
    };
  }

  /**
   * Writes formation-following intent directly into SOA.
   */
  public updateSOA(dt: number, soa: IntentSOA, idx: number): void {
    const registry = this.controller.getFormationRegistry();
    const leaderController = this.controller.getFormationLeaderController();
    const formationId = this.controller.getFormationId();

    if (!registry || !leaderController || !formationId) {
      this.writeIdleSOA(soa, idx);
      return;
    }

    const offset = registry.getOffsetForShip(this.ship.id);
    if (!offset) {
      this.writeIdleSOA(soa, idx);
      return;
    }

    const leaderShip = leaderController.getShip();
    if (leaderShip.isDestroyed()) {
      this.writeIdleSOA(soa, idx);
      return;
    }

    const leaderTransform = leaderShip.getTransform();
    const targetPos = getWorldPositionFromShipOffset(leaderTransform, offset);
    const selfVel = this.ship.getTransform().velocity;

    // Write movement intent directly into SOA for leader-follow behavior
    approachTargetSOA(this.ship, targetPos, selfVel, soa, idx);

    // Followers never shoot in this state, just orient toward the leader
    soa.firePrimary[idx] = 0;
    soa.fireSecondary[idx] = 0;
    soa.aimX[idx] = leaderTransform.position.x;
    soa.aimY[idx] = leaderTransform.position.y;

    // Shields remain off while following
    soa.toggleShields[idx] = 0;
  }

  /**
   * Writes a zeroed "idle" intent into the SOA buffer.
   */
  private writeIdleSOA(soa: IntentSOA, idx: number): void {
    soa.thrustForward[idx] = 0;
    soa.brake[idx] = 1; // maintain braking
    soa.rotateLeft[idx] = 0;
    soa.rotateRight[idx] = 0;
    soa.strafeLeft[idx] = 0;
    soa.strafeRight[idx] = 0;
    soa.firePrimary[idx] = 0;
    soa.fireSecondary[idx] = 0;
    soa.aimX[idx] = this.ship.getTransform().position.x;
    soa.aimY[idx] = this.ship.getTransform().position.y;
    soa.toggleShields[idx] = 0;
  }

  public transitionIfNeeded(): BaseAIState | null {
    const registry = this.controller.getFormationRegistry();
    const leaderController = this.controller.getFormationLeaderController();
    const formationId = this.controller.getFormationId();

    if (!registry || !leaderController || !formationId) {
      return handleFormationLeaderDeath(this.controller, this.ship);
    }

    const leaderShip = leaderController.getShip();
    if (leaderShip.isDestroyed()) {
      return handleFormationLeaderDeath(this.controller, this.ship);
    }

    const leaderState = leaderController.getCurrentState();

    if (leaderState instanceof SeekTargetState) {
      return new FormationSeekTargetState(this.controller, this.ship, leaderState.getTarget());
    }

    if (leaderState instanceof AttackState) {
      return new FormationAttackState(this.controller, this.ship, leaderState.getTarget());
    }

    return null;
  }
}
