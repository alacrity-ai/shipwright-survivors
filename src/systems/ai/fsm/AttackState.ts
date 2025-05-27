// src/systems/ai/fsm/AttackState.ts

import type { Ship } from '@/game/ship/Ship';
import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { BaseAIState } from './BaseAIState';
import { orbitTarget, leadTarget } from '@/systems/ai/steering/SteeringHelper';
import { isWithinRange } from '@/systems/ai/helpers/ShipUtils';
import { SeekTargetState } from '@/systems/ai/fsm/SeekTargetState';

export class AttackState extends BaseAIState {
  private readonly target: Ship;
  private readonly disengageRange = 1400;
  private readonly orbitRadius = 300;
  private readonly projectileSpeed = 400; // Adjust if known per weapon

  constructor(controller: AIControllerSystem, ship: Ship, target: Ship) {
    super(controller, ship);
    this.target = target;
  }

  update(): ShipIntent {
    const selfTransform = this.ship.getTransform();
    const targetTransform = this.target.getTransform();

    const movement = orbitTarget(
      this.ship,
      selfTransform.velocity,
      targetTransform.position,
      this.orbitRadius
    );

    const aimAt = leadTarget(
      selfTransform.position,
      targetTransform.position,
      targetTransform.velocity,
      this.projectileSpeed
    );

    return {
      movement,
      weapons: {
        firePrimary: true,
        fireSecondary: false,
        aimAt
      }
    };
  }

  transitionIfNeeded(): BaseAIState | null {
    const selfTransform = this.ship.getTransform();
    const targetTransform = this.target.getTransform();

    // If target moved too far, re-enter seek
    if (!isWithinRange(selfTransform.position, targetTransform.position, this.disengageRange)) {
      return new SeekTargetState(this.controller, this.ship, this.target);
    }

    return null;
  }
}
