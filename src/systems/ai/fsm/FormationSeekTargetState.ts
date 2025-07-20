// src/systems/ai/fsm/FormationSeekTargetState.ts

import type { Ship } from '@/game/ship/Ship';
import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { IntentSOA } from '@/core/intent/interfaces/ShipIntent';

import { BaseAIState } from '@/systems/ai/fsm/BaseAIState';
import { approachTargetSOA } from '@/systems/ai/steering/SteeringHelper';
import { getWorldPositionFromShipOffset } from '@/systems/ai/helpers/ShipUtils';
import { FormationAttackState } from '@/systems/ai/fsm/FormationAttackState';
import { handleFormationLeaderDeath } from '@/systems/ai/helpers/FormationHelpers';

export class FormationSeekTargetState extends BaseAIState {
  private readonly target: Ship;
  private readonly engagementRange: number;

  constructor(controller: AIControllerSystem, ship: Ship, target: Ship) {
    super(controller, ship);
    this.target = target;

    const params = controller.getBehaviorProfile().params ?? {};
    this.engagementRange = params.engagementRange ?? 1200;
  }

  public override onEnter(): void {
    this.controller.makeUncullable();
  }

  /**
   * Temporary shim for systems expecting ShipIntent until Movement/Weapon/Utility
   * systems consume SOA directly.
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
   * Writes this frame's behavior intent into the SOA buffers.
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
    const targetPos = getWorldPositionFromShipOffset(leaderTransform, offset);
    const shipVel = this.ship.getTransform().velocity;

    // Write movement flags directly into SOA
    approachTargetSOA(this.ship, targetPos, shipVel, soa, idx);

    // Zero weapons — this state doesn’t attack
    soa.firePrimary[idx] = 0;
    soa.fireSecondary[idx] = 0;

    // Aim at target (for potential transition states)
    const targetTransform = this.target.getTransform();
    soa.aimX[idx] = targetTransform.position.x;
    soa.aimY[idx] = targetTransform.position.y;

    // Disable shields in seek mode
    soa.toggleShields[idx] = 0;
  }

  private writeIdleSOA(soa: IntentSOA, idx: number): void {
    soa.thrustForward[idx] = 0;
    soa.brake[idx] = 1; // idle ships still brake to hold position
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

    if (distSq <= this.engagementRange * this.engagementRange) {
      return new FormationAttackState(this.controller, this.ship, this.target);
    }

    return null;
  }

  public getTarget(): Ship {
    return this.target;
  }
}
