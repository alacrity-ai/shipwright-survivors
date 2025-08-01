// src/game/boss/ai/bosses/flamelord/fsm/BossState_LeftFlankFlames.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';

import {
  getShipBlocksInGroup,
  fadeBlockLightsTo,
  pulseBlockLights,
  restoreBlockLights
} from '@/game/blocks/system/helpers/blockAccessors';

const LEFT_GROUP_NUMBER = 1;

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
    this.leftBlocks = getShipBlocksInGroup(boss.numericId, LEFT_GROUP_NUMBER);

    // Animate telegraph: Pulse the lights over telegraph duration
    pulseBlockLights(
      this.leftBlocks,
      32,        // base radius in pixels
      32,         // ±32 pixel pulse range → 96 to 160 radius
      1.5,        // frequency in Hz (1.5 cycles per second)
      'radius'
    );
  }

  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void {
    this.phaseTimer += dt;

    if (this.telegraphing && this.phaseTimer >= this.telegraphDuration) {
      this.telegraphing = false;

      // Stop pulsing the lights
      restoreBlockLights(this.leftBlocks);

      // 🔥 Activate left-side flamethrowers (placeholder logic)
      // Example: activateLeftFlamethrowers(controller.getBoss());
      // Assuming the boss's facing determines 0 degrees.  These flames would span 180 degrees to 300 degrees. (or 6 o'clock to 10 o'clock)

      // Optionally play audio cue here
      // GlobalAudioBus.emit('boss:flame:start', { side: 'left' });
    }

    if (!this.telegraphing && this.phaseTimer >= this.telegraphDuration + this.flameDuration) {
      controller.transitionTo('Idle');
    }
  }

  exit(controller: BaseBossAIController): void {
    // Cleanup telegraph lights (guard)
    restoreBlockLights(this.leftBlocks);

    // 🔥 Deactivate flamethrowers (placeholder)
    // Example: deactivateLeftFlamethrowers(controller.getBoss());
  }
}
