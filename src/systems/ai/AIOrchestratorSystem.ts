// src/systems/ai/AIOrchestratorSystem.ts

import type { AIControllerSystem } from './AIControllerSystem';
import type { IUpdatable } from '@/core/interfaces/types';
import type { Ship } from '@/game/ship/Ship';
import type { CullabilityDelegate } from './interfaces/CullabilityDelegate';

import { aiSystemFrameBudgetMs } from '@/config/graphicsConfig';

import { ShipGrid } from '@/game/ship/ShipGrid';
import { FormationRegistry } from './formations/FormationRegistry';

const SCAN_RADIUS = 5000;

export class AIOrchestratorSystem implements IUpdatable, CullabilityDelegate {
  private static instance: AIOrchestratorSystem | null = null;

  private playerShip: Ship | null = null;

  private readonly controllerToShipMap = new Map<AIControllerSystem, Ship>();
  private readonly shipIdToControllerMap = new Map<string, AIControllerSystem>();

  private readonly relevantControllers = new Set<AIControllerSystem>();

  private readonly formationRegistry = new FormationRegistry();

  private frameCounter: number = 0;
  private readonly REEVALUATE_FRAMES = 60;

  private readonly uncullableControllers = new Set<AIControllerSystem>();

  private frameBudgetMs: number = aiSystemFrameBudgetMs;
  private lastControllerIndex: number = 0;
  private readonly tempControllerList: AIControllerSystem[] = [];

  constructor(private shipGrid: ShipGrid) {
    AIOrchestratorSystem.instance = this;
    this.shipGrid = shipGrid;
  }

  public registerPlayerShip(ship: Ship): void {
    this.playerShip = ship;
  }

  public clearPlayerShip(): void {
    this.playerShip = null;
    this.shipGrid.clear();
  }

  public addController(controller: AIControllerSystem, unCullable: boolean = false): void {
    const ship = controller.getShip();
    if (!ship) return;

    ship.updateBlockPositions();
    this.controllerToShipMap.set(controller, ship);
    this.shipIdToControllerMap.set(ship.id, controller);

    this.setUncullable(controller, unCullable || controller.isHunter());
    controller.setCullabilityDelegate(this);
    
    this.shipGrid.addShip(ship);

    const formation = this.formationRegistry.getFormationByShipId(ship.id);
    if (formation) {
      if (formation.leaderId === ship.id) {
        controller.setFormationContext(formation.formationId, 'leader');
      } else {
        const leaderController = this.shipIdToControllerMap.get(formation.leaderId) ?? null;
        if (leaderController) {
          controller.setFormationContext(
            formation.formationId,
            'follower',
            this.formationRegistry,
            leaderController
          );
        }
      }
    }
  }

  public removeController(controller: AIControllerSystem): void {
    const ship = this.controllerToShipMap.get(controller);
    if (ship) {
      this.shipIdToControllerMap.delete(ship.id);
      this.shipGrid.removeShip(ship);
    }

    this.controllerToShipMap.delete(controller);
    this.uncullableControllers.delete(controller);
  }

  public getAllControllers(): IterableIterator<[AIControllerSystem, Ship]> {
    return this.controllerToShipMap.entries();
  }

  public removeControllersForShip(shipId: string): void {
    const controller = this.shipIdToControllerMap.get(shipId);
    if (controller) {
      this.removeController(controller);
    }
  }

  public getControllerCount(): number {
    return this.controllerToShipMap.size;
  }

  public getFormationRegistry(): FormationRegistry {
    return this.formationRegistry;
  }

  public getUncullableControllerCount(): number {
    return this.uncullableControllers.size;
  }

  public setUncullable(controller: AIControllerSystem, uncullable: boolean): void {
    if (!this.controllerToShipMap.has(controller)) {
      console.warn('[AIOrchestrator] Attempted to set uncullable status for unregistered controller.');
      return;
    }

    const isCurrentlyUncullable = this.uncullableControllers.has(controller);

    if (uncullable && !isCurrentlyUncullable) {
      this.uncullableControllers.add(controller);
    } else if (!uncullable && isCurrentlyUncullable) {
      this.uncullableControllers.delete(controller);
    }
  }

