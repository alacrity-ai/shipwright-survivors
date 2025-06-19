// src/systems/ai/fsm/SeekTargetState.ts

import type { Ship } from '@/game/ship/Ship';
import type { AIControllerSystem } from '../AIControllerSystem';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { getDistance } from '../helpers/VectorUtils';
import { BaseAIState } from './BaseAIState';
import { isWithinRange } from '../helpers/ShipUtils';
import { approachTarget } from '../steering/SteeringHelper';
import { AttackState } from './AttackState';
import { ShipRegistry } from '@/game/ship/ShipRegistry';

export class SeekTargetState extends BaseAIState {
  private readonly target: Ship;
  private readonly engagementRange = 1200;
  private readonly disengagementRange = 5000;

  constructor(controller: AIControllerSystem, ship: Ship, target: Ship) {
    super(controller, ship);
    this.target = target;
  }

  update(): ShipIntent {
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
      },
      utility: {
        toggleShields: false,
      },
    };
  }

  transitionIfNeeded(): BaseAIState | null {
    const selfTransform = this.ship.getTransform();
    const targetTransform = this.target.getTransform();

    // === Engagement check ===
    if (isWithinRange(selfTransform.position, targetTransform.position, this.engagementRange)) {
      return new AttackState(this.controller, this.ship, this.target);
    }

    // === Disengagement override for non-hunters ===
    if (!this.controller.isHunter()) {
      const player = ShipRegistry.getInstance().getPlayerShip();
      if (player) {
        const playerTransform = player.getTransform();
        const distanceToPlayer = getDistance(selfTransform.position, playerTransform.position);

        if (distanceToPlayer > 4000) {
          const initial = this.controller.getInitialState();
          if (initial) return initial;
        }
      }
    }

    return null;
  }
}
