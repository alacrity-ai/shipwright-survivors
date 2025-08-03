// src/game/boss/ai/bosses/flamelord/fsm/BossState_Idle.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';
import type { PhaseKey } from '@/game/boss/ai/interfaces/PhaseKey';

import { getShipBlocksInGroups } from '@/game/blocks/system/helpers/blockAccessors';
import { bulkUpgradeBlockIndicesOnShip } from '@/game/blocks/helpers/upgradeUtils';
import { shakeCamera } from '@/core/interfaces/events/CameraReporter';
import { audioManager } from '@/audio/Audio';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { sayContextualDialogue, clearCrazyMoeDialogue } from './helpers/pickDialogue';

type StateSequence = {
  states: string[];
  index: number;
};

const LEFT_GROUP_NUMBER = 1;
const RIGHT_GROUP_NUMBER = 2;
const CENTER_GROUP_NUMBER = 3;

const phaseSequences: Record<PhaseKey, StateSequence> = {
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
    const boss = controller.getBoss();
    const phase = controller.getCurrentPhase();

    // Determine upcoming state
    const sequence = phaseSequences[phase];
    const nextState = sequence.states[sequence.index];
    sayContextualDialogue(nextState);

    // Declarative phase configuration
    const phaseConfig: Record<string, { duration: number; upgradePhase?: number }> = {
      phase1: { duration: 4 },
      phase2: { duration: 3, upgradePhase: 2 },
      phase3: { duration: 2, upgradePhase: 3 },
      phase4: { duration: 1, upgradePhase: 4 },
    };

    const { duration, upgradePhase } = phaseConfig[phase] ?? { duration: 4 };
    this.duration = duration;

    // Upgrade only on entering a new phase
    if (upgradePhase !== undefined && boss.getBossPhase() !== upgradePhase) {
      boss.setBossPhase(upgradePhase);
      const flameThrowerBlockIndices = getShipBlocksInGroups(
        boss.numericId,
        [LEFT_GROUP_NUMBER, RIGHT_GROUP_NUMBER, CENTER_GROUP_NUMBER]
      );
      bulkUpgradeBlockIndicesOnShip(boss, flameThrowerBlockIndices, 1);
      shakeCamera(12, 1, 12, 'boss:upgrade');
      audioManager.play('assets/sounds/sfx/ship/attach_00.wav', 'sfx');
      createLightFlash(boss.getTransform().position.x, boss.getTransform().position.y, 2600, 2.0, 0.5, '#ff3211');
    }

    this.timer = 0;

    console.log('[BossState_Idle] Entering idle state, at phase: ', phase);
  }

  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void {
    this.timer += dt;

    // Smooth rotation toward player
    const ship = controller.getBoss();
    const currentTransform = ship.getTransform();
    const easedRot = this.rotateToward(currentTransform.rotation, context.angleToPlayer, 0.015);

    ship.setTransform({
      ...currentTransform,
      rotation: easedRot,
    });

    if (this.timer >= this.duration) {
      const phaseKey = controller.getCurrentPhase();
      const sequence = phaseSequences[phaseKey];

      const nextState = sequence.states[sequence.index];
      sequence.index = (sequence.index + 1) % sequence.states.length;

      controller.transitionTo(nextState);
    }
  }

  exit(controller: BaseBossAIController): void {
    clearCrazyMoeDialogue();
  }

  private rotateToward(current: number, target: number, maxStep: number): number {
    const delta = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return current + Math.sign(delta) * Math.min(Math.abs(delta), maxStep);
  }
}