  public setCullable(controller: AIControllerSystem): void {
    if (!this.controllerToShipMap.has(controller)) {
      console.warn('[AIOrchestrator] Attempted to set cullable status for unregistered controller.');
      return;
    }

    if (this.uncullableControllers.has(controller)) {
      this.uncullableControllers.delete(controller);
    }
  }

  public clear(): void {
    this.controllerToShipMap.clear();
    this.shipIdToControllerMap.clear();
    this.uncullableControllers.clear();
    this.shipGrid.clear();
  }

  public update(dt: number): void {
    if (!this.playerShip) return;

    const now = performance.now();
    const deadline = now + this.frameBudgetMs;

    // === 1. Update ship grid occupancy (every frame) ===
    for (const [controller, ship] of this.controllerToShipMap) {
      this.shipGrid.updateShipPosition(ship);
    }

    // === 2. Manage relevant controllers set ===
    // Only rebuild the entire set every REEVALUATE_FRAMES to avoid expensive spatial queries
    if (this.frameCounter++ % this.REEVALUATE_FRAMES === 0) {
      // Full rebuild: clear and repopulate from scratch
      this.relevantControllers.clear();
      
      // Always include uncullables (if not destroyed)
      for (const controller of this.uncullableControllers) {
        const ship = controller.getShip();
        if (!ship || ship.isDestroyed()) {
          this.removeController(controller);
        } else {
          this.relevantControllers.add(controller);
        }
      }
      
      // Include spatially relevant controllers near player
      const playerPos = this.playerShip.getTransform().position;
      const nearbyShips = this.shipGrid.getShipsInRadius(
        playerPos.x,
        playerPos.y,
        SCAN_RADIUS
      );

      for (const ship of nearbyShips) {
        const controller = this.shipIdToControllerMap.get(ship.id);
        if (controller) {
          this.relevantControllers.add(controller);
        }
      }
    } else {
      // Non-reevaluation frames: just clean up destroyed uncullables
      // (spatial controllers persist until next reevaluation)
      for (const controller of this.uncullableControllers) {
        const ship = controller.getShip();
        if (!ship || ship.isDestroyed()) {
          this.removeController(controller);
        }
      }
    }

    // === 3. Fair update with frame budget ===
    const controllersToRemove: AIControllerSystem[] = [];

    // Take a stable snapshot to avoid mutation during iteration
    this.tempControllerList.length = 0;
    for (const c of this.relevantControllers) {
      this.tempControllerList.push(c);
    }

    // Early exit if no controllers to update
    if (this.tempControllerList.length === 0) return;

    const total = this.tempControllerList.length;
    let index = this.lastControllerIndex % total;
    let processed = 0;

    // Process controllers starting from where we left off last frame
    for (processed = 0; processed < total; processed++) {
      const controller = this.tempControllerList[index];

      try {
        const ship = controller.getShip();
        if (!ship?.getAllBlocks) {
          // Ship is invalid, mark for removal
          controllersToRemove.push(controller);
        } else {
          // Update the AI controller
          controller.update(dt);
        }
      } catch (err) {
        console.error('Error updating AI controller:', err);
        controllersToRemove.push(controller);
      }

      // Advance to next controller
      index = (index + 1) % total;
      
      // Check if we've exceeded our frame time budget
      if (performance.now() > deadline) {
        // Save where to continue next frame (current index points to next unprocessed)
        this.lastControllerIndex = index;
        break;
      }
    }

    // === 4. Remove invalidated controllers ===
    for (const c of controllersToRemove) {
      this.removeController(c);
    }

    // If we completed the full loop without hitting deadline, reset cursor for next frame
    if (processed === total) {
      this.lastControllerIndex = 0;
    }
  }

  public render(dt: number): void {
    for (const [controller] of this.controllerToShipMap) {
      try {
        if (typeof controller.render === 'function') {
          controller.render(dt);
        }
      } catch (error) {
        console.error('Error rendering AI controller:', error);
      }
    }
  }

  public getUncullableControllerStates(): string[] {
    const result: string[] = [];
    for (const controller of this.uncullableControllers) {
      result.push(controller.getCurrentStateString());
    }
    return result;
  }
}
