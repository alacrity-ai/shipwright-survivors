// src/game/ship/ShipRegistry.ts

import type { Ship } from '@/game/ship/Ship';

export class ShipRegistry {
  private static instance: ShipRegistry;

  private ships: Set<Ship> = new Set();
  private shipIdMap: Map<string, Ship> = new Map();
  private shipNumericIdMap: Map<number, Ship> = new Map();

  private playerShip: Ship | null = null;

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

  getByNumericId(id: number): Ship | undefined {
    return this.shipNumericIdMap.get(id);
  }

  add(ship: Ship): void {
    this.ships.add(ship);
    this.shipIdMap.set(ship.id, ship);
    this.shipNumericIdMap.set(ship.numericId, ship);
  }

  remove(ship: Ship, cause: string = 'combat'): void {
    // NEW: Cleanup ship auralight explicitly
    ship.cleanupAuraLight();
    // NEW: Call destroy on ship explicitly
    ship.destroy();

    this.ships.delete(ship);
    this.shipIdMap.delete(ship.id);
    this.shipNumericIdMap.delete(ship.numericId);

    if (this.playerShip === ship) {
      this.playerShip = null;
    }
  }

  getAll(): Iterable<Ship> {
    return this.ships;
  }

  clear(): void {
    this.ships.clear();
    this.shipIdMap.clear();
    this.shipNumericIdMap.clear();
    this.playerShip = null;
  }

  count(): number {
    return this.ships.size;
  }

  setPlayerShip(ship: Ship): void {
    if (!this.ships.has(ship)) {
      this.add(ship);
    }
    this.playerShip = ship;
  }

  getPlayerShip(): Ship | null {
    return this.playerShip;
  }
}
