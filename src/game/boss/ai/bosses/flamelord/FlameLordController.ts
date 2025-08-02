// src/game/boss/ai/bosses/flamelord/FlameLordController.ts

import type { CombatService } from '@/systems/combat/CombatService';

import { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { BossDefinition } from '@/game/boss/interfaces/BossDefinition';

import { BossState_Idle } from './fsm/BossState_Idle';
import { BossState_LeftFlankFlames } from './fsm/BossState_LeftFlankFlames';
import { BossState_MinefieldDeploy } from './fsm/BossState_MinefieldDeploy';
import { BossState_RightFlankFlames } from './fsm/BossState_RightFlankFlames';
import { BossState_FrontalBarrage } from './fsm/BossState_FrontalBarrage';
import { BossState_DetonatePulse } from './fsm/BossState_DetonatePulse';
import { BossState_Combo_LeftRightFlames } from './fsm/BossState_Combo_LeftRightFlames';
import { BossState_Combo_FrontRightFlames } from './fsm/BossState_Combo_FrontRightFlames';
import { BossState_Combo_FrontLeftFlames } from './fsm/BossState_Combo_FrontLeftFlames';
import { BossState_FinalExam } from './fsm/BossState_FinalExam';

import type { Ship } from '@/game/ship/Ship';

/**
 * FSM controller for the Flame Lord boss.
 * Owns its state map and initial state logic.
 */
export class FlameLordController extends BaseBossAIController {
  private readonly stateMap: Record<string, BossState>;

  constructor(boss: Ship, player: Ship, initialState: string = 'Idle', combatService: CombatService, bossDefinition: BossDefinition
  ) {
    super(boss, player, combatService, bossDefinition);

    this.stateMap = {
      Idle: new BossState_Idle(),
      LeftFlankFlames: new BossState_LeftFlankFlames(),
      RightFlankFlames: new BossState_RightFlankFlames(),
      FrontalBarrage: new BossState_FrontalBarrage(),
      DetonatePulse: new BossState_DetonatePulse(),
      MinefieldDeploy: new BossState_MinefieldDeploy(),
      Combo_LeftRightFlames: new BossState_Combo_LeftRightFlames(),
      Combo_FrontRightFlames: new BossState_Combo_FrontRightFlames(),
      Combo_FrontLeftFlames: new BossState_Combo_FrontLeftFlames(),
      FinalExam: new BossState_FinalExam(),
    };

    const initial = this.stateMap[initialState];
    if (!initial) throw new Error(`[FlameLordController] Invalid initial state: '${initialState}'`);

    this.currentState = initial;
  }

  protected getStateMap(): Record<string, BossState> {
    return this.stateMap;
  }
}
