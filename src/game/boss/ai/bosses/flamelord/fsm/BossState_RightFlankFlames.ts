// src/game/boss/ai/bosses/flamelord/fsm/BossState_RightFlankFlames.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';

import {
  getShipBlocksInGroup,
  pulseBlockLights,
  restoreBlockLights,
} from '@/game/blocks/system/helpers/blockAccessors';

const RIGHT_GROUP_NUMBER = 2;

export class BossState_RightFlankFlames implements BossState {
  public name = 'RightFlankFlames';

  private phaseTimer = 0;
  private telegraphDuration = 2.5;
  private flameDuration = 5;

  private telegraphing = true;
  private rightBlocks!: Uint32Array;

  enter(controller: BaseBossAIController): void {
    this.phaseTimer = 0;
    this.telegraphing = true;

    const hpPct = controller.getContext().healthPercent;

    // Escalation: shorter telegraphs, longer flames as HP decreases
    if (hpPct < 0.25) {
      this.telegraphDuration = 2.5;
      this.flameDuration = 6.5;
    } else if (hpPct < 0.5) {
      this.telegraphDuration = 3.5;
      this.flameDuration = 6;
    } else {
      this.telegraphDuration = 4.5;
      this.flameDuration = 5;
    }

    const boss = controller.getBoss();
    this.rightBlocks = getShipBlocksInGroup(boss.numericId, RIGHT_GROUP_NUMBER);

    // Animate telegraph: Pulse the lights over telegraph duration
    pulseBlockLights(
      this.rightBlocks,
      32,        // base radius in pixels
      32,        // ±32 pixel pulse range → 96 to 160 radius
      1.5,       // frequency in Hz (1.5 cycles per second)
      'radius'
    );
  }

  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void {
    this.phaseTimer += dt;

    if (this.telegraphing && this.phaseTimer >= this.telegraphDuration) {
      this.telegraphing = false;

      // Stop pulsing the lights
      restoreBlockLights(this.rightBlocks);

      // 🔥 Activate right-side flamethrowers (placeholder)
      // Example: activateRightFlamethrowers(controller.getBoss());
      // Assuming the boss's facing determines 0 degrees.  These flames would span 60 degrees to 180 degrees. (or 2 o'clock to 6 o'clock)
    }

    if (!this.telegraphing && this.phaseTimer >= this.telegraphDuration + this.flameDuration) {
      controller.transitionTo('Idle');
    }
  }

  exit(controller: BaseBossAIController): void {
    restoreBlockLights(this.rightBlocks);

    // 🔥 Deactivate right flamethrowers (placeholder)
    // Example: deactivateRightFlamethrowers(controller.getBoss());
  }
}
