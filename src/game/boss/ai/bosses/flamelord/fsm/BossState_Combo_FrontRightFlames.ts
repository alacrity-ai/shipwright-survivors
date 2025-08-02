// src/game/boss/ai/bosses/flamelord/fsm/BossState_Combo_FrontRightFlames.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';
import type { BossDefinition } from '@/game/boss/interfaces/BossDefinition';

import {
  getShipBlocksInGroups,
  pulseBlockLights,
  restoreBlockLights
} from '@/game/blocks/system/helpers/blockAccessors';

import { DirectionalFlameThrowerMechanic } from '@/game/boss/ai/mechanics/mechs/DirectionalFlameThrowerMechanic';
import { rotateArc } from '@/game/boss/ai/mechanics/helpers/rotateArc';

const CENTER_GROUP_NUMBER = 3;
const RIGHT_GROUP_NUMBER = 2;

export class BossState_Combo_FrontRightFlames implements BossState {
  public name = 'Combo_FrontRightFlames';

  private bossDefinition: BossDefinition | null = null;

  private timer = 0;
  private telegraphDuration = 3.0;
  private flameDuration = 5.5;

  private telegraphing = true;
  private telegraphBlocks!: Uint32Array;

  enter(controller: BaseBossAIController): void {
    this.timer = 0;
    this.telegraphing = true;

    const hpPct = controller.getContext().healthPercent;

    if (hpPct < 0.25) {
      this.telegraphDuration = 2.0;
      this.flameDuration = 6.5;
    } else if (hpPct < 0.5) {
      this.telegraphDuration = 2.5;
      this.flameDuration = 6.0;
    } else {
      this.telegraphDuration = 3.0;
      this.flameDuration = 5.5;
    }

    const boss = controller.getBoss();
    const id = boss.numericId;

    this.bossDefinition = controller.getBossDefinition();
    this.telegraphBlocks = getShipBlocksInGroups(id, [CENTER_GROUP_NUMBER, RIGHT_GROUP_NUMBER]);

    pulseBlockLights(this.telegraphBlocks, 32, 32, 1.5, 'radius');
  }

  update(dt: number, controller: BaseBossAIController, _context: BossAIContext): void {
    this.timer += dt;

    if (this.telegraphing && this.timer >= this.telegraphDuration) {
      this.telegraphing = false;
      restoreBlockLights(this.telegraphBlocks);

      const boss = controller.getBoss();
      const rot = boss.getTransform().rotation;

      const [frontStartDeg, frontEndDeg] = rotateArc(300, 60, rot);   // front cone
      const [rightStartDeg, rightEndDeg] = rotateArc(60, 180, rot);  // right flank

      controller.getMechanics().add(
        new DirectionalFlameThrowerMechanic(boss, frontStartDeg, frontEndDeg, this.flameDuration, this.bossDefinition!.damageMultiplier)
      );

      controller.getMechanics().add(
        new DirectionalFlameThrowerMechanic(boss, rightStartDeg, rightEndDeg, this.flameDuration, this.bossDefinition!.damageMultiplier)
      );

      // Optional: GlobalAudioBus.emit('boss:combo:frontRight:start');
    }

    if (!this.telegraphing && this.timer >= this.telegraphDuration + this.flameDuration) {
      controller.transitionTo('Idle');
    }
  }

  exit(controller: BaseBossAIController): void {
    restoreBlockLights(this.telegraphBlocks);
  }
}
