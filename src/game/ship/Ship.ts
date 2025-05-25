// src/game/ship/Ship.ts

import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import { getBlockType } from '@/game/blocks/BlockRegistry';
import type { ShipTransform } from '@/systems/physics/MovementSystem';
import type { SerializedShip } from '@/systems/serialization/ShipSerializer';
import { Grid } from '@/systems/physics/Grid'; // Global Grid import

type CoordKey = string;

function toKey(coord: GridCoord): CoordKey {
  return `${coord.x},${coord.y}`;
}

function fromKey(key: CoordKey): GridCoord {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

export class Ship {
  id: string;  // Unique identifier for the ship
  private blocks: Map<CoordKey, BlockInstance> = new Map();
  private transform: ShipTransform;

  // === Memoized mass cache
  private totalMass: number | null = null;

  constructor(
    private grid: Grid,  // Pass the global Grid to each ship
    initialBlocks?: [GridCoord, BlockInstance][],
    initialTransform?: Partial<ShipTransform>
  ) {
    this.id = this.generateUniqueShipId();

    if (initialBlocks) {
      for (const [coord, block] of initialBlocks) {
        this.blocks.set(toKey(coord), block);
        this.grid.addBlockToCell(block); // Add block to global grid
      }
    }

    this.transform = {
      position: initialTransform?.position ?? { x: 640, y: 360 },
      velocity: initialTransform?.velocity ?? { x: 0, y: 0 },
      rotation: initialTransform?.rotation ?? 0,
      angularVelocity: initialTransform?.angularVelocity ?? 0
    };
  }

  getTransform(): ShipTransform {
    return this.transform;
  }

  setTransform(newTransform: ShipTransform): void {
    this.transform = newTransform;
    this.updateBlockPositions();  // Update block positions when transform changes
  }

  placeBlockById(coord: GridCoord, blockId: string, rotation?: number): void {
    const type = getBlockType(blockId);
    if (!type) throw new Error(`Unknown block type: ${blockId}`);

    // Calculate the proper world position immediately
    const worldPos = this.calculateBlockWorldPosition(coord);  // Use the helper method to calculate world position
    
    const block: BlockInstance = {
      type,
      hp: type.armor,
      ownerShipId: this.id,  // Associate the block with this ship’s ID
      position: worldPos,  // Set the calculated world position
      ...(rotation !== undefined ? { rotation } : {})  // Set the rotation if provided
    };

    this.placeBlock(coord, block);  // Place the block into the grid and the ship
  }

  placeBlock(coord: GridCoord, block: BlockInstance): void {
    this.blocks.set(toKey(coord), block);
    this.grid.addBlockToCell(block);  // Add block to global grid
    this.invalidateMass();
  }

  removeBlock(coord: GridCoord): void {
    const block = this.blocks.get(toKey(coord));
    if (block) {
      this.grid.removeBlockFromCell(block); // Remove block from grid
    }
    this.blocks.delete(toKey(coord));
    this.invalidateMass();
  }

  getBlock(coord: GridCoord): BlockInstance | undefined {
    return this.blocks.get(toKey(coord));
  }

  public getAllBlocks(): [GridCoord, BlockInstance][] {
    if (!this.blocks) {
      return []; // Return empty array instead of undefined
    }
    
    return Array.from(this.blocks.entries()).map(([key, block]) => {
      return [fromKey(key), block];
    });
  }

  hasBlockAt(coord: GridCoord): boolean {
    return this.blocks.has(toKey(coord));
  }

  getCockpit(): BlockInstance | undefined {
    return this.blocks.get(toKey({ x: 0, y: 0 }));
  }

  getCockpitCoord(): GridCoord | undefined {
    if (this.getCockpit()) {
      return { x: 0, y: 0 };
    }
    return undefined;
  }

  getTotalMass(): number {
    if (this.totalMass == null) {
      this.totalMass = 0;
      for (const block of this.blocks.values()) {
        this.totalMass += block.type.mass;
      }
    }
    return this.totalMass;
  }

  private invalidateMass(): void {
    this.totalMass = null;
  }

  private generateUniqueShipId(): string {
    return 'ship-' + Math.random().toString(36).substr(2, 9);
  }

  // Get block's world position based on ship's transform
  getBlockWorldPosition(block: BlockInstance): { x: number; y: number } {
    if (!block.position) return { x: 0, y: 0 };

    const transform = this.getTransform();
    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);

    const worldX = transform.position.x + block.position.x * 32 * cos - block.position.y * 32 * sin;
    const worldY = transform.position.y + block.position.x * 32 * sin + block.position.y * 32 * cos;

    return { x: worldX, y: worldY };
  }

  // Update all blocks' positions based on ship's transform (world position and rotation)
  public updateBlockPositions(): void {
    for (const [coordKey, block] of this.blocks.entries()) {
      const coord = fromKey(coordKey);  // Get the block's grid position

      // Remove from old grid position before updating
      this.grid.removeBlockFromCell(block);

      // Calculate the new world position of the block
      const worldPos = this.calculateBlockWorldPosition(coord);
      block.position = worldPos;

      // Add to new grid position based on updated world position
      this.grid.addBlockToCell(block);
    }
  }

  // Calculate block's world position based on ship's transform
  private calculateBlockWorldPosition(coord: GridCoord): { x: number; y: number } {
    const transform = this.getTransform();
    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);

    // Calculate the world position of the block based on its grid position and ship's transform
    const worldX = transform.position.x + coord.x * 32 * cos - coord.y * 32 * sin;
    const worldY = transform.position.y + coord.x * 32 * sin + coord.y * 32 * cos;

    return { x: worldX, y: worldY };
  }

  loadFromJson(data: SerializedShip): void {
    const transform = this.getTransform();
    transform.position = data.transform.position;
    transform.rotation = data.transform.rotation;

    data.blocks.forEach(blockData => {
      const { coord, id, rotation } = blockData;
      this.placeBlockById(coord, id, rotation);
    });
  }

  getGrid(): Grid {
    return this.grid;
  }

  destroy(): void {
    // Remove all blocks from the grid
    for (const block of this.blocks.values()) {
      this.grid.removeBlockFromCell(block);
    }
  
    // Clear the blocks map
    this.blocks.clear();
  }
}
