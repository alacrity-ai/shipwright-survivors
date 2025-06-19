// src/systems/ai/AIOrchestratorSystem.ts

import type { AIControllerSystem } from './AIControllerSystem';
import type { IUpdatable } from '@/core/interfaces/types';
import type { Ship } from '@/game/ship/Ship';
import type { Grid } from '@/systems/physics/Grid';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';

import { FormationRegistry } from './formations/FormationRegistry';

const SCAN_RADIUS = 5000;

/**
 * Central coordinator for AI update scheduling.
 * Filters AIControllerSystems based on spatial proximity to the player.
 */
export class AIOrchestratorSystem implements IUpdatable {
  private static instance: AIOrchestratorSystem | null = null;

  private playerShip: Ship | null = null;
  private grid: Grid | null = null;
  private readonly controllerToShipMap = new Map<AIControllerSystem, Ship>();

  private readonly formationRegistry = new FormationRegistry();

  private cachedRelevantBlocks: BlockInstance[] = [];
  private frameCounter: number = 0;
  private readonly REEVALUATE_FRAMES = 60;

  private readonly hunterControllers = new Set<AIControllerSystem>();

  constructor() {
    AIOrchestratorSystem.instance = this;
  }
  
  // Efficient accessor for controllers:


  public registerPlayerShip(ship: Ship): void {
    this.playerShip = ship;
    this.grid = ship.getGrid(); // All ships share the same spatial grid
  }

  public addController(controller: AIControllerSystem): void {
    const ship = controller.getShip();
    if (ship) {
      ship.updateBlockPositions(); // Ensure correct spatial index
      this.controllerToShipMap.set(controller, ship);

      // Formation detection and context assignment
      const formation = this.formationRegistry.getFormationByShipId(ship.id);
      if (formation) {
        console.log('[AIOrchestratorSystem] Assigning formation context to ship:', ship.id);
        if (formation.leaderId === ship.id) {
          console.log('[AIOrchestratorSystem] Ship is formation leader:', ship.id);
          controller.setFormationContext(formation.formationId, 'leader');
        } else {
          // === Find the leader controller ===
          console.log('[AIOrchestratorSystem] Ship is formation follower, attempting to find leader:', ship.id);
          let leaderController: AIControllerSystem | null = null;
          for (const [candidate, candidateShip] of this.controllerToShipMap.entries()) {
            if (candidateShip.id === formation.leaderId) {
              console.log('[AIOrchestratorSystem] Found leader controller for follower:', ship.id);
              leaderController = candidate;
              break;
            }
          }

          if (leaderController) {
            console.log('[AIOrchestratorSystem] Setting formation context for follower:', ship.id);
            controller.setFormationContext(
              formation.formationId,
              'follower',
              this.formationRegistry,
              leaderController
            );
          }
        }
      }

      if (controller.isHunter()) {
        this.hunterControllers.add(controller);
      }
    }
  }

  public removeController(controller: AIControllerSystem): void {
    this.controllerToShipMap.delete(controller);
    this.hunterControllers.delete(controller);
  }

  /** Returns all active AI controllers */
  public getAllControllers(): IterableIterator<[AIControllerSystem, Ship]> {
    return this.controllerToShipMap.entries();
  }

  public removeControllersForShip(shipId: string): void {
    const controllersToRemove: AIControllerSystem[] = [];

    for (const [controller, ship] of this.controllerToShipMap.entries()) {
      if (ship.id === shipId) {
        controllersToRemove.push(controller);
      }
    }

    for (const controller of controllersToRemove) {
      this.removeController(controller);
    }
  }

  public getControllerCount(): number {
    return this.controllerToShipMap.size;
  }

  public getFormationRegistry(): FormationRegistry {
    return this.formationRegistry;
  }

  public getHunterControllerCount(): number {
    return this.hunterControllers.size;
  }

  public clear(): void {
    this.controllerToShipMap.clear();
  }

  public update(dt: number): void {
    if (!this.playerShip || !this.grid) return;

    // Recalculate visible area every N frames
    if (this.frameCounter++ % this.REEVALUATE_FRAMES === 0) {
      const playerPos = this.playerShip.getTransform().position;

      const minX = playerPos.x - SCAN_RADIUS;
      const maxX = playerPos.x + SCAN_RADIUS;
      const minY = playerPos.y - SCAN_RADIUS;
      const maxY = playerPos.y + SCAN_RADIUS;

      this.cachedRelevantBlocks = this.grid.getBlocksInArea(minX, minY, maxX, maxY);
    }

    // Build fast lookup from shipId → controller
    const shipIdToController = new Map<string, AIControllerSystem>();
    for (const [controller, ship] of this.controllerToShipMap) {
      shipIdToController.set(ship.id, controller);
    }

    // Identify relevant controllers from nearby block owners
    const relevantControllers = new Set<AIControllerSystem>();

    // Add hunter controllers unconditionally
    for (const controller of this.hunterControllers) {
      relevantControllers.add(controller);
    }

    // Add spatially-local controllers from nearby blocks
    for (const block of this.cachedRelevantBlocks) {
      const owner = block.ownerShipId;
      if (!owner) {
        console.warn("Block in spatial query missing ownerShipId!", block);
        continue;
      }

      const controller = shipIdToController.get(owner);
      if (controller) {
        relevantControllers.add(controller); // idempotent
      }
    }

    // === Update relevant controllers ===
    const controllersToRemove: AIControllerSystem[] = [];

    for (const controller of relevantControllers) {
      try {
        const ship = controller.getShip();
        if (!ship || typeof ship.getAllBlocks !== 'function') {
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
    // TODO : Verify if this is efficient enough
    for (const [controller, ship] of this.controllerToShipMap) {
      try {
        if (typeof controller.render === 'function') {
          controller.render(dt);
        }
      } catch (error) {
        console.error('Error rendering AI controller:', error);
      }
    }
  }

  // Debug

  public getHunterControllerStates(): string[] {
    return Array.from(this.hunterControllers).map(controller => controller.getCurrentStateString());
  }
}
