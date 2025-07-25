// src/game/entities/utils/universalBlockInterfaceUtils.ts

// Facade class:
// This is meant to replace all interactions where shipUtils is used
// As long as ships are part of the shipRegistry, and all other composite block objects are in the compositeBlockObjectRegistry
// Then this should be a drop-in replacement for shipUtils
// When all ships are moved out of the ship registry, then we can replace this with CompositeBlockObjectUtils

import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import { CompositeBlockObjectRegistry } from '@/game/entities/registries/CompositeBlockObjectRegistry';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { BlockManager } from '@/game/blocks/system/BlockManager';

export type CoordKey = string;

/**
 * Finds the object (Ship or CompositeBlockObject) that owns a given block index.
 * Prioritizes ShipRegistry for performance/consistency with legacy systems.
 */
export function findObjectByBlock(blockIndex: number): CompositeBlockObject | null {
  const store = BlockManager.getInstance().getBlockStore();
  const ownerShipId = store.ownerShipId[blockIndex]; // stored as string (legacy IDs)

  // First check ShipRegistry (player/enemy ships)
  const shipRegistry = ShipRegistry.getInstance();
  const ship = shipRegistry.getByNumericId(ownerShipId);
  if (ship) return ship;

  // Fallback to CompositeBlockObjectRegistry (stations, asteroids, etc.)
  const compositeRegistry = CompositeBlockObjectRegistry.getInstance<CompositeBlockObject>();
  const object = compositeRegistry.getByNumericId(ownerShipId);
  return object || null;
}

/**
 * Gets the total mass of the block's ownerShip (or owner CompositeBlockObject).
 */
export function getObjectTotalMassByBlock(blockIndex: number): number {
  const object = findObjectByBlock(blockIndex);
  return object ? object.getTotalMass() : 0;
}

export function getAllCompositeObjects(): Iterable<CompositeBlockObject> {
  const compositeRegistry = CompositeBlockObjectRegistry.getInstance<CompositeBlockObject>();
  const shipRegistry = ShipRegistry.getInstance();

  // Chain together all ships and composite objects
  return [...compositeRegistry.getAll(), ...shipRegistry.getAll()];
}

/**
 * Gets the block’s local grid coordinate (relative to its owning object) given its SOA index.
 */
export function findBlockCoordinatesInObject(
  blockIdx: number,
  object: CompositeBlockObject
): GridCoord | null {
  const store = BlockManager.getInstance().getBlockStore();

  if (!store.isAllocated(blockIdx)) {
    return null;
  }

  return {
    x: store.localX[blockIdx],
    y: store.localY[blockIdx],
  };
}

export function getConnectedBlockCoords(blockObject: CompositeBlockObject, startCoord: GridCoord): Set<string> {
  const visited = new Set<string>();
  const queue: GridCoord[] = [startCoord];

  const toKey = (c: GridCoord) => `${c.x},${c.y}`;
  const getNeighbors = (c: GridCoord): GridCoord[] => [
    { x: c.x + 1, y: c.y },
    { x: c.x - 1, y: c.y },
    { x: c.x,     y: c.y + 1 },
    { x: c.x,     y: c.y - 1 }
  ];

  while (queue.length > 0) {
    const current = queue.pop()!;
    const key = toKey(current);
    if (visited.has(key)) continue;
    if (!blockObject.hasBlockAt(current)) continue;

    visited.add(key);

    for (const neighbor of getNeighbors(current)) {
      const neighborKey = toKey(neighbor);
      if (!visited.has(neighborKey) && blockObject.hasBlockAt(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  return visited;
}

export function getWorldPositionFromObjectCoord(
  transform: BlockEntityTransform,
  coord: { x: number; y: number }
): { x: number; y: number } {
  const localX = coord.x * 32;
  const localY = coord.y * 32;
  const cos = Math.cos(transform.rotation);
  const sin = Math.sin(transform.rotation);
  return {
    x: transform.position.x + localX * cos - localY * sin,
    y: transform.position.y + localX * sin + localY * cos,
  };
}

export function toKey(coord: GridCoord): CoordKey {
  return `${coord.x},${coord.y}`;
}

export function fromKey(key: CoordKey): GridCoord {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

export function rotate(x: number, y: number, angle: number): { x: number; y: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}
