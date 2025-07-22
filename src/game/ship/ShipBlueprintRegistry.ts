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
        unlockCostInCores: 0,
        metaData: {
          additionalDescription: 'All-rounder for new Shipwrights.',
          tier: 1,
          offenseRating: 3,
          defenseRating: 3,
          speedRating: 3,
          weaponSpecialization: 'Turrets',
          weaponBlocks: ['turret1', 'turret2', 'turret3', 'turret4', 'turret5'],
          affinity: 'turret',
        } as CollectableShipMetadata,
      },
    ],
    [
      'monarch',
      {
        name: 'Monarch',
        filepath: 'player/monarch',
        iconImagePath: 'assets/ships/icons/monarch.png',
        unlockCostInCores: 1000,
        metaData: {
          additionalDescription: 'Sticky bombs and sticky situations.',
          tier: 1,
          offenseRating: 5,
          defenseRating: 4,
          speedRating: 1,
          weaponSpecialization: 'Explosive Lances',
          weaponBlocks: ['explosiveLance1', 'explosiveLance2', 'explosiveLance3', 'explosiveLance4', 'explosiveLance5'],
          affinity: 'explosiveLance',
        } as CollectableShipMetadata,
      },
    ],
    [
      'halo',
      {
        name: 'Halo Mk I',
        filepath: 'player/halo',
        iconImagePath: 'assets/ships/icons/halo.png',
        unlockCostInCores: 1000,
        metaData: {
          additionalDescription: 'Those that come too close regret it.',
          tier: 1,
          offenseRating: 3,
          defenseRating: 3,
          speedRating: 3,
          weaponSpecialization: 'Halo Blades',
          weaponBlocks: ['haloBlade1', 'haloBlade2', 'haloBlade3', 'haloBlade4', 'haloBlade5'],
          affinity: 'haloBlade',
        } as CollectableShipMetadata,
      },
    ],
    [
      'vanguard',
      {
        name: 'Vanguard',
        filepath: 'player/vanguard',
        iconImagePath: 'assets/ships/icons/vanguard.png',
        unlockCostInCores: 1000,
        metaData: {
          additionalDescription: 'You simply cannot miss.',
          tier: 1,
          offenseRating: 5,
          defenseRating: 2,
          speedRating: 2,
          weaponSpecialization: 'Heat Seekers',
          weaponBlocks: ['heatSeeker1', 'heatSeeker2', 'heatSeeker3', 'heatSeeker4', 'heatSeeker5'],
          affinity: 'heatSeeker',
        } as CollectableShipMetadata,
      },
    ],
    [
      'godhand',
      {
        name: 'Godhand Prototype',
        filepath: 'player/godhand',
        iconImagePath: 'assets/ships/icons/godhand.png',
        unlockCostInCores: 1000,
        metaData: {
          additionalDescription: 'Prototype for a new line of energy weapons.',
          tier: 1,
          offenseRating: 5,
          defenseRating: 2,
          speedRating: 2,
          weaponSpecialization: 'Lasers',
          weaponBlocks: ['laser1', 'laser2', 'laser3', 'laser4', 'laser5'],
          affinity: 'laser',
        } as CollectableShipMetadata,
      },
    ],
    [
      'salamander',
      {
        name: 'Salamander',
        filepath: 'player/salamander',
        iconImagePath: 'assets/ships/icons/salamander.png',
        unlockCostInCores: 1000,
        metaData: {
          additionalDescription: 'A ship that breathes fire.',
          tier: 1,
          offenseRating: 5,
          defenseRating: 2,
          speedRating: 2,
          weaponSpecialization: 'Flame Throwers',
          weaponBlocks: ['flameThrower1', 'flameThrower2', 'flameThrower3', 'flameThrower4', 'flameThrower5'],
          affinity: 'flameThrower',
        } as CollectableShipMetadata,
      },
    ]
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

  /** Returns the ship definition for the given ship id. */
  static getByKey(shipId: string): CollectableShipDefinition | undefined {
    return this.shipMap.get(shipId);
  }

  /** Returns the default ship to use (e.g. fallback or first available). */
  static getDefaultShipName(): string {
    return 'sw1';
  }

  /** Returns all ship names in registration order. */
  static getAllShipNames(): string[] {
    return Array.from(this.shipMap.keys());
  }

  // Duplicate helper
  static getAllShipKeys(): string[] {
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
