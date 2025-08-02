// src/game/boss/ai/bosses/flamelord/fsm/BossState_LeftFlankFlames.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';
import type { BossDefinition } from '@/game/boss/interfaces/BossDefinition';

import {
  getShipBlocksInGroup,
  pulseBlockLights,
  restoreBlockLights
} from '@/game/blocks/system/helpers/blockAccessors';

import { DirectionalFlameThrowerMechanic } from '@/game/boss/ai/mechanics/mechs/DirectionalFlameThrowerMechanic';
import { rotateArc } from '@/game/boss/ai/mechanics/helpers/rotateArc';

const LEFT_GROUP_NUMBER = 1;

export class BossState_LeftFlankFlames implements BossState {
  public name = 'LeftFlankFlames';

  private bossDefinition: BossDefinition | null = null;

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
      this.flameDuration = 6.0;
    } else {
      this.telegraphDuration = 4.5;
      this.flameDuration = 5.0;
    }

    const boss = controller.getBoss();
    this.bossDefinition = controller.getBossDefinition();    
    this.leftBlocks = getShipBlocksInGroup(boss.numericId, LEFT_GROUP_NUMBER);

    pulseBlockLights(
      this.leftBlocks,
      32,   // base radius in pixels
      32,   // ±32 pixel pulse → 96–160px
      1.5,  // frequency in Hz
      'radius'
    );
  }

  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void {
    this.phaseTimer += dt;

    if (this.telegraphing && this.phaseTimer >= this.telegraphDuration) {
      this.telegraphing = false;

      restoreBlockLights(this.leftBlocks);

      const boss = controller.getBoss();
      const rotation = boss.getTransform().rotation;

      const [arcStartDeg, arcEndDeg] = rotateArc(180, 300, rotation);

      controller.getMechanics().add(
        new DirectionalFlameThrowerMechanic(
          boss,
          arcStartDeg,
          arcEndDeg,
          this.flameDuration,
          this.bossDefinition!.damageMultiplier
        )
      );

      // GlobalAudioBus.emit('boss:flame:start', { side: 'left' });
    }

    if (!this.telegraphing && this.phaseTimer >= this.telegraphDuration + this.flameDuration) {
      controller.transitionTo('Idle');
    }
  }

  exit(controller: BaseBossAIController): void {
    restoreBlockLights(this.leftBlocks);
    // Mechanics auto-cleanup on expiry; no manual teardown required.
  }
}
