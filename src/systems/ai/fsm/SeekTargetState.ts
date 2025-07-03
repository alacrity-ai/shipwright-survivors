import type { Ship } from '@/game/ship/Ship';
import type { AIControllerSystem } from '../AIControllerSystem';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { BaseAIState } from './BaseAIState';
import { approachTarget } from '../steering/SteeringHelper';
import { AttackState } from './AttackState';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { FormationState } from './FormationState';
import { PatrolState } from './PatrolState';

export class SeekTargetState extends BaseAIState {
  private readonly target: Ship;
  private readonly engagementRange = 1200;
  private readonly disengagementRange = 5000;

  constructor(controller: AIControllerSystem, ship: Ship, target: Ship) {
    super(controller, ship);
    this.target = target;

    const params = controller.getBehaviorProfile().params ?? {};
    this.engagementRange = params.engagementRange ?? 1200;
    this.disengagementRange = params.disengagementRange ?? 5000;
  }

  public override onEnter(): void {
    this.controller.makeUncullable();
  }

  update(): ShipIntent {
    if (this.target.isDestroyed?.()) {
      return {
        movement: { thrustForward: false, brake: true, rotateLeft: false, rotateRight: false, strafeLeft: false, strafeRight: false },
        weapons: { firePrimary: false, fireSecondary: false, aimAt: { x: 0, y: 0 } },
        utility: { toggleShields: false },
      };
    }

    const selfTransform = this.ship.getTransform();
    const targetTransform = this.target.getTransform();
    const movement = approachTarget(this.ship, targetTransform.position, selfTransform.velocity);

    return {
      movement,
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
    if (this.target.isDestroyed?.()) {
      return this.controller.getInitialState() ?? null;
    }

    const selfTransform = this.ship.getTransform();
    const targetTransform = this.target.getTransform();
    const selfPos = selfTransform.position;
    const targetPos = targetTransform.position;

    // === Formation fallback ===
    const formationId = this.controller.getFormationId();
    const registry = this.controller.getFormationRegistry();
    const leader = this.controller.getFormationLeaderController();
    if (formationId && registry && (!leader || leader.getShip().isDestroyed())) {
      return registry.getOffsetForShip(this.ship.id)
        ? new FormationState(this.controller, this.ship)
        : new PatrolState(this.controller, this.ship);
    }

    // === Engagement ===
    const dx = selfPos.x - targetPos.x;
    const dy = selfPos.y - targetPos.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= this.engagementRange * this.engagementRange) {
      return new AttackState(this.controller, this.ship, this.target);
    }

    // === Disengagement for non-hunters ===
    if (!this.controller.isHunter()) {
      const player = ShipRegistry.getInstance().getPlayerShip();
      if (player) {
        const playerPos = player.getTransform().position;
        const pdx = selfPos.x - playerPos.x;
        const pdy = selfPos.y - playerPos.y;
        const distToPlayerSq = pdx * pdx + pdy * pdy;
        if (distToPlayerSq > this.disengagementRange * this.disengagementRange) {
          return this.controller.getInitialState();
        }
      }
    }

    return null;
  }

  public getTarget(): Ship {
    return this.target;
  }
}
