import type { Ship } from '@/game/ship/Ship';
import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { BaseAIState } from '@/systems/ai/fsm/BaseAIState';
import {
  approachTarget,
  orbitTarget,
  faceTarget,
  leadTarget,
} from '@/systems/ai/steering/SteeringHelper';

import { getWorldPositionFromShipOffset } from '@/systems/ai/helpers/ShipUtils';
import { FormationSeekTargetState } from '@/systems/ai/fsm/FormationSeekTargetState';
import { handleFormationLeaderDeath } from '@/systems/ai/helpers/FormationHelpers';

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

export class FormationAttackState extends BaseAIState {
  private readonly target: Ship;
  private readonly disengageRange = 1800;
  private readonly projectileSpeed = 400;

  private readonly orbitRadius: number;
  private readonly siegeRange: number;

  private orbitClockwise: boolean = false;
  private actualOrbitRadius: number;

  constructor(controller: AIControllerSystem, ship: Ship, target: Ship) {
    super(controller, ship);
    this.target = target;

    const params = controller.getBehaviorProfile().params ?? {};

    this.orbitRadius = params.orbitRadius ?? 400;
    this.siegeRange = params.siegeRange ?? 400;

    this.actualOrbitRadius = this.orbitRadius * (0.5 + Math.random());
  }

  public override onEnter(): void {
    this.controller.makeUncullable();
    this.orbitClockwise = Math.random() < 0.5;
    this.actualOrbitRadius = this.orbitRadius * (0.5 + Math.random());
  }

  public update(): ShipIntent {
    if (this.target.isDestroyed?.()) return this.idleIntent();

    const behavior = this.controller.getBehaviorProfile().attack;

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

    const selfTransform = this.ship.getTransform();
    const selfPos = selfTransform.position;
    const selfVel = selfTransform.velocity;

    const targetTransform = this.target.getTransform();
    const targetShipPos = targetTransform.position;
    const targetShipVel = targetTransform.velocity;

    const dx = selfPos.x - targetShipPos.x;
    const dy = selfPos.y - targetShipPos.y;
    const distSq = dx * dx + dy * dy;

    if (behavior === 'siege') {
      const inRange = distSq <= this.siegeRange * this.siegeRange;
      const faceIntent = faceTarget(this.ship, targetShipPos);

      return {
        movement: inRange
          ? {
              thrustForward: false,
              brake: true,
              rotateLeft: faceIntent.rotateLeft,
              rotateRight: faceIntent.rotateRight,
              strafeLeft: false,
              strafeRight: false,
            }
          : approachTarget(this.ship, targetPos, selfVel),
        weapons: {
          firePrimary: true,
          fireSecondary: false,
          aimAt: leadTarget(selfPos, targetShipPos, targetShipVel, this.projectileSpeed),
        },
        utility: {
          toggleShields: true,
        },
      };
    }

    if (behavior === 'orbit') {
      return {
        movement: orbitTarget(this.ship, selfVel, targetShipPos, this.actualOrbitRadius, this.orbitClockwise),
        weapons: {
          firePrimary: true,
          fireSecondary: false,
          aimAt: leadTarget(selfPos, targetShipPos, targetShipVel, this.projectileSpeed),
        },
        utility: {
          toggleShields: true,
        },
      };
    }

    // Default: stay in formation offset
    return {
      movement: approachTarget(this.ship, targetPos, selfVel),
      weapons: {
        firePrimary: true,
        fireSecondary: false,
        aimAt: leadTarget(selfPos, targetShipPos, targetShipVel, this.projectileSpeed),
      },
      utility: {
        toggleShields: true,
      },
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

    if (distSq > this.disengageRange * this.disengageRange) {
      return new FormationSeekTargetState(this.controller, this.ship, this.target);
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
