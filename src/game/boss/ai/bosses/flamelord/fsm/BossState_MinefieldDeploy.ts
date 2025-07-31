// src/game/boss/ai/bosses/flamelord/fsm/BossState_MinefieldDeploy.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';

export class BossState_MinefieldDeploy implements BossState {
  public name = 'MinefieldDeploy';

  private timer = 0;
  private telegraphDuration = 2.5;

  private numMines = 8;
  private numLargeMines = 0;

  private detonated = false;

  enter(controller: BaseBossAIController): void {
    this.timer = 0;
    this.detonated = false;

    const hpPct = controller.getContext().healthPercent;

    // Escalation logic
    if (hpPct < 0.25) {
      this.numMines = 12;
      this.numLargeMines = 3;
      this.telegraphDuration = 2.0;
    } else if (hpPct < 0.5) {
      this.numMines = 10;
      this.numLargeMines = 1;
      this.telegraphDuration = 2.5;
    } else {
      this.numMines = 8;
      this.numLargeMines = 0;
      this.telegraphDuration = 3.0;
    }

    const boss = controller.getBoss();
    const center = boss.getTransform().position;

    // 🧨 STUB: Spawn mines in a radial ring
    // Replace this with actual system integration
    // Example:
    // MineSpawner.spawnRadialMineRing(center, {
    //   count: this.numMines,
    //   largeCount: this.numLargeMines,
    //   radius: boss.getArenaRadius() - safetyMargin,
    //   telegraphDuration: this.telegraphDuration,
    // });

    // Optionally play "mine deploy" audio cue
    // GlobalAudioBus.emit('boss:mine:deploy');
  }

  update(dt: number, controller: BaseBossAIController, _context: BossAIContext): void {
    this.timer += dt;

    if (!this.detonated && this.timer >= this.telegraphDuration) {
      this.detonated = true;

      // 💣 STUB: Detonate all mines
      // MineSpawner.triggerMineRingDetonation();

      // Optional: arena shake / audio cue
      // GlobalEventBus.emit('arena:quake', { magnitude: 0.6 });
    }

    if (this.detonated && this.timer >= this.telegraphDuration + 0.5) {
      controller.transitionTo('Idle');
    }
  }

  exit(controller: BaseBossAIController): void {
    // If needed: cleanup orphaned mines or cancel countdowns
    // MineSpawner.clearMineRing();
  }
}
