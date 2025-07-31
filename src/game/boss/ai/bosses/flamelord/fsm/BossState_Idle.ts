// src/game/boss/ai/bosses/flamelord/fsm/BossState_Idle.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';

export class BossState_Idle implements BossState {
  public name = 'Idle';

  private timer = 0;
  private duration = 5;

  enter(controller: BaseBossAIController): void {
    const hpPct = controller.getContext().healthPercent;
    if (hpPct < 0.25) this.duration = 1;
    else if (hpPct < 0.5) this.duration = 2;
    else if (hpPct < 0.75) this.duration = 3;
    else this.duration = 5;

    this.timer = 0;

    // TODO: Integrate boss dialogue system
    // e.g., GlobalEventBus.emit('boss:speak', { line: 'idle_taunt_01' });
  }

  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void {
    this.timer += dt;

    const ship = controller.getBoss();
    const currentRot = ship.getTransform().rotation;
    const targetRot = context.angleToPlayer;
    const easedRot = this.rotateToward(currentRot, targetRot, 0.015); // Rotation easing
    ship.getTransform().rotation = easedRot;

    if (this.timer >= this.duration) {
      // TODO: Replace with weighted table based on context.healthPercent
      const next = Math.random() < 0.5 ? 'LeftFlankFlames' : 'MinefieldDeploy';
      controller.transitionTo(next);
    }
  }

  exit(controller: BaseBossAIController): void {
    // No cleanup necessary for Idle, but hook retained for symmetry
  }

  private rotateToward(current: number, target: number, maxStep: number): number {
    const delta = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return current + Math.sign(delta) * Math.min(Math.abs(delta), maxStep);
  }
}
