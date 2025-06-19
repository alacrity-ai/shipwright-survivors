// src/systems/ai/states/FormationState.ts

import type { Ship } from '@/game/ship/Ship';
import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { BaseAIState } from './BaseAIState';
import { approachTarget } from '@/systems/ai/steering/SteeringHelper';
import { SeekTargetState } from './SeekTargetState';
import { AttackState } from './AttackState';
import { PatrolState } from './PatrolState';

import { getWorldPositionFromShipOffset } from '@/systems/ai/helpers/ShipUtils';

export class FormationState extends BaseAIState {
  constructor(controller: AIControllerSystem, ship: Ship) {
    super(controller, ship);
  }

  update(dt: number): ShipIntent {
    const registry = this.controller.getFormationRegistry();
    const leader = this.controller.getFormationLeaderController();
    const formationId = this.controller.getFormationId();

    if (!registry || !leader || !formationId) {
      return this.idleIntent();
    }

    const offset = registry.getOffsetForShip(this.ship.id);
    if (!offset) return this.idleIntent();

    const leaderShip = leader.getShip();
    if (leaderShip.isDestroyed()) {
      return this.idleIntent();
    }

    const leaderTransform = leaderShip.getTransform();
    const targetPos = getWorldPositionFromShipOffset(leaderTransform, offset);

    return {
      movement: approachTarget(this.ship, targetPos, this.ship.getTransform().velocity),
      weapons: {
        firePrimary: false,
        fireSecondary: false,
        aimAt: leaderTransform.position,
      },
      utility: {
        toggleShields: false,
      },
    };
  }

  transitionIfNeeded(): BaseAIState | null {
    const registry = this.controller.getFormationRegistry();
    const leaderController = this.controller.getFormationLeaderController();
    const formationId = this.controller.getFormationId();

    if (!registry || !leaderController || !formationId) {
      console.log('[FormationState] Formation context lost, transitioning to PatrolState');
      return new PatrolState(this.controller, this.ship);
    }

    const leaderShip = leaderController.getShip();
    if (leaderShip.isDestroyed()) {
      console.log('[FormationState] Leader destroyed, transitioning to PatrolState');
      return new PatrolState(this.controller, this.ship);
    }

    const leaderState = leaderController.getCurrentState();

    if (leaderState instanceof SeekTargetState) {
      return new SeekTargetState(this.controller, this.ship, leaderState.getTarget());
    }

    if (leaderState instanceof AttackState) {
      return new AttackState(this.controller, this.ship, leaderState.getTarget());
    }

    return null;
  }

  private idleIntent(): ShipIntent {
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
        aimAt: this.ship.getTransform().position,
      },
      utility: {
        toggleShields: false,
      },
    };
  }
}
