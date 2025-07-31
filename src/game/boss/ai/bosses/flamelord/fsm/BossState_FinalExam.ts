// src/game/boss/ai/bosses/flamelord/fsm/BossState_FinalExam.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';

import {
  getLeftSideShipBlocks,
  getAllShipBlocks,
  boostBlockLights,
  restoreBlockLights
} from '@/game/blocks/system/helpers/blockAccessors';

export class BossState_FinalExam implements BossState {
  public name = 'FinalExam';

  private timer = 0;
  private step = 0;

  private leftBlocks!: Uint32Array;
  private allBlocks!: Uint32Array;

  private mineTelegraphDuration = 2.5;
  private detonated = false;

  enter(controller: BaseBossAIController): void {
    this.timer = 0;
    this.step = 0;
    this.detonated = false;

    const boss = controller.getBoss();
    const hpPct = controller.getContext().healthPercent;
    const id = boss.numericId;

    this.leftBlocks = getLeftSideShipBlocks(id);
    this.allBlocks = getAllShipBlocks(id);

    // Escalation tuning
    if (hpPct < 0.25) {
      this.mineTelegraphDuration = 2.0;
    } else {
      this.mineTelegraphDuration = 2.5;
    }

    // Step 0: Initiate flames and deploy mines
    boostBlockLights(this.leftBlocks, 2.0, 2.5);

    // 🔥 STUB: Activate left flamethrowers
    // activateLeftFlamethrowers(boss);

    // 🧨 STUB: Spawn mine ring
    // MineSpawner.spawnRadialMineRing(boss.position, {
    //   count: 12,
    //   largeCount: 3,
    //   radius: boss.getArenaRadius() - margin,
    //   telegraphDuration: this.mineTelegraphDuration
    // });
  }

  update(dt: number, controller: BaseBossAIController, _context: BossAIContext): void {
    this.timer += dt;

    if (this.step === 0 && this.timer >= this.mineTelegraphDuration) {
      this.step = 1;
      this.timer = 0;

      // 💣 STUB: Trigger detonation
      // MineSpawner.triggerMineRingDetonation();

      // 🔥 STUB: Deactivate flames
      // deactivateLeftFlamethrowers(controller.getBoss());

      restoreBlockLights(this.leftBlocks);
    }

    else if (this.step === 1 && this.timer >= 0.5) {
      this.step = 2;
      this.timer = 0;

      // Step 2: Instant detonate pulse
      boostBlockLights(this.allBlocks, 2.5, 3.0);

      // 💥 STUB: Trigger radial AoE (instant lethal)
      // triggerRadialExplosion(controller.getBoss(), { lethal: true });
    }

    else if (this.step === 2 && this.timer >= 0.5) {
      controller.transitionTo('Idle');
    }
  }

  exit(controller: BaseBossAIController): void {
    restoreBlockLights(this.allBlocks);
  }
}
