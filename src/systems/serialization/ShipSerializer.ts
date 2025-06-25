// src/systems/serialization/ShipSerializer.ts

import { Ship } from '@/game/ship/Ship';
import { Grid } from '@/systems/physics/Grid'; // Import the Grid class
import { getAssetPath } from '@/shared/assetHelpers';
import { Faction } from '@/game/interfaces/types/Faction';

// Define the format for serialized ship data
export interface SerializedShip {
  transform: {
    position: { x: number; y: number };
    rotation: number;
  };
  blocks: Array<{
    id: string;
    coord: { x: number; y: number };
    rotation?: number;
  }>;
  behavior: {
    type: 'default' | 'spaceStation' | 'rammer' | string;
  };
}

/**
 * Serializes a Ship instance to JSON-friendly format.
 * @param ship The ship to serialize.
 * @param grid The grid associated with the ship to include in serialization.
 * @returns SerializedShip object.
 */
export function serializeShip(ship: Ship, grid: Grid): SerializedShip {
  const transform = ship.getTransform();
  
  // Serialize transform (position, rotation)
  const serializedTransform = {
    position: transform.position,
    rotation: transform.rotation,
  };

  // Serialize blocks with their position and id (no need to store hp, rotation will be handled during deserialization)
  const serializedBlocks = ship.getAllBlocks().map(([coord, block]) => {
    // Ensure the block is added to the grid before serialization
    grid.addBlockToCell(block);

    return {
      id: block.type.id, // block type id (e.g., "hull", "turret", etc.)
      coord,             // Position of the block in grid space
      rotation: block.rotation ?? 0, // Default to 0 if undefined
    };
  });

  return {
    transform: serializedTransform,
    blocks: serializedBlocks,
    behavior: { type: 'default' }
  };
}

/**
 * Deserializes a JSON-friendly object back into a Ship instance.
 * @param data The serialized ship data.
 * @param grid The grid instance that the ship will interact with.
 * @returns A new Ship instance.
 */
export function deserializeShip(data: SerializedShip, grid: Grid): Ship {
  const ship = new Ship(grid);  // Pass the grid to the ship constructor
  
  // Use the loadFromJson method to apply the serialized data
  ship.loadFromJson(data);  // Update loadFromJson to handle the grid

  return ship;
}

export async function loadShipFromJson(
  fileName: string,
  grid: Grid,
  faction: Faction = Faction.Enemy,
  isPlayerShip: boolean = false
): Promise<{ ship: Ship; behaviorType?: string }> {
  const url = getAssetPath(`/assets/ships/${fileName}`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[ShipLoader] Failed to fetch ship JSON: '${fileName}' — HTTP ${response.status}`);
      throw new Error(`[ShipLoader] HTTP error loading ship '${fileName}': ${response.statusText}`);
    }

    let data: any;

    try {
      data = await response.json();
    } catch (jsonErr) {
      console.error(`[ShipLoader] Invalid JSON while loading '${fileName}'. Response was likely HTML or malformed JSON.`);
      const text = await response.text(); // Try to read and print the actual body (e.g., HTML fallback)
      console.debug(`[ShipLoader] Raw response body for '${fileName}':\n${text.slice(0, 300)}…`);

      const message = jsonErr instanceof Error ? jsonErr.message : String(jsonErr);
      throw new Error(`[ShipLoader] Failed to parse JSON for '${fileName}': ${message}`);
    }

    const ship = new Ship(grid, undefined, undefined, false, undefined, faction);
    ship.setIsPlayerShip(isPlayerShip);
    ship.loadFromJson(data);

    return {
      ship,
      behaviorType: data.behavior?.type,
    };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[ShipLoader] Error loading ship from '${fileName}': ${message}`);
    throw err;
  }
}

export function loadShipFromJsonObject(
  data: any,
  grid: Grid,
  faction: Faction = Faction.Enemy,
  isPlayerShip: boolean = false
): { ship: Ship; behaviorType?: string } {
  const ship = new Ship(grid, undefined, undefined, false, undefined, faction);
  ship.setIsPlayerShip(isPlayerShip);
  ship.loadFromJson(data);
  return {
    ship,
    behaviorType: data.behavior?.type
  };
}
