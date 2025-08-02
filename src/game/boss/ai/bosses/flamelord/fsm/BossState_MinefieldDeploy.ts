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

    const hpPct = controller.getContext().healthPercent;

    // Escalation logic: longer detonations and more threatening timing under low HP
    if (hpPct < 0.25) {
      this.telegraphDuration = 0.2;
      this.mineDuration = 6.0;
      this.bigMineCount = 3;
    } else if (hpPct < 0.5) {
      this.telegraphDuration = 0.6;
      this.mineDuration = 6.0;
      this.bigMineCount = 2;
    } else if (hpPct < 0.75) {
      this.telegraphDuration = 1.0;
      this.mineDuration = 6.0;
      this.bigMineCount = 1;
    } else {
      this.telegraphDuration = 1.2;
      this.mineDuration = 6.0;
      this.bigMineCount = 0;
    }

    const boss = controller.getBoss();
    playActivationEffects(boss);
  }

  update(dt: number, controller: BaseBossAIController, _context: BossAIContext): void {
    this.timer += dt;

    if (!this.detonated && this.timer >= this.telegraphDuration) {
      this.detonated = true;

      const boss = controller.getBoss();
      this.mineMechanic = new MinefieldMechanic(
        boss,
        this.mineDuration,
        this.bossDefinition!.damageMultiplier,
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
