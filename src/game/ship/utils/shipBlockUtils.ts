// src/game/ship/utils/ShipBlockUtils.ts

import { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { ShipTransform } from '@/systems/physics/MovementSystem';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
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
    { x: c.x,     y: c.y - 1 }
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

export function findShipByBlock(block: BlockInstance): Ship | null {
  const shipRegistry = ShipRegistry.getInstance();
  return shipRegistry.getById(block.ownerShipId) || null;
}

export function findBlockCoordinatesInShip(targetBlock: BlockInstance, ship: Ship): GridCoord | null {
  return ship.getBlockCoord(targetBlock);
}

export function getWorldPositionFromShipCoord(
  transform: ShipTransform,
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
