// src/game/boss/ai/bosses/flamelord/fsm/BossState_LeftFlankFlames.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';
import type { BossDefinition } from '@/game/boss/interfaces/BossDefinition';

import { playActivationEffects } from '@/game/boss/ai/bosses/flamelord/fsm/helpers/activationShakeAndSound';

import {
  getShipBlocksInGroup,
  pulseBlockLights,
  restoreBlockLights
} from '@/game/blocks/system/helpers/blockAccessors';

import { DirectionalFlameThrowerMechanic } from '@/game/boss/ai/mechanics/mechs/DirectionalFlameThrowerMechanic';
import { rotateArc } from '@/game/boss/ai/mechanics/helpers/rotateArc';

const LEFT_GROUP_NUMBER = 1;

export class BossState_LeftFlankFlames implements BossState {
  public name = 'LeftFlankFlames';

  private bossDefinition: BossDefinition | null = null;

  private phaseTimer = 0;
  private telegraphDuration = 2.5;
  private flameDuration = 5;
  private trackingSpeed = 0.01;

  private telegraphing = true;
  private leftBlocks!: Uint32Array;

  private flameMechanic: DirectionalFlameThrowerMechanic | null = null;

  enter(controller: BaseBossAIController): void {
    this.phaseTimer = 0;
    this.telegraphing = true;
    this.flameMechanic = null;

    const phase = controller.getCurrentPhase();

    // Phase-driven tuning
    switch (phase) {
      case 'phase4':
        this.telegraphDuration = 2.5;
        this.flameDuration = 6.5;
        this.trackingSpeed = 0.004;
        break;
      case 'phase3':
        this.telegraphDuration = 3.5;
        this.flameDuration = 6.0;
        this.trackingSpeed = 0.003;
        break;
      case 'phase1':
      case 'phase2':
      default:
        this.telegraphDuration = 4.5;
        this.flameDuration = 5.0;
        this.trackingSpeed = 0.002;
        break;
    }

    const boss = controller.getBoss();
    this.bossDefinition = controller.getBossDefinition();
    this.leftBlocks = getShipBlocksInGroup(boss.numericId, LEFT_GROUP_NUMBER);

    pulseBlockLights(
      this.leftBlocks,
      32,    // base radius in pixels
      32,    // ±32 pixel pulse → 96–160px
      1.5,   // frequency in Hz
      'radius'
    );

    playActivationEffects(boss);
  }

  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void {
    this.phaseTimer += dt;

    const ship = controller.getBoss();
    const currentTransform = ship.getTransform();
    const damage = this.bossDefinition!.damageMultiplier * ship.getBossPhase();

    // Aim front + 120° right → left side faces player
    const desiredAngle = context.angleToPlayer + (2 * Math.PI / 3);
    const easedRot = this.rotateToward(currentTransform.rotation, desiredAngle, this.trackingSpeed);
    ship.setTransform({ ...currentTransform, rotation: easedRot });

    if (this.telegraphing) {
      if (this.phaseTimer >= this.telegraphDuration) {
        this.telegraphing = false;
        restoreBlockLights(this.leftBlocks);

        const [arcStartDeg, arcEndDeg] = rotateArc(180, 300, easedRot);
        this.flameMechanic = new DirectionalFlameThrowerMechanic(
          ship,
          arcStartDeg,
          arcEndDeg,
          this.flameDuration,
          damage
        );

        controller.getMechanics().add(this.flameMechanic);
      }
    } else {
      if (this.flameMechanic) {
        const [arcStartDeg, arcEndDeg] = rotateArc(180, 300, easedRot);
        this.flameMechanic.updateArc(arcStartDeg, arcEndDeg);
      }

      if (this.phaseTimer >= this.telegraphDuration + this.flameDuration) {
        controller.transitionTo('Idle');
      }
    }
  }

  exit(controller: BaseBossAIController): void {
    restoreBlockLights(this.leftBlocks);
  }

  private rotateToward(current: number, target: number, maxStep: number): number {
    const delta = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return current + Math.sign(delta) * Math.min(Math.abs(delta), maxStep);
  }
}
