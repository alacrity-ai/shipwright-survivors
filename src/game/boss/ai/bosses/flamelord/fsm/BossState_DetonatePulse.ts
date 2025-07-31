// src/game/boss/ai/bosses/flamelord/fsm/BossState_DetonatePulse.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';

import {
  getAllShipBlocks,
  boostBlockLights,
  restoreBlockLights
} from '@/game/blocks/system/helpers/blockAccessors';

export class BossState_DetonatePulse implements BossState {
  public name = 'DetonatePulse';

  private timer = 0;
  private telegraphDuration = 2.5;

  private allBlocks!: Uint32Array;
  private detonated = false;

  enter(controller: BaseBossAIController): void {
    this.timer = 0;
    this.detonated = false;

    const hpPct = controller.getContext().healthPercent;

    if (hpPct < 0.25) {
      this.telegraphDuration = 1.25;
    } else if (hpPct < 0.5) {
      this.telegraphDuration = 1.75;
    } else {
      this.telegraphDuration = 2.5;
    }

    const boss = controller.getBoss();
    this.allBlocks = getAllShipBlocks(boss.numericId);

    // Light all blocks up for dramatic full-body pulse
    boostBlockLights(this.allBlocks, 2.5, 2.5);

    // Optionally emit rising tone / charging cue
    // GlobalAudioBus.emit('boss:detonate:charge');
  }

  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void {
    this.timer += dt;

    if (!this.detonated && this.timer >= this.telegraphDuration) {
      this.detonated = true;

      // 💥 TODO: Replace with actual radial AoE effect centered on boss
      // e.g., triggerRadialExplosion(controller.getBoss(), { lethalRadius: ..., falloff: ... });

      // Optional: freeze frame, emit screen shake, trigger slow motion etc.
      // GlobalEventBus.emit('camera:freezeFrame', { duration: 0.1 });
    }

    // Hold for a brief moment post-detonation before transitioning
    if (this.detonated && this.timer >= this.telegraphDuration + 0.5) {
      controller.transitionTo('Idle');
    }
  }

  exit(controller: BaseBossAIController): void {
    restoreBlockLights(this.allBlocks);

    // Optionally end audio loop / resume music
    // GlobalAudioBus.emit('boss:detonate:end');
  }
}
