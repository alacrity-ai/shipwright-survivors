// src/game/boss/ai/bosses/BaseBossAIController.ts

import type { BossState } from '@/game/boss/ai/interfaces/BossState';
import type { CombatService } from '@/systems/combat/CombatService';
import type { Ship } from '@/game/ship/Ship';
import type { BossDefinition } from '@/game/boss/interfaces/BossDefinition';
import type { PhaseKey } from '@/game/boss/ai/interfaces/PhaseKey';

import { BossMechanicManager } from '@/game/boss/ai/mechanics/BossMechanicManager';
import { BossAIContext } from '@/game/boss/ai/BossAIContext';

export abstract class BaseBossAIController {
  protected currentState!: BossState;
  protected readonly context: BossAIContext;
  protected readonly mechanics: BossMechanicManager;
  protected readonly combatService: CombatService;
  protected readonly bossDefinition: BossDefinition;

  private started = false;
  private currentPhase: PhaseKey = 'phase1';

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

    console.log('[BaseBossAIController] Transitioning to state:', stateName);

    this.currentState.exit(this);
    this.currentState = next;
    this.currentState.enter(this);
  }

  /** Returns the active FSM state name (optional convenience) */
  public getCurrentStateName(): string {
    return this.currentState?.name ?? '(uninitialized)';
  }

  /** Returns the boss's current behavioral phase */
  public getCurrentPhase(): PhaseKey {
    this.updatePhaseFromHealth(this.context.healthPercent);
    return this.currentPhase;
  }

  /**
   * Determines and sets the current phase based on health percent.
   */
  private updatePhaseFromHealth(hpPct: number): void {
    if (hpPct > 0.75) {
      this.currentPhase = 'phase1';
    } else if (hpPct > 0.5) {
      this.currentPhase = 'phase2';
    } else if (hpPct > 0.25) {
      this.currentPhase = 'phase3';
    } else {
      this.currentPhase = 'phase4';
    }
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

  /** Subclass must return the map of legal states */
  protected abstract getStateMap(): Record<string, BossState>;
}
