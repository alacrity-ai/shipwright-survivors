// src/systems/ai/fsm/SeekTargetState.ts

import type { Ship } from '@/game/ship/Ship';
import type { AIControllerSystem } from '../AIControllerSystem';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { BaseAIState } from './BaseAIState';
import { isWithinRange } from '../helpers/ShipUtils';
import { approachTarget } from '../steering/SteeringHelper';
import { AttackState } from './AttackState';

export class SeekTargetState extends BaseAIState {
  private readonly target: Ship;
  private readonly engagementRange = 1200;

  constructor(controller: AIControllerSystem, ship: Ship, target: Ship) {
    super(controller, ship);
    this.target = target;
  }

  update(dt: number): ShipIntent {
    const selfTransform = this.ship.getTransform();
    const targetTransform = this.target.getTransform();

    const movement = approachTarget(
      this.ship,
      targetTransform.position,
      selfTransform.velocity
    );

    return {
      movement,
      weapons: {
        firePrimary: false,
        fireSecondary: false,
        aimAt: targetTransform.position
      }
    };
  }

  transitionIfNeeded(): BaseAIState | null {
    const selfTransform = this.ship.getTransform();
    const targetTransform = this.target.getTransform();

    if (isWithinRange(selfTransform.position, targetTransform.position, this.engagementRange)) {
      return new AttackState(this.controller, this.ship, this.target);
    }

    return null;
  }
}
