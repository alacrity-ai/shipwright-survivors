import type { Ship } from '@/game/ship/Ship';
import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { BaseAIState } from './BaseAIState';
import { orbitTarget, approachTarget, leadTarget, faceTarget } from '@/systems/ai/steering/SteeringHelper';
import { SeekTargetState } from './SeekTargetState';
import { FormationState } from './FormationState';
import { PatrolState } from './PatrolState';

enum AttackPhase {
  Ramming,
  Orbiting,
}

// === Static Reusable Intents ===
const INERT_MOVEMENT = {
  thrustForward: false,
  brake: false,
  rotateLeft: false,
  rotateRight: false,
  strafeLeft: false,
  strafeRight: false,
} as const;

const INERT_WEAPONS = {
  firePrimary: false,
  fireSecondary: false,
  aimAt: { x: 0, y: 0 },
} as const;

const INERT_UTILITY = {
  toggleShields: false,
} as const;

export class AttackState extends BaseAIState {
  private readonly target: Ship;
  private readonly disengageRange: number;
  private readonly projectileSpeed = 400;
  private readonly orbitDuration = 10;

  private readonly orbitRadius: number;
  private readonly siegeRange: number;

  private orbitClockwise: boolean = false;
  private actualOrbitRadius: number;

  private phase: AttackPhase = AttackPhase.Ramming;
  private phaseTimer: number = 0;

  constructor(controller: AIControllerSystem, ship: Ship, target: Ship) {
    super(controller, ship);
    this.target = target;

    const params = controller.getBehaviorProfile().params ?? {};

    this.orbitRadius = params.orbitRadius ?? 400;
    this.siegeRange = params.siegeRange ?? 600;
    this.disengageRange = params.disengageRange ?? 1500;

    this.actualOrbitRadius = this.orbitRadius * (0.5 + Math.random());
  }

  public override onEnter(): void {
    this.controller.makeUncullable();
    this.orbitClockwise = Math.random() < 0.5;
    this.actualOrbitRadius = this.orbitRadius * (0.5 + Math.random());
  }

  public update(dt: number): ShipIntent {
    if (this.target.isDestroyed?.()) {
      return {
        movement: INERT_MOVEMENT,
        weapons: INERT_WEAPONS,
        utility: INERT_UTILITY,
      };
    }

    const behavior = this.controller.getBehaviorProfile().attack;
    const selfTransform = this.ship.getTransform();
    const targetTransform = this.target.getTransform();

    const selfPos = selfTransform.position;
    const selfVel = selfTransform.velocity;
    const targetPos = targetTransform.position;
    const targetVel = targetTransform.velocity;

    const dx = selfPos.x - targetPos.x;
    const dy = selfPos.y - targetPos.y;
    const distSq = dx * dx + dy * dy;

    // === Ram behavior
    if (behavior === 'ram') {
      if (this.phase === AttackPhase.Ramming && this.ship.isColliding()) {
        this.phase = AttackPhase.Orbiting;
        this.phaseTimer = 0;
        this.orbitClockwise = Math.random() < 0.5;
        this.actualOrbitRadius = this.orbitRadius * (0.5 + Math.random());
      } else if (this.phase === AttackPhase.Orbiting) {
        this.phaseTimer += dt;
        if (this.phaseTimer >= this.orbitDuration) {
          this.phase = AttackPhase.Ramming;
          this.phaseTimer = 0;
        }
      }

      if (this.phase === AttackPhase.Ramming) {
        return {
          movement: approachTarget(this.ship, targetPos, selfVel),
          weapons: {
            firePrimary: false,
            fireSecondary: false,
            aimAt: targetPos,
          },
          utility: { toggleShields: true },
        };
      }

      return {
        movement: orbitTarget(this.ship, selfVel, targetPos, this.actualOrbitRadius, this.orbitClockwise),
        weapons: {
          firePrimary: false,
          fireSecondary: false,
          aimAt: targetPos,
        },
        utility: { toggleShields: false },
      };
    }

    // === Siege behavior
    if (behavior === 'siege') {
      const inRange = distSq <= this.siegeRange * this.siegeRange;
      const faceIntent = faceTarget(this.ship, targetPos);

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
          aimAt: leadTarget(selfPos, targetPos, targetVel, this.projectileSpeed),
        },
        utility: { toggleShields: false },
      };
    }

    // === Orbit behavior
    if (behavior === 'orbit') {
      return {
        movement: orbitTarget(this.ship, selfVel, targetPos, this.actualOrbitRadius, this.orbitClockwise),
        weapons: {
          firePrimary: true,
          fireSecondary: false,
          aimAt: leadTarget(selfPos, targetPos, targetVel, this.projectileSpeed),
        },
        utility: { toggleShields: false },
      };
    }

    return {
      movement: INERT_MOVEMENT,
      weapons: INERT_WEAPONS,
      utility: INERT_UTILITY,
    };
  }

  public transitionIfNeeded(): BaseAIState | null {
    if (this.target.isDestroyed?.()) {
      return this.controller.getInitialState() ?? null;
    }

    const selfTransform = this.ship.getTransform();
    const targetTransform = this.target.getTransform();

    const selfPos = selfTransform.position;
    const targetPos = targetTransform.position;

    const formationId = this.controller.getFormationId();
    const registry = this.controller.getFormationRegistry();
    const leader = this.controller.getFormationLeaderController();
    if (formationId && registry && (!leader || leader.getShip().isDestroyed())) {
      return registry.getOffsetForShip(this.ship.id)
        ? new FormationState(this.controller, this.ship)
        : new PatrolState(this.controller, this.ship);
    }

    const dx = selfPos.x - targetPos.x;
    const dy = selfPos.y - targetPos.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > this.disengageRange * this.disengageRange) {
      return new SeekTargetState(this.controller, this.ship, this.target);
    }

    return null;
  }

  public getTarget(): Ship {
    return this.target;
  }
}
