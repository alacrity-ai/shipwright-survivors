// src/systems/ai/AIOrchestratorSystem.ts

import type { AIControllerSystem } from './AIControllerSystem';
import type { IUpdatable } from '@/core/interfaces/types';
import type { Ship } from '@/game/ship/Ship';
import type { Grid } from '@/systems/physics/Grid';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { CullabilityDelegate } from './interfaces/CullabilityDelegate';

import { ShipGrid } from './ShipGrid';
import { FormationRegistry } from './formations/FormationRegistry';

const SCAN_RADIUS = 5000;

export class AIOrchestratorSystem implements IUpdatable, CullabilityDelegate {
  private static instance: AIOrchestratorSystem | null = null;

  private playerShip: Ship | null = null;
  private grid: Grid | null = null;
  private readonly shipGrid = new ShipGrid(1000); // Or tuned based on average ship size


  private readonly controllerToShipMap = new Map<AIControllerSystem, Ship>();
  private readonly shipIdToControllerMap = new Map<string, AIControllerSystem>();

  private readonly relevantControllers = new Set<AIControllerSystem>();

  private readonly formationRegistry = new FormationRegistry();

  private cachedRelevantBlocks: BlockInstance[] = [];
  private frameCounter: number = 0;
  private readonly REEVALUATE_FRAMES = 60;

  private readonly uncullableControllers = new Set<AIControllerSystem>();

  constructor() {
    AIOrchestratorSystem.instance = this;
  }

  public registerPlayerShip(ship: Ship): void {
    this.playerShip = ship;
    this.grid = ship.getGrid();
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

    this.relevantControllers.clear();
    const relevantControllers = this.relevantControllers;

    // 1. Update grid cell occupancy (ships may have moved)
    for (const [controller, ship] of this.controllerToShipMap) {
      this.shipGrid.updateShipPosition(ship);
    }

    // 2. Always retain uncullables (unless destroyed)
    for (const controller of this.uncullableControllers) {
      const ship = controller.getShip();
      if (ship.isDestroyed()) {
        this.removeController(controller);
        continue;
      }
      relevantControllers.add(controller);
    }

    // 3. Spatial query: ships near player (only every N frames)
    if (this.frameCounter++ % this.REEVALUATE_FRAMES === 0) {
      const playerPos = this.playerShip.getTransform().position;

      const nearbyShips = this.shipGrid.getShipsInRadius(
        playerPos.x,
        playerPos.y,
        SCAN_RADIUS
      );

      for (const ship of nearbyShips) {
        const controller = this.shipIdToControllerMap.get(ship.id);
        if (controller) {
          relevantControllers.add(controller);
        }
      }
    }

    // 4. Update all relevant controllers (with error handling)
    const controllersToRemove: AIControllerSystem[] = [];

    for (const controller of relevantControllers) {
      try {
        const ship = controller.getShip();
        if (!ship?.getAllBlocks) {
          controllersToRemove.push(controller);
          continue;
        }
        controller.update(dt);
      } catch (error) {
        console.error("Error updating AI controller:", error);
        controllersToRemove.push(controller);
      }
    }

    for (const controller of controllersToRemove) {
      this.removeController(controller);
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
