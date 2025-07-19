// src/systems/ai/fsm/SeekTargetState.ts

import type { Ship } from '@/game/ship/Ship';
import type { AIControllerSystem } from '../AIControllerSystem';
import type { IntentSOA } from '@/core/intent/interfaces/ShipIntent';

import { BaseAIState } from './BaseAIState';
import { approachTargetSOA } from '../steering/SteeringHelper';
import { AttackState } from './AttackState';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { FormationState } from './FormationState';
import { PatrolState } from './PatrolState';

export class SeekTargetState extends BaseAIState {
  private readonly target: Ship;
  private readonly engagementRange: number;
  private readonly disengagementRange: number;

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

  /**
   * Legacy wrapper for systems still consuming ShipIntent.
   */
  public update(): {
    movement: any;
    weapons: any;
    utility: any;
  } {
    const soa = (this.controller as any).soa as IntentSOA;
    const idx = this.controller.getSOAIndex();

    this.updateSOA(0, soa, idx); // dt unused for stateless intent generation

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
      utility: { toggleShields: !!soa.toggleShields[idx] },
    };
  }

  /**
   * SOA-native update: writes movement, weapon, and utility intent flags directly.
   */
  public updateSOA(dt: number, soa: IntentSOA, idx: number): void {
    if (this.target.isDestroyed?.()) {
      // Zero everything out when target is dead
      soa.thrustForward[idx] = 0;
      soa.brake[idx] = 1;
      soa.rotateLeft[idx] = 0;
      soa.rotateRight[idx] = 0;
      soa.strafeLeft[idx] = 0;
      soa.strafeRight[idx] = 0;
      soa.firePrimary[idx] = 0;
      soa.fireSecondary[idx] = 0;
      soa.aimX[idx] = 0;
      soa.aimY[idx] = 0;
      soa.toggleShields[idx] = 0;
      return;
    }

    const selfTransform = this.ship.getTransform();
    const targetTransform = this.target.getTransform();

    // Write movement intent directly into SOA
    approachTargetSOA(this.ship, targetTransform.position, selfTransform.velocity, soa, idx);

    // Followers here don't fire — just aim toward target
    soa.firePrimary[idx] = 0;
    soa.fireSecondary[idx] = 0;
    soa.aimX[idx] = targetTransform.position.x;
    soa.aimY[idx] = targetTransform.position.y;
    soa.toggleShields[idx] = 0;
  }

  public transitionIfNeeded(): BaseAIState | null {
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
