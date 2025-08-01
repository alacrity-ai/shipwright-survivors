// src/game/boss/ai/bosses/flamelord/fsm/BossState_FrontalBarrage.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';

import {
  getShipBlocksInGroup,
  pulseBlockLights,
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
      this.telegraphDuration = 2.5;
      this.flameDuration = 9;
      this.trackingSpeed = 0.004;
    } else if (hpPct < 0.5) {
      this.telegraphDuration = 3.5;
      this.flameDuration = 8;
      this.trackingSpeed = 0.003;
    } else {
      this.telegraphDuration = 4.5;
      this.flameDuration = 7;
      this.trackingSpeed = 0.002;
    }

    const boss = controller.getBoss();
    this.frontalBlocks = getShipBlocksInGroup(boss.numericId, CENTER_GROUP_NUMBER);

    // Animate telegraph: Pulse the lights over telegraph duration
    pulseBlockLights(
      this.frontalBlocks,
      32,        // base radius in pixels
      32,        // ±32 pixel pulse range → 96 to 160 radius
      1.5,       // frequency in Hz
      'radius'
    );
  }

  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void {
    this.phaseTimer += dt;

    const ship = controller.getBoss();
    const currentTransform = ship.getTransform();

    if (this.telegraphing) {
      if (this.phaseTimer >= this.telegraphDuration) {
        this.telegraphing = false;

        // Stop pulsing lights
        restoreBlockLights(this.frontalBlocks);

        // 🔥 Begin flame stream (placeholder)
        // Example: activateFrontalFlamethrowers(ship);
        // Assuming the boss's facing determines 0 degrees.  These flames would span 300 degrees to 60 degrees. (or 10 o'clock to 2 o'clock)
      } else {
        // During telegraph, boss aligns to player
        const easedRot = this.rotateToward(currentTransform.rotation, context.angleToPlayer, this.trackingSpeed);
        ship.setTransform({ ...currentTransform, rotation: easedRot });
      }
    } else {
      // During flames, boss *continues tracking* player
      const easedRot = this.rotateToward(currentTransform.rotation, context.angleToPlayer, this.trackingSpeed);
      ship.setTransform({ ...currentTransform, rotation: easedRot });

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
