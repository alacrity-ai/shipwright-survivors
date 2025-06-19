import type { Ship } from '@/game/ship/Ship';
import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { BaseAIState } from './BaseAIState';
import { orbitTarget, approachTarget, leadTarget } from '@/systems/ai/steering/SteeringHelper';
import { isWithinRange } from '@/systems/ai/helpers/ShipUtils';
import { SeekTargetState } from './SeekTargetState';
import { FormationState } from './FormationState';
import { PatrolState } from './PatrolState';

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

  private readonly orbitDuration = 10;

  constructor(controller: AIControllerSystem, ship: Ship, target: Ship) {
    super(controller, ship);
    this.target = target;
  }

  public override onEnter(): void {
    this.controller.makeUncullable();
  }

  update(dt: number): ShipIntent {
    const behavior = this.controller.getBehaviorProfile().attack;
    const selfTransform = this.ship.getTransform();
    const targetTransform = this.target.getTransform();

    if (behavior === 'ram') {
      if (this.phase === AttackPhase.Ramming) {
        if (this.ship.isColliding()) {
          this.phase = AttackPhase.Orbiting;
          this.phaseTimer = 0;
        }
      } else if (this.phase === AttackPhase.Orbiting) {
        this.phaseTimer += dt;
        if (this.phaseTimer >= this.orbitDuration) {
          this.phase = AttackPhase.Ramming;
          this.phaseTimer = 0;
        }
      }

      if (this.phase === AttackPhase.Ramming) {
        return {
          movement: approachTarget(this.ship, targetTransform.position, selfTransform.velocity),
          weapons: {
            firePrimary: false,
            fireSecondary: false,
            aimAt: targetTransform.position,
          },
          utility: { toggleShields: true },
        };
      }

      if (this.phase === AttackPhase.Orbiting) {
        return {
          movement: orbitTarget(this.ship, selfTransform.velocity, targetTransform.position, this.orbitRadius),
          weapons: {
            firePrimary: false,
            fireSecondary: false,
            aimAt: targetTransform.position,
          },
          utility: { toggleShields: false },
        };
      }
    }

    if (behavior === 'orbit') {
      return {
        movement: orbitTarget(this.ship, selfTransform.velocity, targetTransform.position, this.orbitRadius),
        weapons: {
          firePrimary: true,
          fireSecondary: false,
          aimAt: leadTarget(selfTransform.position, targetTransform.position, targetTransform.velocity, this.projectileSpeed),
        },
        utility: { toggleShields: false },
      };
    }

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
      utility: { toggleShields: false },
    };
  }

  transitionIfNeeded(): BaseAIState | null {
    const selfTransform = this.ship.getTransform();
    const targetTransform = this.target.getTransform();

    // === Formation Leader Death Recovery ===
    const formationId = this.controller.getFormationId();
    const registry = this.controller.getFormationRegistry();
    const leader = this.controller.getFormationLeaderController();

    if (formationId && registry) {
      if (!leader || leader.getShip().isDestroyed()) {
        if (registry.getOffsetForShip(this.ship.id)) {
          return new FormationState(this.controller, this.ship);
        } else {
          return new PatrolState(this.controller, this.ship);
        }
      }
    }

    // === Disengagement to Seek ===
    if (!isWithinRange(selfTransform.position, targetTransform.position, this.disengageRange)) {
      return new SeekTargetState(this.controller, this.ship, this.target);
    }

    return null;
  }

  public getTarget(): Ship {
    return this.target;
  }
}
