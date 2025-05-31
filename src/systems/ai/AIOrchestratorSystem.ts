// src/systems/ai/AIOrchestratorSystem.ts

import type { AIControllerSystem } from './AIControllerSystem';
import type { IUpdatable } from '@/core/interfaces/types';

/**
 * Central coordinator for AI update scheduling.
 * Filters AIControllerSystems based on camera proximity via ShipCullingSystem.
 */
export class AIOrchestratorSystem implements IUpdatable {
  private readonly controllers: Set<AIControllerSystem> = new Set();
  private static instance: AIOrchestratorSystem | null = null;

  constructor() {
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
    const controllersToRemove: AIControllerSystem[] = [];

    for (const controller of this.controllers) {
      try {
        const ship = controller.getShip();

        if (!ship || typeof ship.getAllBlocks !== 'function') {
          controllersToRemove.push(controller);
          continue;
        }
        
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

  public removeControllersForShip(shipId: string): void {
    const controllersToRemove: AIControllerSystem[] = [];

    for (const controller of this.controllers) {
      const ship = controller.getShip();
      if (ship && ship.id === shipId) {
        controllersToRemove.push(controller);
      }
    }

    for (const controller of controllersToRemove) {
      this.removeController(controller);
    }
  }

  getControllerCount(): number {
    return this.controllers.size;
  }

  public clear(): void {
    this.controllers.clear();
  }
}
