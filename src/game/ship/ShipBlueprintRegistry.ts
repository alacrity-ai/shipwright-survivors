// src/game/ship/ShipBlueprintRegistry.ts

import type { CollectableShipDefinition } from '@/game/ship/interfaces/CollectableShipDefinition';
import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
import { CollectableShipMetadata } from '@/game/ship/interfaces/CollectableShipDefinition';

/**
 * Static blueprint registry of all unlockable player ships.
 * These definitions are immutable and global.
 */
export class ShipBlueprintRegistry {
  private static readonly shipMap: Map<string, CollectableShipDefinition> = new Map([
    [
      'sw1',
      {
        name: 'SW-1 Standard Issue',
        filepath: 'player/ship_00',
        iconImagePath: 'assets/ships/icons/sw1.png',
        unlockCostInCores: 50,
        metaData: {
          additionalDescription: 'All-rounder for new Shipwrights.',
          tier: 1,
          offenseRating: 3,
          defenseRating: 3,
          speedRating: 3,
          weaponSpecialization: 'Turrets',
        } as CollectableShipMetadata,
      },
    ],
    [
      'vanguard',
      {
        name: 'Vanguard',
        filepath: 'player/vanguard',
        iconImagePath: 'assets/ships/icons/vanguard.png',
        unlockCostInCores: 100,
        metaData: {
          additionalDescription: 'You simply cannot miss.',
          tier: 2,
          offenseRating: 5,
          defenseRating: 2,
          speedRating: 2,
          weaponSpecialization: 'Heat Seekers',
        } as CollectableShipMetadata,
      },
    ],
    // Add additional ships here...
  ]);

  /** Returns all ship definitions in registration order. */
  static getAll(): CollectableShipDefinition[] {
    return Array.from(this.shipMap.values());
  }

  /** Returns the ship definition for the given ship name. */
  static getByName(shipName: string): CollectableShipDefinition | undefined {
    return this.shipMap.get(shipName);
  }

  /** Returns the default ship to use (e.g. fallback or first available). */
  static getDefaultShipName(): string {
    return 'sw1';
  }

  /** Returns all ship names in registration order. */
  static getAllShipNames(): string[] {
    return Array.from(this.shipMap.keys());
  }

  /** Returns the full ship name-to-definition map. */
  static getAllAsMap(): Map<string, CollectableShipDefinition> {
    return new Map(this.shipMap); // defensive copy
  }

  /** Returns all ships the player has discovered, including unlocked ones. */
  static getDiscoveredShips(): CollectableShipDefinition[] {
    const player = PlayerShipCollection.getInstance();
    return this.getAll().filter(ship => player.isDiscovered(ship.name));
  }

  /** Returns all ships the player has unlocked. */
  static getUnlockedShips(): CollectableShipDefinition[] {
    const player = PlayerShipCollection.getInstance();
    return this.getAll().filter(ship => player.isUnlocked(ship.name));
  }

  /**
   * Returns all ships that have been discovered but not yet unlocked.
   * These are eligible for core-based unlocking.
   */
  static getUnlockableDiscoveredShips(): CollectableShipDefinition[] {
    const player = PlayerShipCollection.getInstance();
    return this.getAll().filter(
      ship => player.isDiscovered(ship.name) && !player.isUnlocked(ship.name)
    );
  }
}
