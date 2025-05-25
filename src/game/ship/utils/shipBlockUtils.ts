// src/game/ship/utils/ShipBlockUtils.ts

import type { Ship } from '@/game/ship/Ship';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';

export function getConnectedBlockCoords(ship: Ship, startCoord: GridCoord): Set<string> {
  const visited = new Set<string>();
  const queue: GridCoord[] = [startCoord];
  const blocks = ship.getAllBlocks();

  const serialize = (c: GridCoord) => `${c.x},${c.y}`;
  const getNeighbors = (c: GridCoord): GridCoord[] => [
    { x: c.x + 1, y: c.y },
    { x: c.x - 1, y: c.y },
    { x: c.x,     y: c.y + 1 },
    { x: c.x,     y: c.y - 1 }
  ];

  while (queue.length > 0) {
    const current = queue.pop()!;
    const key = serialize(current);

    if (visited.has(key)) continue;
    if (!ship.hasBlockAt(current)) continue;

    visited.add(key);

    for (const neighbor of getNeighbors(current)) {
      const neighborKey = serialize(neighbor);
      if (!visited.has(neighborKey) && ship.hasBlockAt(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  return visited;
}
