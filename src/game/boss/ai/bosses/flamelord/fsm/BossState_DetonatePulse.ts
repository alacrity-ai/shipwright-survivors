// src/game/boss/ai/bosses/flamelord/fsm/BossState_DetonatePulse.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';

import {
  getAllShipBlocks,
  pulseBlockLights,
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

    // Animate full-body pulse glow (intensity-based for critical charge feel)
    pulseBlockLights(this.allBlocks, 40, 40, 2.0, 'intensity');

    // Optional: rising tone / charge sfx
    // GlobalAudioBus.emit('boss:detonate:charge');
  }

  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void {
    this.timer += dt;

    if (!this.detonated && this.timer >= this.telegraphDuration) {
      this.detonated = true;

      // 💥 TODO: Radial AoE detonation
      // triggerRadialExplosion(controller.getBoss(), { lethalRadius: ..., falloff: ... });

      // Optional: freeze frame, shake, chromatic aberration, etc.
      // GlobalEventBus.emit('camera:freezeFrame', { duration: 0.1 });
    }

    if (this.detonated && this.timer >= this.telegraphDuration + 0.5) {
      controller.transitionTo('Idle');
    }
  }

  exit(controller: BaseBossAIController): void {
    restoreBlockLights(this.allBlocks);

    // Optional: terminate detonation audio loop
    // GlobalAudioBus.emit('boss:detonate:end');
  }
}
