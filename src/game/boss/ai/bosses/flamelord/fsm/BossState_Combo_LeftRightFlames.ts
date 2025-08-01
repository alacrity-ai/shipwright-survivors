import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';

import {
  getShipBlocksInGroups,
  pulseBlockLights,
  restoreBlockLights
} from '@/game/blocks/system/helpers/blockAccessors';

const LEFT_GROUP_NUMBER = 1;
const RIGHT_GROUP_NUMBER = 2;

export class BossState_Combo_LeftRightFlames implements BossState {
  public name = 'Combo_LeftRightFlames';

  private timer = 0;
  private telegraphDuration = 3.0;
  private flameDuration = 5.0;

  private telegraphing = true;
  private flankBlocks!: Uint32Array;

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

    // Fetch both groups in one call
    this.flankBlocks = getShipBlocksInGroups(id, [LEFT_GROUP_NUMBER, RIGHT_GROUP_NUMBER]);

    // Telegraph both sides simultaneously with pulsing glow
    pulseBlockLights(this.flankBlocks, 32, 32, 1.5, 'radius');

    // Optional: Combined flame charge sound
    // GlobalAudioBus.emit('boss:combo:leftRight:charge');
  }

  update(dt: number, controller: BaseBossAIController, _context: BossAIContext): void {
    this.timer += dt;

    if (this.telegraphing && this.timer >= this.telegraphDuration) {
      this.telegraphing = false;

      // Stop pulsing the lights
      restoreBlockLights(this.flankBlocks);

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
    restoreBlockLights(this.flankBlocks);

    // 🔥 Deactivate flank flames (stub)
    // deactivateLeftFlamethrowers(controller.getBoss());
    // deactivateRightFlamethrowers(controller.getBoss());
  }
}
