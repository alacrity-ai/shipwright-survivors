// src/game/boss/ai/bosses/flamelord/fsm/BossState_MinefieldDeploy.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';
import type { BossDefinition } from '@/game/boss/interfaces/BossDefinition';

import { playActivationEffects } from '@/game/boss/ai/bosses/flamelord/fsm/helpers/activationShakeAndSound';
import { MinefieldMechanic } from '@/game/boss/ai/mechanics/mechs/MinefieldMechanic';

export class BossState_MinefieldDeploy implements BossState {
  public name = 'MinefieldDeploy';

  private timer = 0;
  private telegraphDuration = 2.5;
  private mineDuration = 6.0;
  private bigMineCount = 0;

  private detonated = false;
  private bossDefinition: BossDefinition | null = null;
  private mineMechanic: MinefieldMechanic | null = null;

  enter(controller: BaseBossAIController): void {
    this.timer = 0;
    this.detonated = false;
    this.mineMechanic = null;
    this.bossDefinition = controller.getBossDefinition();

    const phase = controller.getCurrentPhase();

    // Phase-driven tuning: increasingly rapid detonation and more big mines
    switch (phase) {
      case 'phase4':
        this.telegraphDuration = 0.2;
        this.mineDuration = 6.0;
        this.bigMineCount = 3;
        break;
      case 'phase3':
        this.telegraphDuration = 0.6;
        this.mineDuration = 6.0;
        this.bigMineCount = 2;
        break;
      case 'phase2':
        this.telegraphDuration = 1.0;
        this.mineDuration = 6.0;
        this.bigMineCount = 1;
        break;
      case 'phase1':
      default:
        this.telegraphDuration = 1.2;
        this.mineDuration = 6.0;
        this.bigMineCount = 0;
        break;
    }

    const boss = controller.getBoss();
    playActivationEffects(boss);
  }


  update(dt: number, controller: BaseBossAIController, _context: BossAIContext): void {
    this.timer += dt;

    if (!this.detonated && this.timer >= this.telegraphDuration) {
      this.detonated = true;

      const boss = controller.getBoss();
      const damage = this.bossDefinition!.damageMultiplier * boss.getBossPhase();
      this.mineMechanic = new MinefieldMechanic(
        boss,
        this.mineDuration,
        damage,
        this.bigMineCount
      );

      controller.getMechanics().add(this.mineMechanic);

      // Optional: ambient quake or other global cues
      // GlobalEventBus.emit('arena:quake', { magnitude: 0.6 });
    }

    if (this.detonated && this.timer >= this.telegraphDuration + this.mineDuration + 0.5) {
      controller.transitionTo('Idle');
    }
  }

  exit(_controller: BaseBossAIController): void {
    // No special cleanup required—mechanic is self-managed
  }
}
