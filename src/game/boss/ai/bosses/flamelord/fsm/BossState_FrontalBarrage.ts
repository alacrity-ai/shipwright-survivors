// src/game/boss/ai/bosses/flamelord/fsm/BossState_FrontalBarrage.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';

import {
  getShipBlocksInGroup,
  boostBlockLights,
  restoreBlockLights
} from '@/game/blocks/system/helpers/blockAccessors';

const CENTER_GROUP_NUMBER = 3;

export class BossState_FrontalBarrage implements BossState {
  public name = 'FrontalBarrage';

  private phaseTimer = 0;
  private telegraphDuration = 2.5;
  private flameDuration = 7;
  private trackingSpeed = 0.01;

  private telegraphing = true;
  private frontalBlocks!: Uint32Array;

  enter(controller: BaseBossAIController): void {
    this.phaseTimer = 0;
    this.telegraphing = true;

    const hpPct = controller.getContext().healthPercent;

    // Escalation scaling
    if (hpPct < 0.25) {
      this.telegraphDuration = 1.5;
      this.flameDuration = 9;
      this.trackingSpeed = 0.025;
    } else if (hpPct < 0.5) {
      this.telegraphDuration = 2.0;
      this.flameDuration = 8;
      this.trackingSpeed = 0.015;
    } else {
      this.telegraphDuration = 2.5;
      this.flameDuration = 7;
      this.trackingSpeed = 0.01;
    }

    const boss = controller.getBoss();
    this.frontalBlocks = getShipBlocksInGroup(boss.numericId, CENTER_GROUP_NUMBER);

    boostBlockLights(this.frontalBlocks, 2.0, 2.5);
  }

  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void {
    this.phaseTimer += dt;

    const ship = controller.getBoss();
    const transform = ship.getTransform();

    if (this.telegraphing) {
      if (this.phaseTimer >= this.telegraphDuration) {
        this.telegraphing = false;

        // 🔥 Begin flame stream (placeholder)
        // Example: activateFrontalFlamethrowers(ship);
        // Assuming the boss's facing determines 0 degrees.  These flames would span 300 degrees to 60 degrees. (or 10 o'clock to 2 o'clock)
      } else {
        // During telegraph, boss aligns to player
        transform.rotation = this.rotateToward(transform.rotation, context.angleToPlayer, this.trackingSpeed);
      }
    } else {
      // During flames, boss *continues tracking* player
      transform.rotation = this.rotateToward(transform.rotation, context.angleToPlayer, this.trackingSpeed);

      if (this.phaseTimer >= this.telegraphDuration + this.flameDuration) {
        controller.transitionTo('Idle');
      }
    }
  }

  exit(controller: BaseBossAIController): void {
    restoreBlockLights(this.frontalBlocks);

    // 🔥 Stop flame stream (placeholder)
    // Example: deactivateFrontalFlamethrowers(controller.getBoss());
  }

  private rotateToward(current: number, target: number, maxStep: number): number {
    const delta = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return current + Math.sign(delta) * Math.min(Math.abs(delta), maxStep);
  }
}
