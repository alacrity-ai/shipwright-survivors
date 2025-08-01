// src/game/boss/ai/bosses/BaseBossAIController.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import { BossAIContext } from '@/game/boss/ai/BossAIContext';
import type { Ship } from '@/game/ship/Ship';

export abstract class BaseBossAIController {
  protected currentState!: BossState; // Initialized but not entered yet
  protected readonly context: BossAIContext;
  private started = false;

  constructor(
    protected readonly boss: Ship,
    protected readonly player: Ship
  ) {
    this.context = new BossAIContext(boss, player);
  }

  /** Explicit lifecycle entry point */
  public start(): void {
    if (this.started) return;

    this.started = true;
    this.currentState.enter(this);
  }

  /** Called once per simulation tick */
  public update(dt: number): void {
    if (!this.started) return;

    this.context.update(this.boss, this.player);
    this.currentState.update(dt, this, this.context);
  }

  public transitionTo(stateName: string): void {
    const next = this.getStateMap()[stateName];
    if (!next) throw new Error(`[BaseBossAIController] Unknown state: '${stateName}'`);

    console.log('[BaseBossAIController] Transitioning to state: ', stateName);

    this.currentState.exit(this);
    this.currentState = next;
    this.currentState.enter(this);
  }

  public getBoss(): Ship {
    return this.boss;
  }

  public getPlayer(): Ship {
    return this.player;
  }

  public getContext(): BossAIContext {
    return this.context;
  }

  protected abstract getStateMap(): Record<string, BossState>;
}
