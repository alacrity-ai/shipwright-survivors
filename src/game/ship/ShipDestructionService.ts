import type { Ship } from '@/game/ship/Ship';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import type { PickupSpawner } from '@/systems/pickups/PickupSpawner';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import { getConnectedBlockCoords } from '@/game/ship/utils/shipBlockUtils';
import { DEFAULT_EXPLOSION_SPARK_PALETTE } from '@/game/blocks/BlockColorSchemes';

export type DestructionCause =
  | 'projectile'
  | 'collision'
  | 'bomb'
  | 'laser'
  | 'explosiveLance'
  | 'explosiveLanceAoE'
  | 'self'
  | 'scripted';

export class ShipDestructionService {
  private destructionCallbacks: Set<(ship: Ship, cause: DestructionCause) => void> = new Set();

  constructor(
    private readonly explosionSystem: ExplosionSystem,
    private readonly pickupSpawner: PickupSpawner,
    private readonly shipRegistry: ShipRegistry,
    private readonly aiOrchestrator: AIOrchestratorSystem,
  ) {}

  /**
   * Register a callback to be called whenever a ship is destroyed
   */
  public onShipDestroyed(callback: (ship: Ship, cause: DestructionCause) => void): void {
    this.destructionCallbacks.add(callback);
  }

  /**
   * Unregister a ship destruction callback
   */
  public offShipDestroyed(callback: (ship: Ship, cause: DestructionCause) => void): void {
    this.destructionCallbacks.delete(callback);
  }

  destroyShip(ship: Ship, cause: DestructionCause = 'scripted'): void {
    const transform = ship.getTransform();
    const blocks = ship.getAllBlocks();
    const shipId = ship.id;

    // === Step 0: Notify all listeners BEFORE cleanup ===
    this.destructionCallbacks.forEach(callback => {
      try {
        callback(ship, cause);
      } catch (error) {
        console.error('Error in ship destruction callback:', error);
      }
    });

    // === Step 1: Eager cleanup BEFORE animations ===
    this.shipRegistry.remove(ship);
    this.aiOrchestrator.removeControllersForShip?.(shipId);
    ship.destroy();

    // === Step 2: Visual explosion + pickup burst
    blocks.forEach(([coord, block], index) => {
      setTimeout(() => {
        this.explosionSystem.createBlockExplosion(
          transform.position,
          transform.rotation,
          coord,
          50 + Math.random() * 40,
          0.5 + Math.random() * 0.5,
          undefined,
          DEFAULT_EXPLOSION_SPARK_PALETTE
        );
        this.pickupSpawner.spawnPickupOnBlockDestruction(block);
      }, index * 50);
    });

    // === Step 3: Optional detachment of orphaned disconnected blocks
    const cockpitCoord = ship.getCockpitCoord?.();
    if (cockpitCoord) {
      const connectedSet = getConnectedBlockCoords(ship, cockpitCoord);
      const serialize = (c: GridCoord) => `${c.x},${c.y}`;

      for (const [coord, block] of blocks) {
        if (!connectedSet.has(serialize(coord))) {
          setTimeout(() => {
            this.explosionSystem.createBlockExplosion(
              transform.position,
              transform.rotation,
              coord,
              60 + Math.random() * 20,
              0.5 + Math.random() * 0.3,
              undefined,
              DEFAULT_EXPLOSION_SPARK_PALETTE
            );
            this.pickupSpawner.spawnPickupOnBlockDestruction(block);
          }, 250 + Math.random() * 300);
        }
      }
    }
  }
}