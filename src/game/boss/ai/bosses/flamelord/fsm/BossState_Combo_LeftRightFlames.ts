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

const LEFT_GROUP_NUMBER = 1;
const RIGHT_GROUP_NUMBER = 2;

export class BossState_Combo_LeftRightFlames implements BossState {
  public name = 'Combo_LeftRightFlames';

  private bossDefinition: BossDefinition | null = null;

  private timer = 0;
  private telegraphDuration = 3.0;
  private flameDuration = 5.0;
  private trackingSpeed = 0.01;

  private telegraphing = true;
  private flankBlocks!: Uint32Array;

  private leftMechanic: DirectionalFlameThrowerMechanic | null = null;
  private rightMechanic: DirectionalFlameThrowerMechanic | null = null;

  enter(controller: BaseBossAIController): void {
    this.timer = 0;
    this.telegraphing = true;
    this.leftMechanic = null;
    this.rightMechanic = null;

    const phase = controller.getCurrentPhase();

    // Phase-specific parameter tuning for dual-flank flames
    switch (phase) {
      case 'phase4':
        this.flameDuration = 6.0;
        this.trackingSpeed = 0.004;
        break;
      case 'phase3':
        this.flameDuration = 5.5;
        this.trackingSpeed = 0.003;
        break;
      case 'phase1':
      case 'phase2':
      default:
        this.flameDuration = 5.0;
        this.trackingSpeed = 0.002;
        break;
    }

    const boss = controller.getBoss();
    const id = boss.numericId;

    this.bossDefinition = controller.getBossDefinition();
    this.flankBlocks = getShipBlocksInGroups(id, [LEFT_GROUP_NUMBER, RIGHT_GROUP_NUMBER]);

    pulseBlockLights(this.flankBlocks, 32, 32, 1.5, 'radius');
    playActivationEffects(boss);
  }

  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void {
    this.timer += dt;

    const boss = controller.getBoss();
    const currentTransform = boss.getTransform();
    const damage = this.bossDefinition!.damageMultiplier * boss.getBossPhase();

    // Align left flank toward player → rotate front +120°
    const desiredAngle = context.angleToPlayer + (2 * Math.PI / 3);
    const easedRot = this.rotateToward(currentTransform.rotation, desiredAngle, this.trackingSpeed);
    boss.setTransform({ ...currentTransform, rotation: easedRot });
    const arcWideningAmount = boss.getBossPhase() * 10;
    
    if (this.telegraphing) {
      if (this.timer >= this.telegraphDuration) {
        this.telegraphing = false;
        restoreBlockLights(this.flankBlocks);

        const [leftStartDeg, leftEndDeg] = rotateArc(180, 300 + arcWideningAmount, easedRot);
        const [rightStartDeg, rightEndDeg] = rotateArc(60 - arcWideningAmount, 180, easedRot);

        this.leftMechanic = new DirectionalFlameThrowerMechanic(
          boss,
          leftStartDeg,
          leftEndDeg,
          this.flameDuration,
          damage
        );

        this.rightMechanic = new DirectionalFlameThrowerMechanic(
          boss,
          rightStartDeg,
          rightEndDeg,
          this.flameDuration,
          damage
        );

        controller.getMechanics().add(this.leftMechanic);
        controller.getMechanics().add(this.rightMechanic);
      }
    } else {
      if (this.leftMechanic && this.rightMechanic) {
        const [leftStartDeg, leftEndDeg] = rotateArc(180, 300 + arcWideningAmount, easedRot);
        const [rightStartDeg, rightEndDeg] = rotateArc(60 - arcWideningAmount, 180, easedRot);

        this.leftMechanic.updateArc(leftStartDeg, leftEndDeg);
        this.rightMechanic.updateArc(rightStartDeg, rightEndDeg);
      }

      if (this.timer >= this.telegraphDuration + this.flameDuration) {
        controller.transitionTo('Idle');
      }
    }
  }

  exit(controller: BaseBossAIController): void {
    restoreBlockLights(this.flankBlocks);
  }

  private rotateToward(current: number, target: number, maxStep: number): number {
    const delta = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return current + Math.sign(delta) * Math.min(Math.abs(delta), maxStep);
  }
}
