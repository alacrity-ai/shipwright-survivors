// src/game/boss/ai/bosses/flamelord/fsm/BossState_Combo_LeftRightFlames.ts

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

const LEFT_GROUP_NUMBER = 1;
const RIGHT_GROUP_NUMBER = 2;

export class BossState_Combo_LeftRightFlames implements BossState {
  public name = 'Combo_LeftRightFlames';

  private bossDefinition: BossDefinition | null = null;

  private timer = 0;
  private telegraphDuration = 3.0;
  private flameDuration = 5.0;

  private telegraphing = true;
  private flankBlocks!: Uint32Array;

  enter(controller: BaseBossAIController): void {
    this.timer = 0;
    this.telegraphing = true;

    const hpPct = controller.getContext().healthPercent;

    if (hpPct < 0.25) {
      this.flameDuration = 6.0;
    } else if (hpPct < 0.5) {
      this.flameDuration = 5.5;
    } else {
      this.flameDuration = 5.0;
    }

    const boss = controller.getBoss();
    const id = boss.numericId;

    this.bossDefinition = controller.getBossDefinition();
    this.flankBlocks = getShipBlocksInGroups(id, [LEFT_GROUP_NUMBER, RIGHT_GROUP_NUMBER]);
    pulseBlockLights(this.flankBlocks, 32, 32, 1.5, 'radius');
  }

  update(dt: number, controller: BaseBossAIController, _context: BossAIContext): void {
    this.timer += dt;

    if (this.telegraphing && this.timer >= this.telegraphDuration) {
      this.telegraphing = false;
      restoreBlockLights(this.flankBlocks);

      const boss = controller.getBoss();
      const rotation = boss.getTransform().rotation;

      const [leftStartDeg, leftEndDeg] = rotateArc(180, 300, rotation);
      const [rightStartDeg, rightEndDeg] = rotateArc(60, 180, rotation);

      controller.getMechanics().add(
        new DirectionalFlameThrowerMechanic(
          boss,
          leftStartDeg,
          leftEndDeg,
          this.flameDuration, 
          this.bossDefinition!.damageMultiplier
        )
      );

      controller.getMechanics().add(
        new DirectionalFlameThrowerMechanic(
          boss,
          rightStartDeg,
          rightEndDeg,
          this.flameDuration, 
          this.bossDefinition!.damageMultiplier
        )
      );

      // Optional: GlobalAudioBus.emit('boss:combo:leftRight:start');
    }

    if (!this.telegraphing && this.timer >= this.telegraphDuration + this.flameDuration) {
      controller.transitionTo('Idle');
    }
  }

  exit(controller: BaseBossAIController): void {
    restoreBlockLights(this.flankBlocks);
  }
}
