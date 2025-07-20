// src/systems/ai/fsm/FormationAttackState.ts

import type { Ship } from '@/game/ship/Ship';
import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { IntentSOA } from '@/core/intent/interfaces/ShipIntent';

import { BaseAIState } from '@/systems/ai/fsm/BaseAIState';
import {
  approachTargetSOA,
  orbitTargetSOA,
  faceTargetSOA,
  leadTarget,
} from '@/systems/ai/steering/SteeringHelper';
import { getWorldPositionFromShipOffset } from '@/systems/ai/helpers/ShipUtils';
import { FormationSeekTargetState } from '@/systems/ai/fsm/FormationSeekTargetState';
import { handleFormationLeaderDeath } from '@/systems/ai/helpers/FormationHelpers';

export class FormationAttackState extends BaseAIState {
  private readonly target: Ship;
  private readonly disengageRange: number;
  private readonly projectileSpeed = 400;

  private readonly orbitRadius: number;
  private readonly siegeRange: number;

  private orbitClockwise = false;
  private actualOrbitRadius: number;

  constructor(controller: AIControllerSystem, ship: Ship, target: Ship) {
    super(controller, ship);
    this.target = target;

    const params = controller.getBehaviorProfile().params ?? {};

    this.orbitRadius = params.orbitRadius ?? 400;
    this.siegeRange = params.siegeRange ?? 400;
    this.disengageRange = params.disengageRange ?? 1800;

    this.actualOrbitRadius = this.orbitRadius * (0.5 + Math.random());
  }

  public override onEnter(): void {
    this.controller.makeUncullable();
    this.orbitClockwise = Math.random() < 0.5;
    this.actualOrbitRadius = this.orbitRadius * (0.5 + Math.random());
  }

  /**
   * Temporary compatibility shim until downstream systems consume SOA directly.
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
   * Main SOA-based behavior logic.
   */
  public updateSOA(dt: number, soa: IntentSOA, idx: number): void {
    if (this.target.isDestroyed?.()) {
      this.writeIdleSOA(soa, idx);
      return;
    }

    const registry = this.controller.getFormationRegistry();
    const leaderController = this.controller.getFormationLeaderController();
    const formationId = this.controller.getFormationId();

    if (!registry || !leaderController || !formationId) {
      this.writeIdleSOA(soa, idx);
      return;
    }

    const leaderShip = leaderController.getShip();
    if (leaderShip.isDestroyed()) {
      this.writeIdleSOA(soa, idx);
      return;
    }

    const offset = registry.getOffsetForShip(this.ship.id);
    if (!offset) {
      this.writeIdleSOA(soa, idx);
      return;
    }

    const leaderTransform = leaderShip.getTransform();
    const formationTarget = getWorldPositionFromShipOffset(leaderTransform, offset);

    const selfTransform = this.ship.getTransform();
    const selfPos = selfTransform.position;
    const selfVel = selfTransform.velocity;

    const targetTransform = this.target.getTransform();
    const targetPos = targetTransform.position;
    const targetVel = targetTransform.velocity;

    const dx = selfPos.x - targetPos.x;
    const dy = selfPos.y - targetPos.y;
    const distSq = dx * dx + dy * dy;

    const behavior = this.controller.getBehaviorProfile().attack;

    // === Siege behavior
    if (behavior === 'siege') {
      const inRange = distSq <= this.siegeRange * this.siegeRange;

      if (inRange) {
        faceTargetSOA(this.ship, targetPos, soa, idx);
        soa.thrustForward[idx] = 0;
        soa.brake[idx] = 1;
        soa.strafeLeft[idx] = 0;
        soa.strafeRight[idx] = 0;
      } else {
        approachTargetSOA(this.ship, formationTarget, selfVel, soa, idx);
      }

      soa.firePrimary[idx] = 1;
      soa.fireSecondary[idx] = 0;
      const lead = leadTarget(selfPos, targetPos, targetVel, this.projectileSpeed);
      soa.aimX[idx] = lead.x;
      soa.aimY[idx] = lead.y;
      soa.toggleShields[idx] = 1;
      return;
    }

    // === Orbit behavior
    if (behavior === 'orbit') {
      orbitTargetSOA(this.ship, selfVel, targetPos, this.actualOrbitRadius, this.orbitClockwise, soa, idx);

      soa.firePrimary[idx] = 1;
      soa.fireSecondary[idx] = 0;
      const lead = leadTarget(selfPos, targetPos, targetVel, this.projectileSpeed);
      soa.aimX[idx] = lead.x;
      soa.aimY[idx] = lead.y;
      soa.toggleShields[idx] = 1;
      return;
    }

    // === Default: maintain formation offset while attacking
    approachTargetSOA(this.ship, formationTarget, selfVel, soa, idx);

    soa.firePrimary[idx] = 1;
    soa.fireSecondary[idx] = 0;
    const lead = leadTarget(selfPos, targetPos, targetVel, this.projectileSpeed);
    soa.aimX[idx] = lead.x;
    soa.aimY[idx] = lead.y;
    soa.toggleShields[idx] = 1;
  }

  private writeIdleSOA(soa: IntentSOA, idx: number): void {
    soa.thrustForward[idx] = 0;
    soa.brake[idx] = 1;
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
}
