// src/systems/ai/AIControllerSystem.ts

import type { Ship } from '@/game/ship/Ship';
import type { MovementSystem } from '@/systems/physics/MovementSystem';
import type { WeaponSystem } from '@/systems/combat/WeaponSystem';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { IdleState } from './fsm/IdleState';
import type { BaseAIState } from './fsm/BaseAIState';

export class AIControllerSystem {
  private readonly ship: Ship;
  private readonly movementSystem: MovementSystem;
  private readonly weaponSystem: WeaponSystem;
  private currentState: BaseAIState;

  constructor(ship: Ship, movementSystem: MovementSystem, weaponSystem: WeaponSystem) {
    this.ship = ship;
    this.movementSystem = movementSystem;
    this.weaponSystem = weaponSystem;

    // Initial state
    this.currentState = new IdleState(this, ship);
  }

  public update(dt: number): void {
    // Check if ship is still valid
    if (!this.ship || !this.ship.getTransform) {
      return;
    }
    
    try {
      const intent: ShipIntent = this.currentState.update(dt);

      this.movementSystem.setIntent(intent.movement);
      this.weaponSystem.setIntent(intent.weapons);
      this.movementSystem.update(dt);
      
      // Add defensive check before updating weapon system
      if (this.ship.getAllBlocks && typeof this.ship.getAllBlocks === 'function') {
        try {
          this.weaponSystem.update(dt, this.ship, this.ship.getTransform());
        } catch (error) {
          console.error("Error updating weapon system in AIControllerSystem:", error);
        }
      }

      const nextState = this.currentState.transitionIfNeeded();
      if (nextState) {
        this.currentState = nextState;
      }
    } catch (error) {
      console.error("Error in AIControllerSystem update:", error);
    }
  }

  public getShip(): Ship {
    return this.ship;
  }

  public getCurrentState(): BaseAIState {
    return this.currentState;
  }
}
