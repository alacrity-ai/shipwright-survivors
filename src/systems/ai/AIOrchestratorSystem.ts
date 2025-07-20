// src/systems/ai/AIOrchestratorSystem.ts

import type { AIControllerSystem } from './AIControllerSystem';
import type { IUpdatable } from '@/core/interfaces/types';
import type { Ship } from '@/game/ship/Ship';
import type { CullabilityDelegate } from './interfaces/CullabilityDelegate';

import { aiSystemFrameBudgetMs } from '@/config/graphicsConfig';

import { ShipGrid } from '@/game/ship/ShipGrid';
import { FormationRegistry } from './formations/FormationRegistry';

import { createIntentSOA, IntentSOA } from '@/core/intent/interfaces/ShipIntent';

const SCAN_RADIUS = 5000;
const MAX_AI_SHIPS = 1024; // adjust as appropriate

export class AIOrchestratorSystem implements IUpdatable, CullabilityDelegate {
  private static instance: AIOrchestratorSystem | null = null;
  
  private readonly intents: IntentSOA = createIntentSOA(MAX_AI_SHIPS);
  private readonly freeIndices: number[] = []; // Recycled slot indices
  private readonly soaIndexToController: (AIControllerSystem | null)[] = new Array(MAX_AI_SHIPS).fill(null);

  private playerShip: Ship | null = null;

  private readonly controllerToShipMap = new Map<AIControllerSystem, Ship>();
  private readonly shipIdToControllerMap = new Map<string, AIControllerSystem>();

  private readonly formationRegistry = new FormationRegistry();

  private frameCounter: number = 0;
  private readonly REEVALUATE_FRAMES = 60;

  private readonly uncullableControllers = new Set<AIControllerSystem>();

  private frameBudgetMs: number = aiSystemFrameBudgetMs;
  private lastControllerIndex: number = 0;

  constructor() {
    AIOrchestratorSystem.instance = this;
  }

  public registerPlayerShip(ship: Ship): void {
    this.playerShip = ship;
  }

  public clearPlayerShip(): void {
    this.playerShip = null;
    ShipGrid.getInstance().clear();
  }

  public addController(controller: AIControllerSystem, unCullable = false): void {
    const ship = controller.getShip();
    if (!ship) return;

    ship.updateBlockPositions();

    // === Allocate SOA slot (reuse or expand) ===
    let slotIndex: number;
    if (this.freeIndices.length > 0) {
      slotIndex = this.freeIndices.pop()!;
      // Ensure count covers the reused index (critical fix)
      if (slotIndex >= this.intents.count) {
        this.intents.count = slotIndex + 1;
      }
    } else {
      if (this.intents.count >= MAX_AI_SHIPS) {
        console.warn('AIOrchestrator: Max AI ships reached, cannot add controller.');
        return;
      }
      slotIndex = this.intents.count++;
    }

    // === Initialize the slot ===
    this.zeroIntentSlot(slotIndex);
    this.intents.culledFlags[slotIndex] = 0; // Explicitly mark as active

    // Bind controller to this SOA slot
    controller.bindSOA(this.intents, slotIndex);
    this.soaIndexToController[slotIndex] = controller;

    // === Register controller mappings ===
    this.controllerToShipMap.set(controller, ship);
    this.shipIdToControllerMap.set(ship.id, controller);

    // Handle uncullable state and delegate assignment
    this.setUncullable(controller, unCullable || controller.isHunter());
    controller.setCullabilityDelegate(this);

    // === Formation registration (unchanged) ===
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
    controller.clearAnchorIndex();
    
    const ship = this.controllerToShipMap.get(controller);
    if (ship) {
      this.shipIdToControllerMap.delete(ship.id);
      ShipGrid.getInstance().removeShip(ship);
    }
    this.controllerToShipMap.delete(controller);
    this.uncullableControllers.delete(controller);

    const index = controller.getSOAIndex();
    const count = this.intents.count;
    if (index < 0 || index >= count) return;

    const last = count - 1;

    if (index !== last) {
      // Swap SOA data and controller refs to keep array compact
      this.swapIntentSOA(index, last);

      // Rebind the moved controller to its new slot index
      const movedController = this.soaIndexToController[index];
      if (movedController) {
        movedController.bindSOA(this.intents, index);
      }
    }

    // === Clear the vacated last slot ===
    this.zeroIntentSlot(last);
    this.intents.culledFlags[last] = 1;      // Mark as inactive/cut
    this.soaIndexToController[last] = null;

    // === Decrement count and recycle slot ===
    this.intents.count--;                    // Shrink active range
    this.freeIndices.push(this.intents.count); // Recycle the *new* free slot
  }


  /** Clears all intent and culling state for a slot so no stale values leak. */
  private zeroIntentSlot(slot: number): void {
    const soa = this.intents;

    soa.thrustForward[slot] = 0;
    soa.brake[slot] = 0;
    soa.rotateLeft[slot] = 0;
    soa.rotateRight[slot] = 0;
    soa.strafeLeft[slot] = 0;
    soa.strafeRight[slot] = 0;
    soa.turnToAngle[slot] = 0;
    soa.afterburner[slot] = 0;
    soa.firePrimary[slot] = 0;
    soa.fireSecondary[slot] = 0;
    soa.aimX[slot] = 0;
    soa.aimY[slot] = 0;
    soa.firingMode[slot] = 0;
    soa.toggleShields[slot] = 0;

    // NOTE: No culledFlags here — callers handle that explicitly.
  }

