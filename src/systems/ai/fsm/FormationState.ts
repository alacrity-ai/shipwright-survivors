// src/systems/ai/fsm/FormationState.ts

import type { Ship } from '@/game/ship/Ship';
import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { BaseAIState } from '@/systems/ai/fsm/BaseAIState';
import { approachTarget } from '@/systems/ai/steering/SteeringHelper';
import { FormationSeekTargetState } from '@/systems/ai/fsm/FormationSeekTargetState';
import { FormationAttackState } from '@/systems/ai/fsm/FormationAttackState';
import { SeekTargetState } from '@/systems/ai/fsm/SeekTargetState';
import { AttackState } from '@/systems/ai/fsm/AttackState';

import { getWorldPositionFromShipOffset } from '@/systems/ai/helpers/ShipUtils';
import { handleFormationLeaderDeath } from '@/systems/ai/helpers/FormationHelpers';

// === Preallocated reusable constants ===
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

export class FormationState extends BaseAIState {
  constructor(controller: AIControllerSystem, ship: Ship) {
    super(controller, ship);
  }

  public update(): ShipIntent {
    const registry = this.controller.getFormationRegistry();
    const leaderController = this.controller.getFormationLeaderController();
    const formationId = this.controller.getFormationId();

    if (!registry || !leaderController || !formationId) {
      return this.idleIntent();
    }

    const offset = registry.getOffsetForShip(this.ship.id);
    if (!offset) return this.idleIntent();

    const leaderShip = leaderController.getShip();
    if (leaderShip.isDestroyed()) {
      return this.idleIntent(); // Don't transition here — handled below
    }

    const leaderTransform = leaderShip.getTransform();
    const targetPos = getWorldPositionFromShipOffset(leaderTransform, offset);

    const selfTransform = this.ship.getTransform();
    const selfVel = selfTransform.velocity;

    return {
      movement: approachTarget(this.ship, targetPos, selfVel),
      weapons: {
        firePrimary: false,
        fireSecondary: false,
        aimAt: leaderTransform.position,
      },
      utility: IDLE_UTILITY,
    };
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

  private idleIntent(): ShipIntent {
    const shipPos = this.ship.getTransform().position;
    return {
      movement: IDLE_MOVEMENT,
      weapons: {
        firePrimary: false,
        fireSecondary: false,
        aimAt: shipPos,
      },
      utility: IDLE_UTILITY,
    };
  }
}
