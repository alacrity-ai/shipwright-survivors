// src/game/boss/ai/bosses/flamelord/fsm/BossState_LeftFlankFlames.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';

import {
  getLeftSideShipBlocks,
  boostBlockLights,
  restoreBlockLights
} from '@/game/blocks/system/helpers/blockAccessors';

export class BossState_LeftFlankFlames implements BossState {
  public name = 'LeftFlankFlames';

  private phaseTimer = 0;
  private telegraphDuration = 2.5;
  private flameDuration = 5;

  private telegraphing = true;
  private leftBlocks!: Uint32Array;

  enter(controller: BaseBossAIController): void {
    this.phaseTimer = 0;
    this.telegraphing = true;

    const hpPct = controller.getContext().healthPercent;

    // Escalate based on HP
    if (hpPct < 0.25) {
      this.telegraphDuration = 1.5;
      this.flameDuration = 6.5;
    } else if (hpPct < 0.5) {
      this.telegraphDuration = 2.0;
      this.flameDuration = 6;
    } else {
      this.telegraphDuration = 2.5;
      this.flameDuration = 5;
    }

    const boss = controller.getBoss();
    this.leftBlocks = getLeftSideShipBlocks(boss.numericId);

    boostBlockLights(this.leftBlocks, 2.0, 2.5); // Telegraph effect: brighter and larger
  }

  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void {
    this.phaseTimer += dt;

    if (this.telegraphing && this.phaseTimer >= this.telegraphDuration) {
      this.telegraphing = false;

      // 🔥 Activate left-side flamethrowers (placeholder logic)
      // Example: activateLeftFlamethrowers(controller.getBoss());

      // Optionally play audio cue here
      // GlobalAudioBus.emit('boss:flame:start', { side: 'left' });
    }

    if (!this.telegraphing && this.phaseTimer >= this.telegraphDuration + this.flameDuration) {
      controller.transitionTo('Idle');
    }
  }

  exit(controller: BaseBossAIController): void {
    // Cleanup telegraph lights
    restoreBlockLights(this.leftBlocks);

    // 🔥 Deactivate flamethrowers (placeholder)
    // Example: deactivateLeftFlamethrowers(controller.getBoss());
  }
}
