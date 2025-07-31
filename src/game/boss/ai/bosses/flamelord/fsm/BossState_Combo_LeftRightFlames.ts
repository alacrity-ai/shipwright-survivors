// src/game/boss/ai/bosses/flamelord/fsm/BossState_Combo_LeftRightFlames.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';

import {
  getLeftSideShipBlocks,
  getRightSideShipBlocks,
  boostBlockLights,
  restoreBlockLights
} from '@/game/blocks/system/helpers/blockAccessors';

export class BossState_Combo_LeftRightFlames implements BossState {
  public name = 'Combo_LeftRightFlames';

  private timer = 0;
  private telegraphDuration = 2.0;
  private flameDuration = 5.0;

  private telegraphing = true;
  private leftBlocks!: Uint32Array;
  private rightBlocks!: Uint32Array;

  enter(controller: BaseBossAIController): void {
    this.timer = 0;
    this.telegraphing = true;

    const hpPct = controller.getContext().healthPercent;

    // Escalation: Longer flames in lower HP phases
    if (hpPct < 0.25) {
      this.flameDuration = 6.0;
    } else if (hpPct < 0.5) {
      this.flameDuration = 5.5;
    } else {
      this.flameDuration = 5.0;
    }

    const boss = controller.getBoss();
    const id = boss.numericId;

    this.leftBlocks = getLeftSideShipBlocks(id);
    this.rightBlocks = getRightSideShipBlocks(id);

    // Telegraph both sides simultaneously
    boostBlockLights(this.leftBlocks, 2.0, 2.5);
    boostBlockLights(this.rightBlocks, 2.0, 2.5);

    // Optional: Combined flame charge sound
    // GlobalAudioBus.emit('boss:combo:leftRight:charge');
  }

  update(dt: number, controller: BaseBossAIController, _context: BossAIContext): void {
    this.timer += dt;

    if (this.telegraphing && this.timer >= this.telegraphDuration) {
      this.telegraphing = false;

      // 🔥 Activate both flank flame attacks (stub)
      // activateLeftFlamethrowers(controller.getBoss());
      // activateRightFlamethrowers(controller.getBoss());

      // Optional: Flame audio loop
      // GlobalAudioBus.emit('boss:combo:leftRight:start');
    }

    if (!this.telegraphing && this.timer >= this.telegraphDuration + this.flameDuration) {
      controller.transitionTo('Idle');
    }
  }

  exit(controller: BaseBossAIController): void {
    restoreBlockLights(this.leftBlocks);
    restoreBlockLights(this.rightBlocks);

    // 🔥 Deactivate flank flames (stub)
    // deactivateLeftFlamethrowers(controller.getBoss());
    // deactivateRightFlamethrowers(controller.getBoss());
  }
}
