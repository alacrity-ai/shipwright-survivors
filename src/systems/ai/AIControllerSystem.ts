// src/systems/ai/AIControllerSystem.ts

import type { Ship } from '@/game/ship/Ship';
import type { MovementSystem } from '@/systems/physics/MovementSystem';
import type { WeaponSystem } from '@/systems/combat/WeaponSystem';
import type { UtilitySystem } from '@/systems/combat/UtilitySystem';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';
import type { BehaviorProfile } from './types/BehaviorProfile';
import type { BaseAIState } from './fsm/BaseAIState';
import type { CullabilityDelegate } from './interfaces/CullabilityDelegate';

import { FormationRegistry } from './formations/FormationRegistry';

import { IdleState } from './fsm/IdleState';

export class AIControllerSystem {
  private readonly ship: Ship;
  private readonly movementSystem: MovementSystem;
  private readonly weaponSystem: WeaponSystem;
  private readonly utilitySystem: UtilitySystem;
  private readonly behaviorProfile: BehaviorProfile;
  private initialState: BaseAIState | null = null;

  private cullabilityDelegate: CullabilityDelegate | null = null;

  private formationId: string | null = null;
  private formationRole: 'leader' | 'follower' | null = null;

  private formationRegistry: FormationRegistry | null = null;
  private leaderController: AIControllerSystem | null = null;

  private currentState: BaseAIState;
  private hunter: boolean = false; // Hunter controllers always run, regardless of distance from player

  constructor(
    ship: Ship, 
    movementSystem: MovementSystem, 
    weaponSystem: WeaponSystem, 
    utilitySystem: UtilitySystem, 
    behaviorProfile: BehaviorProfile) 
    {
    this.ship = ship;
    this.movementSystem = movementSystem;
    this.weaponSystem = weaponSystem;
    this.utilitySystem = utilitySystem;
    this.behaviorProfile = behaviorProfile;

    // Temporary fallback to IdleState to satisfy type safety
    this.currentState = new IdleState(this, ship);
  }

  public update(dt: number): void {
    // Check if ship is still valid
    const transform = this.ship.getTransform();

    try {
      const intent: ShipIntent = this.currentState.update(dt);

      const { movement, weapons, utility } = intent;
      this.movementSystem.setIntent(movement);
      this.weaponSystem.setIntent(weapons);
      this.utilitySystem.setIntent(utility);
      this.movementSystem.update(dt);
      this.utilitySystem.update(dt, this.ship, transform);
      this.weaponSystem.update(dt, this.ship, transform);

      const nextState = this.currentState.transitionIfNeeded();
      if (nextState) {
        this.setState(nextState);
      }
    } catch (error) {
      console.error("Error in AIControllerSystem update:", error);
    }
  }

  private setState(next: BaseAIState): void {
    this.currentState = next;
    next.onEnter();
  }

  public render(dt: number): void {
    // TODO: Deprecated. Weaponsystems don't need render. NOOP
    // try {
    //   this.weaponSystem.render(dt);
    //   // TODO : May need to add utility system render as well
    // } catch (error) {
    //   console.error("Error in AIControllerSystem render:", error);
    // }
  }

  public getShip(): Ship {
    return this.ship;
  }

  public getBehaviorProfile(): BehaviorProfile {
    return this.behaviorProfile;
  }

  public getCurrentState(): BaseAIState {
    return this.currentState;
  }

  public getCurrentStateString(): string {
    return this.currentState.constructor.name;
  }

  public setHunter(hunter: boolean): void {
    this.hunter = hunter;
  }

  public setCullabilityDelegate(delegate: CullabilityDelegate): void {
    this.cullabilityDelegate = delegate;
  }

  public makeUncullable(): void {
    this.cullabilityDelegate?.setUncullable(this, true);
  }

  public makeCullable(): void {
    this.cullabilityDelegate?.setCullable(this);
  }

  // Hunter system

  public isHunter(): boolean {
    return this.hunter;
  }

  // Formation System

  public setFormationContext(
    formationId: string,
    role: 'leader' | 'follower',
    registry?: FormationRegistry,
    leaderController?: AIControllerSystem
  ): void {
    this.formationId = formationId;
    this.formationRole = role;
    if (role === 'follower' && registry && leaderController) {
      this.formationRegistry = registry;
      this.leaderController = leaderController;
    }
  }

  public getFormationRegistry(): FormationRegistry | null {
    return this.formationRegistry;
  }

  public getFormationLeaderController(): AIControllerSystem | null {
    return this.leaderController;
  }

  public clearFormationContext(): void {
    this.formationId = null;
    this.formationRole = null;
    this.formationRegistry = null;
    this.leaderController = null;
  }

  public getFormationId(): string | null {
    return this.formationId;
  }

  public isInFormation(): boolean {
    return this.formationId !== null;
  }

  public isFormationLeader(): boolean {
    return this.formationRole === 'leader';
  }

  public isFormationFollower(): boolean {
    return this.formationRole === 'follower';
  }

  // State system 
  public setInitialState(state: BaseAIState): void {
    this.initialState = state;
    this.setState(state);
  }

  public getInitialState(): BaseAIState | null {
    return this.initialState;
  }
}
