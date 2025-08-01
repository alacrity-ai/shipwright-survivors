// src/game/boss/ai/bosses/flamelord/fsm/BossState_Combo_FrontRightFlames.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';
import { BlockManager } from '@/game/blocks/system/BlockManager';

import {
  getShipBlocksInGroups,
  pulseBlockLights,
  restoreBlockLights
} from '@/game/blocks/system/helpers/blockAccessors';

const RIGHT_GROUP_NUMBER = 2;
const CENTER_GROUP_NUMBER = 3;

export class BossState_Combo_FrontRightFlames implements BossState {
  public name = 'Combo_FrontRightFlames';

  private timer = 0;

  private frontTelegraphDuration = 3.0;
  private rightStaggerDelay = 0.5;
  private flameDuration = 5.5;

  private frontTelegraphed = false;
  private rightTelegraphed = false;
  private flamesActive = false;

  private frontBlocks!: Uint32Array;
  private rightBlocks!: Uint32Array;
  private telegraphBlocks!: Uint32Array;

  enter(controller: BaseBossAIController): void {
    this.timer = 0;
    this.frontTelegraphed = false;
    this.rightTelegraphed = false;
    this.flamesActive = false;

    const hpPct = controller.getContext().healthPercent;

    if (hpPct < 0.25) {
      this.frontTelegraphDuration = 1.5;
      this.rightStaggerDelay = 0.25;
      this.flameDuration = 6.5;
    } else if (hpPct < 0.5) {
      this.frontTelegraphDuration = 1.75;
      this.rightStaggerDelay = 0.4;
      this.flameDuration = 6.0;
    } else {
      this.frontTelegraphDuration = 2.0;
      this.rightStaggerDelay = 0.5;
      this.flameDuration = 5.5;
    }

    const boss = controller.getBoss();
    const id = boss.numericId;

    // Fetch both groups together for efficient access
    this.telegraphBlocks = getShipBlocksInGroups(id, [CENTER_GROUP_NUMBER, RIGHT_GROUP_NUMBER]);

    // Partition results without reallocation
    let frontCount = 0;
    for (let i = 0; i < this.telegraphBlocks.length; i++) {
      const blockIndex = this.telegraphBlocks[i];
      if (BlockManager.getInstance().getBlockStore().group[blockIndex] === CENTER_GROUP_NUMBER) {
        this.telegraphBlocks[frontCount++] = blockIndex;
      }
    }

    this.frontBlocks = this.telegraphBlocks.subarray(0, frontCount);
    this.rightBlocks = this.telegraphBlocks.subarray(frontCount);

    // Telegraph frontal arc immediately with pulse
    pulseBlockLights(this.frontBlocks, 32, 32, 1.5, 'radius');
  }

  update(dt: number, controller: BaseBossAIController, _context: BossAIContext): void {
    this.timer += dt;

    if (!this.rightTelegraphed && this.timer >= this.rightStaggerDelay) {
      this.rightTelegraphed = true;
      pulseBlockLights(this.rightBlocks, 32, 32, 1.5, 'radius');
    }

    if (!this.flamesActive && this.timer >= this.frontTelegraphDuration) {
      this.flamesActive = true;

      restoreBlockLights(this.frontBlocks);
      restoreBlockLights(this.rightBlocks);

      // 🔥 Activate flame arcs (stub)
      // activateFrontalFlamethrowers(controller.getBoss());
      // activateRightFlamethrowers(controller.getBoss());

      // GlobalAudioBus.emit('boss:combo:frontRight:start');
    }

    if (this.flamesActive && this.timer >= this.frontTelegraphDuration + this.flameDuration) {
      controller.transitionTo('Idle');
    }
  }

  exit(controller: BaseBossAIController): void {
    restoreBlockLights(this.frontBlocks);
    restoreBlockLights(this.rightBlocks);

    // 🔥 Deactivate flame arcs (stub)
    // deactivateFrontalFlamethrowers(controller.getBoss());
    // deactivateRightFlamethrowers(controller.getBoss());
  }
}
