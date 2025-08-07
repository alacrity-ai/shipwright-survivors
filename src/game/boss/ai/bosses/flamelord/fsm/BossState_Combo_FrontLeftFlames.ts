// src/game/boss/ai/bosses/flamelord/fsm/BossState_Combo_FrontLeftFlames.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';
import type { BossDefinition } from '@/game/boss/interfaces/BossDefinition';

import { playActivationEffects } from '@/game/boss/ai/bosses/flamelord/fsm/helpers/activationShakeAndSound';

import {
  getShipBlocksInGroups,
  pulseBlockLights,
  restoreBlockLights
} from '@/game/blocks/system/helpers/blockAccessors';

import { DirectionalFlameThrowerMechanic } from '@/game/boss/ai/mechanics/mechs/DirectionalFlameThrowerMechanic';
import { rotateArc } from '@/game/boss/ai/mechanics/helpers/rotateArc';

const CENTER_GROUP_NUMBER = 3;
const LEFT_GROUP_NUMBER = 1;

export class BossState_Combo_FrontLeftFlames implements BossState {
  public name = 'Combo_FrontLeftFlames';

  private bossDefinition: BossDefinition | null = null;

  private timer = 0;
  private telegraphDuration = 3.0;
  private flameDuration = 5.5;
  private trackingSpeed = 0.002;

  private telegraphing = true;
  private telegraphBlocks!: Uint32Array;

  private frontFlame: DirectionalFlameThrowerMechanic | null = null;
  private leftFlame: DirectionalFlameThrowerMechanic | null = null;

  enter(controller: BaseBossAIController): void {
    this.timer = 0;
    this.telegraphing = true;
    this.frontFlame = null;
    this.leftFlame = null;

    const phase = controller.getCurrentPhase();

    // Phase-based tuning logic for front + left combo flame attack
    switch (phase) {
      case 'phase4':
        this.telegraphDuration = 4.0;
        this.flameDuration = 6.5;
        this.trackingSpeed = 0.001;
        break;
      case 'phase3':
        this.telegraphDuration = 4.5;
        this.flameDuration = 6.0;
        this.trackingSpeed = 0.001;
        break;
      case 'phase1':
      case 'phase2':
      default:
        this.telegraphDuration = 5.0;
        this.flameDuration = 5.5;
        this.trackingSpeed = 0.001;
        break;
    }

    const boss = controller.getBoss();
    const id = boss.numericId;

    this.bossDefinition = controller.getBossDefinition();
    this.telegraphBlocks = getShipBlocksInGroups(id, [
      CENTER_GROUP_NUMBER,
      LEFT_GROUP_NUMBER,
    ]);

    pulseBlockLights(this.telegraphBlocks, 32, 32, 1.5, 'radius');
    playActivationEffects(boss);
  }

  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void {
    this.timer += dt;

    const boss = controller.getBoss();
    const damage = this.bossDefinition!.damageMultiplier * (boss.getBossPhase() * 1.5);
    const currentTransform = boss.getTransform();
    const easedRot = this.rotateToward(currentTransform.rotation, context.angleToPlayer, this.trackingSpeed);
    boss.setTransform({ ...currentTransform, rotation: easedRot });
    const arcWideningAmount = boss.getBossPhase() * 2.5;

    if (this.telegraphing) {
      if (this.timer >= this.telegraphDuration) {
        this.telegraphing = false;
        restoreBlockLights(this.telegraphBlocks);

        const [frontStart, frontEnd] = rotateArc(300, 60 + arcWideningAmount, easedRot);  // front cone
        const [leftStart, leftEnd]   = rotateArc(180 - arcWideningAmount, 300, easedRot); // left flank

        this.frontFlame = new DirectionalFlameThrowerMechanic(boss, frontStart, frontEnd, this.flameDuration, damage);
        this.leftFlame  = new DirectionalFlameThrowerMechanic(boss, leftStart, leftEnd, this.flameDuration, damage);

        controller.getMechanics().add(this.frontFlame);
        controller.getMechanics().add(this.leftFlame);
      }
    } else {
      if (this.frontFlame && this.leftFlame) {
        const [frontStart, frontEnd] = rotateArc(300, 60 + arcWideningAmount, easedRot);  // front cone
        const [leftStart, leftEnd]   = rotateArc(180 - arcWideningAmount, 300, easedRot); // left flank

        this.frontFlame.updateArc(frontStart, frontEnd);
        this.leftFlame.updateArc(leftStart, leftEnd);
      }

      if (this.timer >= this.telegraphDuration + this.flameDuration) {
        controller.transitionTo('Idle');
      }
    }
  }

  exit(controller: BaseBossAIController): void {
    restoreBlockLights(this.telegraphBlocks);
  }

  private rotateToward(current: number, target: number, maxStep: number): number {
    const delta = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return current + Math.sign(delta) * Math.min(Math.abs(delta), maxStep);
  }
}
