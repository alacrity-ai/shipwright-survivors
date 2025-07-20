// src/systems/ai/fsm/AttackState.ts

import type { Ship } from '@/game/ship/Ship';
import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { ShipIntent, IntentSOA } from '@/core/intent/interfaces/ShipIntent';

import { BaseAIState } from './BaseAIState';
import { orbitTargetSOA, approachTargetSOA, leadTarget, faceTargetSOA } from '@/systems/ai/steering/SteeringHelper';
import { SeekTargetState } from './SeekTargetState';
import { FormationState } from './FormationState';
import { PatrolState } from './PatrolState';

enum AttackPhase {
  Ramming,
  Orbiting,
}

// Helper for zeroing weapons/movement
function zeroMovement(soa: IntentSOA, idx: number): void {
  soa.thrustForward[idx] = 0;
  soa.brake[idx] = 0;
  soa.rotateLeft[idx] = 0;
  soa.rotateRight[idx] = 0;
  soa.strafeLeft[idx] = 0;
  soa.strafeRight[idx] = 0;
}
function zeroWeapons(soa: IntentSOA, idx: number): void {
  soa.firePrimary[idx] = 0;
  soa.fireSecondary[idx] = 0;
  soa.aimX[idx] = 0;
  soa.aimY[idx] = 0;
}
function zeroUtility(soa: IntentSOA, idx: number): void {
  soa.toggleShields[idx] = 0;
}

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

  /**
   * LEGACY: For compatibility, wraps updateSOA by building a temporary ShipIntent.
   * This will be removed once all systems are SOA-only.
   */
  public update(dt: number): ShipIntent {
    const soa: IntentSOA = (this.controller as any).soa!;
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
   * SOA-native update: Writes intent flags directly into the SOA buffers.
   * Guarantees all fields are reset before applying state-specific behavior
   * to avoid lingering values from previous frames or states.
   */
  public updateSOA(dt: number, soa: IntentSOA, idx: number): void {
    // === Baseline: clear all fields ===
    zeroMovement(soa, idx);
    zeroWeapons(soa, idx);
    zeroUtility(soa, idx);

    // Reset rarely used / optional fields as well
    soa.turnToAngle[idx] = 0;
    soa.afterburner[idx] = 0;
    soa.firingMode[idx] = 0;

    // If target is destroyed, remain inert this frame
    if (this.target.isDestroyed?.()) {
      return;
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
      // Phase switching: ramming <-> orbiting
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
        approachTargetSOA(this.ship, targetPos, selfVel, soa, idx);
        soa.firePrimary[idx] = 0;
        soa.fireSecondary[idx] = 0;
        soa.aimX[idx] = targetPos.x;
        soa.aimY[idx] = targetPos.y;
        soa.toggleShields[idx] = 1;
        return;
      }

      orbitTargetSOA(this.ship, selfVel, targetPos, this.actualOrbitRadius, this.orbitClockwise, soa, idx);
      soa.firePrimary[idx] = 0;
      soa.fireSecondary[idx] = 0;
      soa.aimX[idx] = targetPos.x;
      soa.aimY[idx] = targetPos.y;
      soa.toggleShields[idx] = 0;
      return;
    }

    // === Siege behavior
    if (behavior === 'siege') {
      const inRange = distSq <= this.siegeRange * this.siegeRange;

      if (inRange) {
        // Only rotation, no thrust
        faceTargetSOA(this.ship, targetPos, soa, idx);
        soa.thrustForward[idx] = 0;
        soa.brake[idx] = 1;
        soa.strafeLeft[idx] = 0;
        soa.strafeRight[idx] = 0;
      } else {
        approachTargetSOA(this.ship, targetPos, selfVel, soa, idx);
      }

      soa.firePrimary[idx] = 1;
      soa.fireSecondary[idx] = 0;
      const lead = leadTarget(selfPos, targetPos, targetVel, this.projectileSpeed);
      soa.aimX[idx] = lead.x;
      soa.aimY[idx] = lead.y;
      soa.toggleShields[idx] = 0;
      return;
    }

    // === Orbit behavior
    if (behavior === 'orbit') {
      orbitTargetSOA(this.ship, selfVel, targetPos, this.actualOrbitRadius, this.orbitClockwise, soa, idx);
      soa.firePrimary[idx] = 1;
      soa.fireSecondary[idx] = 0;
      const lead = leadTarget(selfPos, targetPos, targetVel, this.projectileSpeed);
      soa.aimX[idx] = lead.x;
      soa.aimY[idx] = lead.y;
      soa.toggleShields[idx] = 0;
      return;
    }

    // === Fallback: remain inert
    // (baseline reset already zeroed everything)
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
