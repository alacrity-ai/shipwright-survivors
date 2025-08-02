// src/game/boss/ai/bosses/BaseBossAIController.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { CombatService } from '@/systems/combat/CombatService';
import type { Ship } from '@/game/ship/Ship';

import type { BossDefinition } from '@/game/boss/interfaces/BossDefinition';

import { BossMechanicManager } from '@/game/boss/ai/mechanics/BossMechanicManager';
import { BossAIContext } from '@/game/boss/ai/BossAIContext';

export abstract class BaseBossAIController {
  protected currentState!: BossState;
  protected readonly context: BossAIContext;
  protected readonly mechanics: BossMechanicManager;
  protected readonly combatService: CombatService;
  protected readonly bossDefinition: BossDefinition;
  
  private started = false;

  constructor(
    protected readonly boss: Ship,
    protected readonly player: Ship,
    combatService: CombatService,
    bossDefinition: BossDefinition
  ) {
    this.context = new BossAIContext(boss, player);
    this.mechanics = new BossMechanicManager();
    this.combatService = combatService;
    this.bossDefinition = bossDefinition;
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
    this.mechanics.update(dt);
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

  public getMechanics(): BossMechanicManager {
    return this.mechanics;
  }

  public getCombatService(): CombatService {
    return this.combatService;
  }

  public getBossDefinition(): BossDefinition {
    return this.bossDefinition;
  }

  protected abstract getStateMap(): Record<string, BossState>;
}
