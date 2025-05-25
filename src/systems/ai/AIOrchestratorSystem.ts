// src/systems/ai/AIOrchestratorSystem.ts

import type { AIControllerSystem } from './AIControllerSystem';
import type { ShipCullingSystem } from '@/game/ship/systems/ShipCullingSystem';
import type { IUpdatable } from '@/core/interfaces/types';
import type { Ship } from '@/game/ship/Ship';

/**
 * Central coordinator for AI update scheduling.
 * Filters AIControllerSystems based on camera proximity via ShipCullingSystem.
 */
export class AIOrchestratorSystem implements IUpdatable {
  private readonly controllers: Set<AIControllerSystem> = new Set();
  private static instance: AIOrchestratorSystem | null = null;

  constructor(private readonly shipCulling: ShipCullingSystem) {
    AIOrchestratorSystem.instance = this;
  }

  addController(controller: AIControllerSystem): void {
    this.controllers.add(controller);
  }

  removeController(controller: AIControllerSystem): void {
    this.controllers.delete(controller);
  }

  update(dt: number): void {
    // Get the current set of active ships from the culling system
    const activeShips: Set<Ship> = new Set(this.shipCulling.getActiveAIShips());
    const controllersToRemove: AIControllerSystem[] = [];

    for (const controller of this.controllers) {
      try {
        const ship = controller.getShip();
        
        // Only remove controllers for ships that are definitely invalid
        // A ship is invalid if:
        // 1. It's undefined
        // 2. It doesn't have the getAllBlocks method (indicating it's been destroyed)
        if (!ship || typeof ship.getAllBlocks !== 'function') {
          controllersToRemove.push(controller);
          continue;
        }
        
        // IMPORTANT: Don't check activeShips.has(ship) during initialization
        // Ships might not be in the active list yet when they're first created
        
        // If we get here, the ship is valid, so update the controller
        controller.update(dt);
      } catch (error) {
        console.error("Error in AI controller:", error);
        controllersToRemove.push(controller);
      }
    }
    
    // Only remove controllers that we've explicitly marked for removal
    for (const controller of controllersToRemove) {
      this.removeController(controller);
    }
  }

  public static removeControllersForShip(shipId: string): void {
    if (!this.instance) return;
    
    const controllersToRemove: AIControllerSystem[] = [];
    
    // Find all controllers for this ship
    for (const controller of this.instance.controllers) {
      const ship = controller.getShip();
      if (ship && ship.id === shipId) {
        controllersToRemove.push(controller);
      }
    }
    
    // Remove the controllers
    for (const controller of controllersToRemove) {
      this.instance.removeController(controller);
      console.log(`Removed AI controller for ship ${shipId}`);
    }
  }
}
