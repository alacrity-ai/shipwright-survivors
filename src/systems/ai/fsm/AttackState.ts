// src/systems/ai/fsm/AttackState.ts

import type { Ship } from '@/game/ship/Ship';
import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { BaseAIState } from './BaseAIState';
import { orbitTarget, approachTarget, leadTarget } from '@/systems/ai/steering/SteeringHelper';
import { isWithinRange } from '@/systems/ai/helpers/ShipUtils';
import { SeekTargetState } from './SeekTargetState';

enum AttackPhase {
  Ramming,
  Orbiting,
}

export class AttackState extends BaseAIState {
  private readonly target: Ship;
  private readonly disengageRange = 1400;
  private readonly orbitRadius = 300;
  private readonly projectileSpeed = 400;

  private phase: AttackPhase = AttackPhase.Ramming;
  private phaseTimer: number = 0;

  private readonly ramDuration = 10;     // seconds
  private readonly orbitDuration = 10;   // seconds

  constructor(controller: AIControllerSystem, ship: Ship, target: Ship) {
    super(controller, ship);
    this.target = target;
  }

  update(dt: number): ShipIntent {
    const behavior = this.controller.getBehaviorProfile().attack;
    const selfTransform = this.ship.getTransform();
    const targetTransform = this.target.getTransform();

    if (behavior === 'ram') {
      this.phaseTimer += dt;

      if (this.phase === AttackPhase.Ramming && this.phaseTimer >= this.ramDuration) {
        this.phase = AttackPhase.Orbiting;
        this.phaseTimer = 0;
      } else if (this.phase === AttackPhase.Orbiting && this.phaseTimer >= this.orbitDuration) {
        this.phase = AttackPhase.Ramming;
        this.phaseTimer = 0;
      }

      if (this.phase === AttackPhase.Ramming) {
        return {
          movement: approachTarget(
            this.ship,
            targetTransform.position,
            selfTransform.velocity
          ),
          weapons: {
            firePrimary: false,
            fireSecondary: false,
            aimAt: targetTransform.position,
          },
          utility: {
            toggleShields: true,
          },
        };
      }

      if (this.phase === AttackPhase.Orbiting) {
        return {
          movement: orbitTarget(
            this.ship,
            selfTransform.velocity,
            targetTransform.position,
            this.orbitRadius
          ),
          weapons: {
            firePrimary: false,
            fireSecondary: false,
            aimAt: targetTransform.position,
          },
          utility: {
            toggleShields: false,
          },
        };
      }
    }

    // === Default 'orbit' behavior ===
    if (behavior === 'orbit') {
      return {
        movement: orbitTarget(
          this.ship,
          selfTransform.velocity,
          targetTransform.position,
          this.orbitRadius
        ),
        weapons: {
          firePrimary: true,
          fireSecondary: false,
          aimAt: leadTarget(
            selfTransform.position,
            targetTransform.position,
            targetTransform.velocity,
            this.projectileSpeed
          ),
        },
        utility: {
          toggleShields: false,
        },
      };
    }

    // === Fallback behavior ===
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
        firePrimary: false,
        fireSecondary: false,
        aimAt: targetTransform.position,
      },
      utility: {
        toggleShields: false,
      },
    };
  }

  transitionIfNeeded(): BaseAIState | null {
    const selfTransform = this.ship.getTransform();
    const targetTransform = this.target.getTransform();

    if (!isWithinRange(selfTransform.position, targetTransform.position, this.disengageRange)) {
      return new SeekTargetState(this.controller, this.ship, this.target);
    }

    return null;
  }
}
