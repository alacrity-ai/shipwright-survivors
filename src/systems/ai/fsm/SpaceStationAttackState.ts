// src/systems/ai/fsm/SpaceStationAttackState.ts

import type { Ship } from '@/game/ship/Ship';
import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { IntentSOA } from '@/core/intent/interfaces/ShipIntent';

import { BaseAIState } from './BaseAIState';
import { isWithinRange } from '@/systems/ai/helpers/ShipUtils';
import { leadTarget } from '@/systems/ai/steering/SteeringHelper';
import { IdleState } from './IdleState';

export class SpaceStationAttackState extends BaseAIState {
  private readonly target: Ship;
  private readonly attackRange = 1600;
  private readonly projectileSpeed = 400;

  constructor(controller: AIControllerSystem, ship: Ship, target: Ship) {
    super(controller, ship);
    this.target = target;
  }

  /**
   * Compatibility wrapper for legacy systems expecting ShipIntent.
   * Will be removed once everything consumes SOA directly.
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
        thrustForward: false,
        brake: false,
        rotateLeft: false,
        rotateRight: false,
        strafeLeft: false,
        strafeRight: false,
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
   * SOA-native intent writing for the space station.
   */
  public updateSOA(dt: number, soa: IntentSOA, idx: number): void {
    const selfTransform = this.ship.getTransform();
    const targetTransform = this.target.getTransform();

    // Station is immobile: zero out all movement flags
    soa.thrustForward[idx] = 0;
    soa.brake[idx] = 0;
    soa.rotateLeft[idx] = 0;
    soa.rotateRight[idx] = 0;
    soa.strafeLeft[idx] = 0;
    soa.strafeRight[idx] = 0;

    // Always fires primary weapon while tracking target
    soa.firePrimary[idx] = 1;
    soa.fireSecondary[idx] = 0;

    const leadPos = leadTarget(
      selfTransform.position,
      targetTransform.position,
      targetTransform.velocity,
      this.projectileSpeed
    );
    soa.aimX[idx] = leadPos.x;
    soa.aimY[idx] = leadPos.y;

    soa.toggleShields[idx] = 0; // Shields not toggled here
  }

  public transitionIfNeeded(): BaseAIState | null {
    const selfTransform = this.ship.getTransform();
    const targetTransform = this.target.getTransform();

    if (!isWithinRange(selfTransform.position, targetTransform.position, this.attackRange)) {
      return new IdleState(this.controller, this.ship);
    }

    return null;
  }
}
