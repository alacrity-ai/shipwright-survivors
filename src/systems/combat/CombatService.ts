import type { Ship } from '@/game/ship/Ship';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import type { PickupSpawner } from '@/systems/pickups/PickupSpawner';
import { getConnectedBlockCoords } from '@/game/ship/utils/shipBlockUtils';
import { ShipDestructionService } from '@/game/ship/ShipDestructionService';
import { fromKey } from '@/game/ship/utils/shipBlockUtils';

export class CombatService {
  constructor(
    private readonly explosionSystem: ExplosionSystem,
    private readonly pickupSpawner: PickupSpawner,
    private readonly destructionService: ShipDestructionService
  ) {}

  public applyDamageToBlock(
    ship: Ship,
    block: BlockInstance,
    coord: GridCoord,
    damage: number,
    cause: 'projectile' | 'bomb' | 'collision' | 'laser' | 'scripted' = 'scripted'
  ): void {
    block.hp -= damage;

    if (block.position) {
      this.explosionSystem.createExplosion(block.position, 20, 0.3);
    }

    if (block.hp > 0) return;

    const isCockpit = block.type.id.startsWith('cockpit');

    this.explosionSystem.createBlockExplosion(
      ship.getTransform().position,
      ship.getTransform().rotation,
      coord,
      70 * (isCockpit ? 2 : 1),
      0.7 * (isCockpit ? 2 : 1)
    );

    this.pickupSpawner.spawnPickupOnBlockDestruction(block);
    ship.removeBlock(coord);

    if (isCockpit) {
      this.destructionService.destroyShip(ship, cause);
      return;
    }

    const cockpitCoord = ship.getCockpitCoord?.();
    if (!cockpitCoord) return;

    // === Optimized: connected set is now Set<CoordKey>
    const connectedSet = getConnectedBlockCoords(ship, cockpitCoord);
    const blockMap = ship.getBlockMap(); // Direct access to internal Map<CoordKey, BlockInstance>

    for (const [coordKey, orphanBlock] of blockMap.entries()) {
      if (connectedSet.has(coordKey)) continue;

      const blockCoord = fromKey(coordKey); // Only needed for explosion placement

      this.explosionSystem.createBlockExplosion(
        ship.getTransform().position,
        ship.getTransform().rotation,
        blockCoord,
        60 + Math.random() * 20,
        0.5 + Math.random() * 0.3
      );
      this.pickupSpawner.spawnPickupOnBlockDestruction(orphanBlock);
      ship.removeBlock(blockCoord); // Safe: internally updates maps
    }
  }
}
