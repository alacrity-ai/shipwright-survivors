// src/game/boss/ai/bosses/flamelord/fsm/BossState_FrontalBarrage.ts

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
import { ShipRegistry } from '@/game/ship/ShipRegistry';

const CENTER_GROUP_NUMBER = 3;

export class BossState_FrontalBarrage implements BossState {
  public name = 'FrontalBarrage';

  private bossDefinition: BossDefinition | null = null;

  private phaseTimer = 0;
  private telegraphDuration = 2.5;
  private flameDuration = 7;
  private trackingSpeed = 0.01;

  private telegraphing = true;
  private frontalBlocks!: Uint32Array;

  private flameMechanic: DirectionalFlameThrowerMechanic | null = null;

  enter(controller: BaseBossAIController): void {
    this.phaseTimer = 0;
    this.telegraphing = true;
    this.flameMechanic = null;

    const hpPct = controller.getContext().healthPercent;

    if (hpPct < 0.25) {
      this.telegraphDuration = 2.5;
      this.flameDuration = 9;
      this.trackingSpeed = 0.004;
    } else if (hpPct < 0.5) {
      this.telegraphDuration = 3.5;
      this.flameDuration = 8;
      this.trackingSpeed = 0.003;
    } else {
      this.telegraphDuration = 4.5;
      this.flameDuration = 7;
      this.trackingSpeed = 0.002;
    }

    const boss = controller.getBoss();
    this.bossDefinition = controller.getBossDefinition();
    this.frontalBlocks = getShipBlocksInGroup(boss.numericId, CENTER_GROUP_NUMBER);

    pulseBlockLights(
      this.frontalBlocks,
      32,  // base radius
      32,  // ±pulse range
      1.5, // Hz
      'radius'
    );

    playActivationEffects(boss);
  }

  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void {
    this.phaseTimer += dt;

    const ship = controller.getBoss();
    const currentTransform = ship.getTransform();

    const easedRot = this.rotateToward(currentTransform.rotation, context.angleToPlayer, this.trackingSpeed);
    ship.setTransform({ ...currentTransform, rotation: easedRot });

    if (this.telegraphing) {
      if (this.phaseTimer >= this.telegraphDuration) {
        this.telegraphing = false;
        restoreBlockLights(this.frontalBlocks);

        const [arcStartDeg, arcEndDeg] = rotateArc(300, 60, easedRot);
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
        const [arcStartDeg, arcEndDeg] = rotateArc(300, 60, easedRot);
        this.flameMechanic.updateArc(arcStartDeg, arcEndDeg);
      }

      if (this.phaseTimer >= this.telegraphDuration + this.flameDuration) {
        controller.transitionTo('Idle');
      }
    }
  }


  exit(controller: BaseBossAIController): void {
    restoreBlockLights(this.frontalBlocks);
  }

  private rotateToward(current: number, target: number, maxStep: number): number {
    const delta = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return current + Math.sign(delta) * Math.min(Math.abs(delta), maxStep);
  }
}
