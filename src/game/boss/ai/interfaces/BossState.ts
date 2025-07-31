// src/game/boss/ai/interfaces/BossState.ts

import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { BossAIContext } from '@/game/boss/ai/BossAIContext';

/**
 * Represents a single FSM state in a boss encounter.
 * Implemented by each boss-specific behavior module (e.g. FlameSweep, Idle).
 */
export interface BossState {
  /** Unique state identifier (must match key in stateMap) */
  name: string;

  /** Called when this state is entered */
  enter(controller: BaseBossAIController): void;

  /** Called every simulation tick */
  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void;

  /** Called when this state is exited */
  exit(controller: BaseBossAIController): void;
}