  /** Swap all intent fields between two SOA slots (does NOT touch culledFlags). */
  private swapIntentSOA(i: number, j: number): void {
    const soa = this.intents;
    const swap = (arr: Uint8Array | Float32Array | Int8Array, i: number, j: number) => {
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    };
    swap(soa.thrustForward, i, j);
    swap(soa.brake, i, j);
    swap(soa.rotateLeft, i, j);
    swap(soa.rotateRight, i, j);
    swap(soa.strafeLeft, i, j);
    swap(soa.strafeRight, i, j);
    swap(soa.turnToAngle, i, j);
    swap(soa.afterburner, i, j);
    swap(soa.firePrimary, i, j);
    swap(soa.fireSecondary, i, j);
    swap(soa.aimX, i, j);
    swap(soa.aimY, i, j);
    swap(soa.firingMode, i, j);
    swap(soa.toggleShields, i, j);
    swap(soa.culledFlags, i, j);
    
    // Also swap controller references
    const tmpController = this.soaIndexToController[i];
    this.soaIndexToController[i] = this.soaIndexToController[j];
    this.soaIndexToController[j] = tmpController;
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

  public update(dt: number): void {
    if (!this.playerShip) return;

    const now = performance.now();
    const deadline = now + this.frameBudgetMs;

    // === 1. Update ship grid occupancy (every frame) ===
    for (const ship of this.controllerToShipMap.values()) {
      ShipGrid.getInstance().updateShipPosition(ship, dt);
    }

    const culledFlags = this.intents.culledFlags;

    // === 2. Reevaluate relevance every REEVALUATE_FRAMES ===
    if (this.frameCounter++ % this.REEVALUATE_FRAMES === 0) {
      const playerPos = this.playerShip.getTransform().position;
      const nearbyShips = ShipGrid.getInstance().getShipsInRadius(
        playerPos.x,
        playerPos.y,
        SCAN_RADIUS
      );

      // Start with everyone culled (1)
      for (let i = 0; i < this.intents.count; i++) {
        culledFlags[i] = 1;
      }

      // Always un-cull hunters and uncullable controllers (0)
      for (const c of this.uncullableControllers) {
        const idx = c.getSOAIndex();
        if (idx >= 0 && idx < this.intents.count) {
          culledFlags[idx] = 0;
        }
      }

      // Un-cull any ships near the player
      for (const ship of nearbyShips) {
        const controller = this.shipIdToControllerMap.get(ship.id);
        if (controller) {
          const idx = controller.getSOAIndex();
          if (idx >= 0 && idx < this.intents.count) {
            culledFlags[idx] = 0;
          }
        }
      }
    } else {
      // Non-reevaluation frames: just clean up dead uncullables
      for (const controller of this.uncullableControllers) {
        const ship = controller.getShip();
        if (!ship || ship.isDestroyed()) {
          this.removeController(controller);
        }
      }
    }

    // === 3. Rotating frame-budget update ===
    const total = this.intents.count;
    if (total === 0) return;

    let index = this.lastControllerIndex % total;
    let processed = 0;
    const toRemove: AIControllerSystem[] = [];

    for (processed = 0; processed < total; processed++) {
      const controller = this.soaIndexToController[index];
      const isCulled = culledFlags[index] !== 0;

      if (controller) {
        const ship = controller.getShip();

        if (!ship?.getAllBlocks) {
          toRemove.push(controller);
        } else if (!isCulled) {
          try {
            this.zeroIntentSlot(index);
            controller.update(dt);
          } catch (err) {
            console.error('Error updating AI controller:', err);
            toRemove.push(controller);
          }
        } else {
          // Zero out intent slot when culled to prevent stale commands
          this.zeroIntentSlot(index);
        }
      }

      index = (index + 1) % total;

      if (performance.now() > deadline) {
        this.lastControllerIndex = index;
        break;
      }
    }

    // === 4. Remove invalid controllers ===
    for (const c of toRemove) {
      this.removeController(c);
    }

    // Clamp rotating cursor so it doesn’t point past the active range
    if (this.lastControllerIndex >= this.intents.count) {
      this.lastControllerIndex = 0;
    }

    // Reset rotating cursor if we processed everyone
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

  // == Cleanup
  public clear(): void {
    // Reset controller/ship maps
    this.controllerToShipMap.clear();
    this.shipIdToControllerMap.clear();
    this.uncullableControllers.clear();

    // Reset SOA bookkeeping
    this.intents.count = 0;
    this.freeIndices.length = 0;
    this.lastControllerIndex = 0;

    // Null out controller slots
    this.soaIndexToController.fill(null);

    // Zero all SOA fields for consistency
    const soa = this.intents;
    soa.thrustForward.fill(0);
    soa.brake.fill(0);
    soa.rotateLeft.fill(0);
    soa.rotateRight.fill(0);
    soa.strafeLeft.fill(0);
    soa.strafeRight.fill(0);
    soa.turnToAngle.fill(0);
    soa.afterburner.fill(0);
    soa.firePrimary.fill(0);
    soa.fireSecondary.fill(0);
    soa.aimX.fill(0);
    soa.aimY.fill(0);
    soa.firingMode.fill(0);
    soa.toggleShields.fill(0);
    soa.culledFlags.fill(1); // Default everything to "culled"

    // Also ensure any other SOA fields (if `IntentSOA` expands later) start zeroed:
    if ('additionalField1' in soa) (soa as any).additionalField1.fill(0);
    if ('additionalField2' in soa) (soa as any).additionalField2.fill(0);

    // Clear ShipGrid state (AI’s spatial anchor)
    ShipGrid.getInstance().clear();
  }
}
