// src/game/boss/ai/bosses/flamelord/fsm/BossState_RightFlankFlames.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';
import type { BossDefinition } from '@/game/boss/interfaces/BossDefinition';

import { playActivationEffects } from '@/game/boss/ai/bosses/flamelord/fsm/helpers/activationShakeAndSound';

import {
  getShipBlocksInGroup,
  pulseBlockLights,
  restoreBlockLights,
} from '@/game/blocks/system/helpers/blockAccessors';

import { DirectionalFlameThrowerMechanic } from '@/game/boss/ai/mechanics/mechs/DirectionalFlameThrowerMechanic';
import { rotateArc } from '@/game/boss/ai/mechanics/helpers/rotateArc';

const RIGHT_GROUP_NUMBER = 2;

export class BossState_RightFlankFlames implements BossState {
  public name = 'RightFlankFlames';

  private bossDefinition: BossDefinition | null = null;

  private phaseTimer = 0;
  private telegraphDuration = 2.5;
  private flameDuration = 5;
  private trackingSpeed = 0.01;

  private telegraphing = true;
  private rightBlocks!: Uint32Array;

  private flameMechanic: DirectionalFlameThrowerMechanic | null = null;

  enter(controller: BaseBossAIController): void {
    this.phaseTimer = 0;
    this.telegraphing = true;
    this.flameMechanic = null;

    const hpPct = controller.getContext().healthPercent;

    if (hpPct < 0.25) {
      this.telegraphDuration = 2.5;
      this.flameDuration = 6.5;
      this.trackingSpeed = 0.004;
    } else if (hpPct < 0.5) {
      this.telegraphDuration = 3.5;
      this.flameDuration = 6.0;
      this.trackingSpeed = 0.003;
    } else {
      this.telegraphDuration = 4.5;
      this.flameDuration = 5.0;
      this.trackingSpeed = 0.002;
    }

    const boss = controller.getBoss();
    this.bossDefinition = controller.getBossDefinition();    
    this.rightBlocks = getShipBlocksInGroup(boss.numericId, RIGHT_GROUP_NUMBER);

    pulseBlockLights(
      this.rightBlocks,
      32,   // base radius
      32,   // ±pulse range
      1.5,  // Hz
      'radius'
    );

    playActivationEffects(boss);
  }

  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void {
    this.phaseTimer += dt;

    const ship = controller.getBoss();
    const currentTransform = ship.getTransform();

    // Face player minus 120° → right side faces player
    const desiredAngle = context.angleToPlayer - (2 * Math.PI / 3);
    const easedRot = this.rotateToward(currentTransform.rotation, desiredAngle, this.trackingSpeed);
    ship.setTransform({ ...currentTransform, rotation: easedRot });

    if (this.telegraphing) {
      if (this.phaseTimer >= this.telegraphDuration) {
        this.telegraphing = false;

        restoreBlockLights(this.rightBlocks);

        const [arcStartDeg, arcEndDeg] = rotateArc(60, 180, easedRot);
        this.flameMechanic = new DirectionalFlameThrowerMechanic(
          ship,
          arcStartDeg,
          arcEndDeg,
          this.flameDuration,
          this.bossDefinition!.damageMultiplier
        );

        controller.getMechanics().add(this.flameMechanic);
      }
    } else {
      if (this.flameMechanic) {
        const [arcStartDeg, arcEndDeg] = rotateArc(60, 180, easedRot);
        this.flameMechanic.updateArc(arcStartDeg, arcEndDeg);
      }

      if (this.phaseTimer >= this.telegraphDuration + this.flameDuration) {
        controller.transitionTo('Idle');
      }
    }
  }

  exit(controller: BaseBossAIController): void {
    restoreBlockLights(this.rightBlocks);
  }

  private rotateToward(current: number, target: number, maxStep: number): number {
    const delta = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return current + Math.sign(delta) * Math.min(Math.abs(delta), maxStep);
  }
}
