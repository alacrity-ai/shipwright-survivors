// src/systems/serialization/ShipSerializer.ts

import { Ship } from '@/game/ship/Ship';
import { getAssetPath } from '@/shared/assetHelpers';
import { Faction } from '@/game/interfaces/types/Faction';
import { BlockManager } from '@/game/blocks/system/BlockManager';
import { getBlockTypeByIndex } from '@/game/blocks/BlockRegistry';
import { snapToRightAngle } from '@/shared/mathUtils';

import { UnlockedPassiveAggregator } from '@/game/passives/runtime/UnlockedPassiveAggregator';

export interface SerializedShip {
  transform: {
    position: { x: number; y: number };
    rotation: number;
  };
  blocks: Array<{
    id: string;
    coord: { x: number; y: number };
    rotation?: number;
    group?: number;
  }>;
  behavior: {
    type: 'default' | 'spaceStation' | 'rammer' | string;
  };
}

export function serializeShip(ship: Ship): SerializedShip {
  const transform = ship.getTransform();
  const store = BlockManager.getInstance().getBlockStore();
  const indices = ship.getAllBlockIndices();

  const serializedBlocks = new Array<{
    id: string;
    coord: { x: number; y: number };
    rotation: number; // Always 0, 90, 180, 270
    group: number;
  }>(indices.length);

  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i];
    const typeIdx = store.typeIndex[idx];
    const type = getBlockTypeByIndex(typeIdx);

    const radians = store.localRotation[idx] ?? 0;
    const degrees = radians * (180 / Math.PI);
    const rotationDeg = snapToRightAngle(degrees);

    serializedBlocks[i] = {
      id: type?.id ?? 'unknown',
      coord: { x: store.localX[idx], y: store.localY[idx] },
      rotation: rotationDeg,
      group: store.group[idx]
    };
  }

  return {
    transform: {
      position: transform.position,
      rotation: transform.rotation
    },
    blocks: serializedBlocks,
    behavior: { type: 'default' }
  };
}


/**
 * Deserializes JSON-friendly ship data into a new Ship.
 * Uses SOA-based orchestration (no legacy Grid).
 */
export function deserializeShip(
  data: SerializedShip,
  faction: Faction = Faction.Enemy,
  isPlayerShip: boolean = false
): Ship {
  const ship = new Ship(undefined, undefined, isPlayerShip, undefined, faction);
  ship.loadFromJson(data);
  return ship;
}

/**
 * Loads a ship definition from JSON under /assets/ships and instantiates it.
 */
export async function loadShipFromJson(
  fileName: string,
  faction: Faction = Faction.Enemy,
  isPlayerShip: boolean = false
): Promise<{ ship: Ship; behaviorType?: string }> {
  const url = getAssetPath(`/assets/ships/${fileName}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`[ShipLoader] Failed to fetch ship JSON: '${fileName}' — HTTP ${response.status}`);
  }

  let data: any;
  try {
    data = await response.json();
  } catch (err) {
    const text = await response.text();
    console.error(`[ShipLoader] Invalid JSON for '${fileName}'. Raw body:\n${text.slice(0, 300)}…`);
    throw err;
  }

  const ship = new Ship(undefined, undefined, isPlayerShip, undefined, faction);
  ship.loadFromJson(data);

  if (isPlayerShip) {
    ship.setGlobalPassives(UnlockedPassiveAggregator.getAggregatedPassives());
  }

  if (data.behavior?.type === 'spaceStation') {
    ship.clearCollisionBox();
  }

  return { ship, behaviorType: data.behavior?.type };
}

/**
 * Loads a ship from a pre-parsed JSON object.
 */
export function loadShipFromJsonObject(
  data: any,
  faction: Faction = Faction.Enemy,
  isPlayerShip: boolean = false
): { ship: Ship; behaviorType?: string } {
  const ship = new Ship(undefined, undefined, isPlayerShip, undefined, faction);
  ship.loadFromJson(data);

  if (isPlayerShip) {
    ship.setGlobalPassives(UnlockedPassiveAggregator.getAggregatedPassives());
  }

  return { ship, behaviorType: data.behavior?.type };
}
