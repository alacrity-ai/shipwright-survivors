// src/game/ship/PreviewShip.ts

import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { SerializedShip } from '@/systems/serialization/ShipSerializer';
import { getBlockType } from '@/game/blocks/BlockRegistry';
import { toKey } from '@/game/ship/utils/shipBlockUtils';
import { BLOCK_SIZE } from '@/config/view';
import { Faction } from '@/game/interfaces/types/Faction';

export class PreviewShip {
  private readonly blocks = new Map<string, BlockInstance>();
  private readonly blockToCoordMap = new Map<BlockInstance, GridCoord>();
  private readonly transform: BlockEntityTransform;
  
  private blockColor: string | null = null;
  private blockColorIntensity: number = 0.5;

  constructor(
    initialBlocks: [GridCoord, BlockInstance][] = [],
    initialTransform: Partial<BlockEntityTransform> = {}
  ) {
    this.transform = {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      rotation: 0,
      angularVelocity: 0,
      scale: 1,
      ...initialTransform,
    };

    for (const [coord, block] of initialBlocks) {
      this.placeBlock(coord, block);
    }
  }

  public getTransform(): BlockEntityTransform {
    return this.transform;
  }

  public getAllBlocks(): Iterable<[GridCoord, BlockInstance]> {
    return [...this.blocks.entries()].map(([key, block]) => {
      const coord = this.blockToCoordMap.get(block)!;
      return [coord, block] as [GridCoord, BlockInstance];
    });
  }

  public placeBlockById(coord: GridCoord, blockId: string, rotation?: number): boolean {
    const type = getBlockType(blockId);
    if (!type) throw new Error(`Unknown block type: ${blockId}`);

    const key = toKey(coord);
    if (this.blocks.has(key)) return false;

    const block: BlockInstance = {
      id: crypto.randomUUID(),
      type,
      hp: type.armor ?? 1,
      position: {
        x: coord.x * BLOCK_SIZE,
        y: coord.y * BLOCK_SIZE,
      },
      ownerShipId: 'preview',
      ownerFaction: Faction.Neutral,
      ...(rotation !== undefined ? { rotation } : {}),
    };

    this.placeBlock(coord, block);
    return true;
  }

  public placeBlock(coord: GridCoord, block: BlockInstance): void {
    const key = toKey(coord);
    this.blocks.set(key, block);
    this.blockToCoordMap.set(block, coord);
  }

  public clearAllBlocks(): void {
    this.blocks.clear();
    this.blockToCoordMap.clear();
  }

  public setRotation(angleRadians: number): void {
    this.transform.rotation = angleRadians;
  }

  public setPosition(x: number, y: number): void {
    this.transform.position.x = x;
    this.transform.position.y = y;
  }

  public reset(): void {
    this.clearAllBlocks();
    this.transform.position = { x: 0, y: 0 };
    this.transform.rotation = 0;
  }

  // --- Color customization (RGBA)
  public setBlockColor(color: string | null): void {
    this.blockColor = color;
  }

  public getBlockColor(): string | null {
    return this.blockColor;
  }

  public setBlockColorIntensity(intensity: number): void {
    this.blockColorIntensity = intensity;
  }

  public getBlockColorIntensity(): number {
    return this.blockColorIntensity;
  }

  /** Loads preview ship structure and transform from JSON representation */
  public loadFromJson(data: SerializedShip, overrideTransform = false): void {
    this.reset();

    if (overrideTransform) {
      this.transform.position = { ...data.transform.position };
      this.transform.rotation = data.transform.rotation;
    }

    for (const { coord, id, rotation } of data.blocks) {
      this.placeBlockById(coord, id, rotation);
    }
  }

  /** Clears all blocks immediately */
  public destroyInstantly(): void {
    this.clearAllBlocks();
  }
}
