// src/game/ship/ShipRegistry.ts

import type { Ship } from '@/game/ship/Ship';

export class ShipRegistry {
  private static instance: ShipRegistry;  // Static instance
  private ships: Set<Ship> = new Set();

  private constructor() {}  // Private constructor to prevent direct instantiation

  // Getter for the single instance of ShipRegistry
  public static getInstance(): ShipRegistry {
    if (!ShipRegistry.instance) {
      ShipRegistry.instance = new ShipRegistry();  // Create the instance if it doesn't exist
    }
    return ShipRegistry.instance;
  }

  getById(id: string): Ship | undefined {
    return Array.from(this.ships).find(ship => ship.id === id);
  }

  add(ship: Ship): void {
    this.ships.add(ship);
  }

  remove(ship: Ship): void {
    this.ships.delete(ship);
  }

  getAll(): Iterable<Ship> {
    return this.ships;
  }

  clear(): void {
    this.ships.clear();
  }

  count(): number {
    return this.ships.size;
  }
}
