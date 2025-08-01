import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';

import {
  getShipBlocksInGroup,
  getAllShipBlocks,
  pulseBlockLights,
  restoreBlockLights
} from '@/game/blocks/system/helpers/blockAccessors';

const LEFT_GROUP_NUMBER = 1;

export class BossState_FinalExam implements BossState {
  public name = 'FinalExam';

  private timer = 0;
  private step = 0;

  private leftBlocks!: Uint32Array;
  private allBlocks!: Uint32Array;

  private mineTelegraphDuration = 2.5;

  enter(controller: BaseBossAIController): void {
    this.timer = 0;
    this.step = 0;

    const boss = controller.getBoss();
    const hpPct = controller.getContext().healthPercent;
    const id = boss.numericId;

    this.leftBlocks = getShipBlocksInGroup(id, LEFT_GROUP_NUMBER);
    this.allBlocks = getAllShipBlocks(id);

    // Escalation tuning
    if (hpPct < 0.25) {
      this.mineTelegraphDuration = 2.0;
    } else {
      this.mineTelegraphDuration = 2.5;
    }

    // Step 0: Begin flames and deploy mines
    pulseBlockLights(this.leftBlocks, 32, 32, 1.5, 'radius');

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

      // 💣 STUB: Detonate mines
      // MineSpawner.triggerMineRingDetonation();

      // 🔥 STUB: Deactivate left flame arc
      // deactivateLeftFlamethrowers(controller.getBoss());

      restoreBlockLights(this.leftBlocks);
    }

    else if (this.step === 1 && this.timer >= 0.5) {
      this.step = 2;
      this.timer = 0;

      // Step 2: Telegraph instant detonation pulse
      pulseBlockLights(this.allBlocks, 40, 40, 2.0, 'intensity');

      // 💥 STUB: Trigger lethal radial AoE
      // triggerRadialExplosion(controller.getBoss(), { lethal: true });
    }

    else if (this.step === 2 && this.timer >= 0.5) {
      controller.transitionTo('Idle');
    }
  }

  exit(controller: BaseBossAIController): void {
    restoreBlockLights(this.leftBlocks);
    restoreBlockLights(this.allBlocks);
  }
}
