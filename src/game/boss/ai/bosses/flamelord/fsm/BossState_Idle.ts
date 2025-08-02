import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';

type StateSequence = {
  states: string[];
  index: number;
};

const stateSequences: { [key: string]: StateSequence } = {
  phase1: {
    states: ['LeftFlankFlames', 'RightFlankFlames', 'FrontalBarrage', 'MinefieldDeploy'],
    index: 0,
  },
  phase2: {
    states: [
      'DetonatePulse',
      'Combo_LeftRightFlames',
      'Combo_FrontRightFlames',
      'Combo_FrontLeftFlames',
      'FrontalBarrage',
      'MinefieldDeploy',
    ],
    index: 0,
  },
  phase3: {
    states: [
      'DetonatePulse',
      'FrontalBarrage',
      'MinefieldDeploy',
      'Combo_LeftRightFlames',
      'Combo_FrontRightFlames',
      'Combo_FrontLeftFlames',
    ],
    index: 0,
  },
  phase4: {
    states: ['MinefieldDeploy', 'Combo_FrontRightFlames', 'Combo_FrontLeftFlames', 'FinalExam'],
    index: 0,
  },
};

export class BossState_Idle implements BossState {
  public name = 'Idle';

  private timer = 0;
  private duration = 4;

  enter(controller: BaseBossAIController): void {
    const hpPct = controller.getContext().healthPercent;
    if (hpPct < 0.25) this.duration = 1;
    else if (hpPct < 0.5) this.duration = 2;
    else if (hpPct < 0.75) this.duration = 3;
    else this.duration = 4;

    this.timer = 0;

    // TODO: Integrate boss dialogue system
    // e.g., GlobalEventBus.emit('boss:speak', { line: 'idle_taunt_01' });
  }

  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void {
    this.timer += dt;

    const ship = controller.getBoss();
    const currentTransform = ship.getTransform();
    const easedRot = this.rotateToward(currentTransform.rotation, context.angleToPlayer, 0.015);

    ship.setTransform({
      ...currentTransform,
      rotation: easedRot,
    });

    if (this.timer >= this.duration) {
      const hpPct = context.healthPercent;

      let phaseKey: keyof typeof stateSequences;
      if (hpPct > 0.75) phaseKey = 'phase1';
      else if (hpPct > 0.5) phaseKey = 'phase2';
      else if (hpPct > 0.25) phaseKey = 'phase3';
      else phaseKey = 'phase4';

      const sequence = stateSequences[phaseKey];
      const nextState = sequence.states[sequence.index];
      sequence.index = (sequence.index + 1) % sequence.states.length;

      controller.transitionTo(nextState);
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
