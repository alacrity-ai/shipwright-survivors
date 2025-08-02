// src/game/boss/ai/bosses/flamelord/fsm/BossState_DetonatePulse.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';
import type { BossDefinition } from '@/game/boss/interfaces/BossDefinition';

import {
  getShipBlocksInGroups,
  pulseBlockLights,
  restoreBlockLights
} from '@/game/blocks/system/helpers/blockAccessors';

import { RadialExplosionMechanic } from '@/game/boss/ai/mechanics/mechs/RadialExplosionMechanic';
import { playActivationEffects } from '@/game/boss/ai/bosses/flamelord/fsm/helpers/activationShakeAndSound';

const LEFT_GROUP_NUMBER = 1;
const RIGHT_GROUP_NUMBER = 2;
const CENTER_GROUP_NUMBER = 3;

export class BossState_DetonatePulse implements BossState {
  public name = 'DetonatePulse';

  private bossDefinition: BossDefinition | null = null;

  private timer = 0;
  private telegraphDuration = 2.5;
  private explosionDuration = 1.0;

  private telegraphing = true;
  private detonated = false;

  private telegraphBlocks!: Uint32Array;
  private explosionMechanic: RadialExplosionMechanic | null = null;

  enter(controller: BaseBossAIController): void {
    this.timer = 0;
    this.telegraphing = true;
    this.detonated = false;
    this.explosionMechanic = null;

    const hpPct = controller.getContext().healthPercent;

    if (hpPct < 0.25) {
      this.telegraphDuration = 3.0;
      this.explosionDuration = 1.3;
    } else if (hpPct < 0.5) {
      this.telegraphDuration = 3.5;
      this.explosionDuration = 1.2;
    } else {
      this.telegraphDuration = 4.0;
      this.explosionDuration = 1.0;
    }

    const boss = controller.getBoss();
    const id = boss.numericId;

    this.bossDefinition = controller.getBossDefinition();
    this.telegraphBlocks = getShipBlocksInGroups(id, [LEFT_GROUP_NUMBER, CENTER_GROUP_NUMBER, RIGHT_GROUP_NUMBER]);

    pulseBlockLights(this.telegraphBlocks, 32, 32, 1.5, 'radius');
    playActivationEffects(boss);
  }

  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void {
    this.timer += dt;

    if (this.telegraphing && this.timer >= this.telegraphDuration) {
      this.telegraphing = false;
      this.detonated = true;
      restoreBlockLights(this.telegraphBlocks);

      const boss = controller.getBoss();
      this.explosionMechanic = new RadialExplosionMechanic(
        boss,
        this.explosionDuration,
        this.bossDefinition!.damageMultiplier
      );

      controller.getMechanics().add(this.explosionMechanic);
    }

    if (this.detonated && this.timer >= this.telegraphDuration + this.explosionDuration) {
      controller.transitionTo('Idle');
    }
  }

  exit(controller: BaseBossAIController): void {
    restoreBlockLights(this.telegraphBlocks);
  }
}
