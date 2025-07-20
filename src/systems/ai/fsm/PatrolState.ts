// src/systems/ai/fsm/PatrolState.ts

import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { Ship } from '@/game/ship/Ship';
import type { IntentSOA } from '@/core/intent/interfaces/ShipIntent';

import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { getWorldWidth, getWorldHeight } from '@/config/world';
import { BaseAIState } from './BaseAIState';
import { approachTargetSOA } from '@/systems/ai/steering/SteeringHelper';
import { findNearestTarget } from '@/systems/ai/helpers/ShipUtils';
import { SeekTargetState } from './SeekTargetState';

// Helper for zeroing/shield flags (common to patrol + idle)
function writeIdleMovement(soa: IntentSOA, idx: number): void {
  soa.thrustForward[idx] = 0;
  soa.rotateLeft[idx] = 0;
  soa.rotateRight[idx] = 0;
  soa.strafeLeft[idx] = 0;
  soa.strafeRight[idx] = 0;
  soa.brake[idx] = 1; // Patrol idles with brake on
}

function writeIdleWeaponsAndUtility(soa: IntentSOA, idx: number, aimX: number, aimY: number): void {
  soa.firePrimary[idx] = 0;
  soa.fireSecondary[idx] = 0;
  soa.aimX[idx] = aimX;
  soa.aimY[idx] = aimY;
  soa.toggleShields[idx] = 0;
}

export class PatrolState extends BaseAIState {
  private patrolTarget: { x: number; y: number };
  private dwellTime = 0;
  private readonly dwellDuration = 4;
  private readonly patrolRadius = 6000;
  private readonly wakeRadius = 3400;

  constructor(controller: AIControllerSystem, ship: Ship) {
    super(controller, ship);
    this.patrolTarget = this.chooseNewPatrolTarget();
  }

  /**
   * Legacy wrapper: for systems still expecting ShipIntent objects.
   */
  public update(dt: number): { movement: any; weapons: any; utility: any } {
    const soa = (this.controller as any).soa as IntentSOA;
    const idx = this.controller.getSOAIndex();

    this.updateSOA(dt, soa, idx);

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
   * SOA-native intent writer.
   * Patrol alternates between dwelling (idle) and moving toward patrol target.
   */
  public updateSOA(dt: number, soa: IntentSOA, idx: number): void {
    const transform = this.ship.getTransform();
    const selfPos = transform.position;
    const velocity = transform.velocity;

    const dx = selfPos.x - this.patrolTarget.x;
    const dy = selfPos.y - this.patrolTarget.y;
    const distSq = dx * dx + dy * dy;

    const closeEnough = distSq <= 100 * 100;

    if (closeEnough) {
      this.dwellTime += dt;
      if (this.dwellTime >= this.dwellDuration) {
        this.patrolTarget = this.chooseNewPatrolTarget();
        this.dwellTime = 0;
      }

      writeIdleMovement(soa, idx);
      writeIdleWeaponsAndUtility(soa, idx, this.patrolTarget.x, this.patrolTarget.y);
      return;
    }

    // Write patrol movement intent directly into SOA
    approachTargetSOA(this.ship, this.patrolTarget, velocity, soa, idx);

    // Weapons and aim (no firing)
    writeIdleWeaponsAndUtility(soa, idx, this.patrolTarget.x, this.patrolTarget.y);
  }

  public transitionIfNeeded(): BaseAIState | null {
    // === Hunter override: always seek if player is visible ===
    if (this.controller.isHunter()) {
      const playerShip = ShipRegistry.getInstance().getPlayerShip();
      if (playerShip) {
        const seek = new SeekTargetState(this.controller, this.ship, playerShip);
        this.controller.setInitialState(seek);
        return seek;
      }
    }

    const nearestTarget = findNearestTarget(this.ship, this.wakeRadius);
    if (!nearestTarget) return null;

    const targetPos = nearestTarget.getTransform().position;
    const selfPos = this.ship.getTransform().position;

    const dx = selfPos.x - targetPos.x;
    const dy = selfPos.y - targetPos.y;
    const distSq = dx * dx + dy * dy;

    return distSq <= this.wakeRadius * this.wakeRadius
      ? new SeekTargetState(this.controller, this.ship, nearestTarget)
      : null;
  }

  private chooseNewPatrolTarget(): { x: number; y: number } {
    const { x: px, y: py } = this.ship.getTransform().position;

    const angle = Math.random() * 2 * Math.PI;
    const radius = Math.random() * this.patrolRadius;

    const rawX = px + Math.cos(angle) * radius;
    const rawY = py + Math.sin(angle) * radius;

    const halfWidth = getWorldWidth() / 2;
    const halfHeight = getWorldHeight() / 2;
    const margin = 1000;

    return {
      x: Math.max(-halfWidth + margin, Math.min(halfWidth - margin, rawX)),
      y: Math.max(-halfHeight + margin, Math.min(halfHeight - margin, rawY)),
    };
  }
}
