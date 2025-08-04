import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { BlockManager } from '@/game/blocks/system/BlockManager';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { Ship } from '@/game/ship/Ship';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';

export type CoordKey = string;


export function getConnectedBlockCoords(ship: Ship, startCoord: GridCoord): Set<string> {
  const visited = new Set<string>();
  const queue: GridCoord[] = [startCoord];

  const toKey = (c: GridCoord) => `${c.x},${c.y}`;
  const getNeighbors = (c: GridCoord): GridCoord[] => [
    { x: c.x + 1, y: c.y },
    { x: c.x - 1, y: c.y },
    { x: c.x,     y: c.y + 1 },
    { x: c.x,     y: c.y - 1 },
  ];

  while (queue.length > 0) {
    const current = queue.pop()!;
    const key = toKey(current);
    if (visited.has(key)) continue;
    if (!ship.hasBlockAt(current)) continue;

    visited.add(key);

    for (const neighbor of getNeighbors(current)) {
      const neighborKey = toKey(neighbor);
      if (!visited.has(neighborKey) && ship.hasBlockAt(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  return visited;
}

export function getConnectedBlockCoordsFast(
  ship: Ship,
  startCoord: GridCoord,
  outSet: Set<number> = new Set<number>(),
  workQueue: GridCoord[] = []
): Set<number> {
  outSet.clear();
  workQueue.length = 0;

  const pack = (x: number, y: number) => (x << 16) | (y & 0xffff);
  const unpackX = (key: number) => key >> 16;
  const unpackY = (key: number) => key & 0xffff;

  const enqueue = (x: number, y: number) => {
    const key = pack(x, y);
    if (!outSet.has(key) && ship.hasBlockAtXY(x, y)) {
      outSet.add(key);
      workQueue.push({ x, y });
    }
  };
  ship.hasBlockAt
  const startKey = pack(startCoord.x, startCoord.y);
  if (!ship.hasBlockAt(startCoord)) return outSet;

  outSet.add(startKey);
  workQueue.push(startCoord);

  while (workQueue.length > 0) {
    const current = workQueue.pop()!;
    const x = current.x;
    const y = current.y;

    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  return outSet;
}


/**
 * Gets the block’s local grid coordinate by SOA index.
 */
export function findBlockCoordinatesInShip(blockIndex: number, ship: Ship): GridCoord | null {
  const store = BlockManager.getInstance().getBlockStore();
  if (!store.isAllocated(blockIndex)) return null;

  return {
    x: store.localX[blockIndex],
    y: store.localY[blockIndex],
  };
}

/**
 * Finds the owning Ship for a block by SOA index.
 */
export function findShipByBlockIndex(blockIndex: number): Ship | null {
  const store = BlockManager.getInstance().getBlockStore();
  if (!store.isAllocated(blockIndex)) return null;
  const shipId = store.ownerShipId[blockIndex];
  const shipRegistry = ShipRegistry.getInstance();
  return shipRegistry.getByNumericId?.(shipId) ?? null;
}

/**
 * World position from ship-local coord (unchanged).
 */
export function getWorldPositionFromShipCoord(
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
