// src/systems/ai/fsm/FormationAttackState.ts

import type { Ship } from '@/game/ship/Ship';
import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { BaseAIState } from '@/systems/ai/fsm/BaseAIState';
import { approachTarget, leadTarget } from '@/systems/ai/steering/SteeringHelper';
import { getWorldPositionFromShipOffset } from '@/systems/ai/helpers/ShipUtils';
import { FormationSeekTargetState } from '@/systems/ai/fsm/FormationSeekTargetState';
import { isWithinRange } from '@/systems/ai/helpers/ShipUtils';
import { handleFormationLeaderDeath } from '@/systems/ai/helpers/FormationHelpers';

export class FormationAttackState extends BaseAIState {
  private readonly target: Ship;
  private readonly disengageRange = 1800;
  private readonly projectileSpeed = 400;

  constructor(controller: AIControllerSystem, ship: Ship, target: Ship) {
    super(controller, ship);
    this.target = target;
  }

  public override onEnter(): void {
    this.controller.makeUncullable();
  }

  update(): ShipIntent {
    const registry = this.controller.getFormationRegistry();
    const leaderController = this.controller.getFormationLeaderController();
    const formationId = this.controller.getFormationId();

    if (!registry || !leaderController || !formationId) {
      return this.idleIntent();
    }

    const leaderShip = leaderController.getShip();
    if (leaderShip.isDestroyed()) {
      return this.idleIntent(); // Transition handled in transitionIfNeeded
    }

    const offset = registry.getOffsetForShip(this.ship.id);
    if (!offset) return this.idleIntent();

    const leaderTransform = leaderShip.getTransform();
    const targetPos = getWorldPositionFromShipOffset(leaderTransform, offset);

    return {
      movement: approachTarget(this.ship, targetPos, this.ship.getTransform().velocity),
      weapons: {
        firePrimary: true,
        fireSecondary: false,
        aimAt: leadTarget(
          this.ship.getTransform().position,
          this.target.getTransform().position,
          this.target.getTransform().velocity,
          this.projectileSpeed
        ),
      },
      utility: {
        toggleShields: true,
      },
    };
  }

  transitionIfNeeded(): BaseAIState | null {
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

    const selfTransform = this.ship.getTransform();
    const targetTransform = this.target.getTransform();

    if (!isWithinRange(selfTransform.position, targetTransform.position, this.disengageRange)) {
      return new FormationSeekTargetState(this.controller, this.ship, this.target);
    }

    return null;
  }

  public getTarget(): Ship {
    return this.target;
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
