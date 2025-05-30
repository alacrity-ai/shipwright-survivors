// src/game/ship/ShipRegistry.ts

import type { Ship } from '@/game/ship/Ship';

export class ShipRegistry {
  private static instance: ShipRegistry;

  private ships: Set<Ship> = new Set();
  private shipIdMap: Map<string, Ship> = new Map();

  private constructor() {}

  public static getInstance(): ShipRegistry {
    if (!ShipRegistry.instance) {
      ShipRegistry.instance = new ShipRegistry();
    }
    return ShipRegistry.instance;
  }

  getById(id: string): Ship | undefined {
    return this.shipIdMap.get(id);
  }

  add(ship: Ship): void {
    this.ships.add(ship);
    this.shipIdMap.set(ship.id, ship);
  }

  remove(ship: Ship): void {
    this.ships.delete(ship);
    this.shipIdMap.delete(ship.id);
  }

  getAll(): Iterable<Ship> {
    return this.ships;
  }

  clear(): void {
    this.ships.clear();
    this.shipIdMap.clear();
  }

  count(): number {
    return this.ships.size;
  }
}
