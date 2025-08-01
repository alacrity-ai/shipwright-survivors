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
    const currentTransform = ship.getTransform();
    const easedRot = this.rotateToward(currentTransform.rotation, context.angleToPlayer, 0.015);

    // Apply rotation via setter
    ship.setTransform({
      ...currentTransform,
      rotation: easedRot
    });

    if (this.timer >= this.duration) {
      const hpPct = context.healthPercent;

      let choices: { state: string; weight: number }[];

      if (hpPct > 0.75) {
        choices = [
          { state: 'LeftFlankFlames', weight: 1 },
          { state: 'RightFlankFlames', weight: 1 },
          { state: 'FrontalBarrage', weight: 1 },
          { state: 'MinefieldDeploy', weight: 1 },
        ];
      } else if (hpPct > 0.5) {
        choices = [
          { state: 'DetontePulse', weight: 1 },
          { state: 'LeftFlankFlames', weight: 1 },
          { state: 'RightFlankFlames', weight: 1 },
          { state: 'FrontalBarrage', weight: 1 },
          { state: 'MinefieldDeploy', weight: 1 },
        ];
      } else if (hpPct > 0.25) {
        choices = [
          { state: 'DetonatePulse', weight: 1 },
          { state: 'FrontalBarrage', weight: 1 },
          { state: 'MinefieldDeploy', weight: 1 },
          { state: 'Combo_LeftRightFlames', weight: 1 },
          { state: 'Combo_FrontRightFlames', weight: 1 },
        ];
      } else {
        choices = [
          { state: 'Combo_LeftRightFlames', weight: 1 },
          { state: 'Combo_FrontRightFlames', weight: 1 },
          { state: 'FinalExam', weight: 1 },
        ];
      }

      const totalWeight = choices.reduce((sum, c) => sum + c.weight, 0);
      const r = Math.random() * totalWeight;

      let acc = 0;
      for (const c of choices) {
        acc += c.weight;
        if (r <= acc) {
          controller.transitionTo(c.state);
          break;
        }
      }
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
