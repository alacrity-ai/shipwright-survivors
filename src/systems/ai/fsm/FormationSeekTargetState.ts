// src/systems/ai/fsm/FormationSeekTargetState.ts

import type { Ship } from '@/game/ship/Ship';
import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { BaseAIState } from '@/systems/ai/fsm/BaseAIState';
import { approachTarget } from '@/systems/ai/steering/SteeringHelper';
import { getWorldPositionFromShipOffset } from '@/systems/ai/helpers/ShipUtils';
import { FormationAttackState } from '@/systems/ai/fsm/FormationAttackState';
import { handleFormationLeaderDeath } from '@/systems/ai/helpers/FormationHelpers';

// === Preallocated constants ===
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

export class FormationSeekTargetState extends BaseAIState {
  private readonly target: Ship;
  private readonly engagementRange = 1200;

  constructor(controller: AIControllerSystem, ship: Ship, target: Ship) {
    super(controller, ship);
    this.target = target;
  }

  public override onEnter(): void {
    this.controller.makeUncullable();
  }

  public update(): ShipIntent {
    if (this.target.isDestroyed?.()) return this.idleIntent();

    const registry = this.controller.getFormationRegistry();
    const leaderController = this.controller.getFormationLeaderController();
    const formationId = this.controller.getFormationId();

    if (!registry || !leaderController || !formationId) {
      return this.idleIntent();
    }

    const leaderShip = leaderController.getShip();
    if (leaderShip.isDestroyed()) {
      return this.idleIntent();
    }

    const offset = registry.getOffsetForShip(this.ship.id);
    if (!offset) return this.idleIntent();

    const leaderTransform = leaderShip.getTransform();
    const targetPos = getWorldPositionFromShipOffset(leaderTransform, offset);

    const shipTransform = this.ship.getTransform();
    const shipVel = shipTransform.velocity;

    return {
      movement: approachTarget(this.ship, targetPos, shipVel),
      weapons: {
        firePrimary: false,
        fireSecondary: false,
        aimAt: this.target.getTransform().position,
      },
      utility: IDLE_UTILITY,
    };
  }

  public transitionIfNeeded(): BaseAIState | null {
    if (this.target.isDestroyed?.()) {
      return handleFormationLeaderDeath(this.controller, this.ship);
    }

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

    const selfPos = this.ship.getTransform().position;
    const targetPos = this.target.getTransform().position;

    const dx = selfPos.x - targetPos.x;
    const dy = selfPos.y - targetPos.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= this.engagementRange * this.engagementRange) {
      return new FormationAttackState(this.controller, this.ship, this.target);
    }

    return null;
  }

  public getTarget(): Ship {
    return this.target;
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
