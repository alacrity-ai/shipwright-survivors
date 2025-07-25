import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { AsteroidJsonBlueprint } from '@/game/spawners/types/AsteroidJsonBlueprint';
import type { CompositeBlockObjectGrid } from '@/game/entities/CompositeBlockObjectGrid';

import { Asteroid } from '@/game/entities/Asteroid';
import { getAsteroidBlockType } from '@/game/blocks/AsteroidBlockRegistry';
import { getBlockTypeByIndex } from '@/game/blocks/BlockRegistry';
import { getAssetPath } from '@/shared/assetHelpers';
import { Faction } from '@/game/interfaces/types/Faction';
import { BlockManager } from '@/game/blocks/system/BlockManager';

export interface SerializedBlockObject {
  transform: BlockEntityTransform;
  blocks: Array<{
    id: string;
    coord: { x: number; y: number };
    rotation?: number;
  }>;
  behavior: {
    type: string;
  };
}

/**
 * Serializes a CompositeBlockObject (Ship, Asteroid, etc.) into a JSON-friendly format.
 * Uses SOA BlockStore rather than legacy BlockInstance maps.
 */
export function serializeCompositeBlockObject(
  object: CompositeBlockObject
): SerializedBlockObject {
  const transform = object.getTransform();
  const store = BlockManager.getInstance().getBlockStore();
  const indices = object.getAllBlockIndices();

  const serializedBlocks = new Array<{
    id: string;
    coord: { x: number; y: number };
    rotation?: number;
  }>(indices.length);

  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i];
    const typeIdx = store.typeIndex[idx];
    const type = getBlockTypeByIndex(typeIdx);

    serializedBlocks[i] = {
      id: type?.id ?? 'unknown',
      coord: { x: store.localX[idx], y: store.localY[idx] },
      rotation: store.localRotation[idx] ?? 0
    };
  }

  return {
    transform: {
      position: transform.position,
      velocity: transform.velocity,
      rotation: transform.rotation,
      angularVelocity: transform.angularVelocity
    },
    blocks: serializedBlocks,
    behavior: { type: 'default' }
  };
}

/**
 * Loads a prefab JSON blueprint for an asteroid.
 * Caches results for repeated use.
 */
const asteroidBlueprintCache = new Map<string, AsteroidJsonBlueprint>();

export async function loadAsteroidPrefab(fileName: string): Promise<AsteroidJsonBlueprint> {
  if (asteroidBlueprintCache.has(fileName)) {
    return asteroidBlueprintCache.get(fileName)!;
  }
  const url = getAssetPath(`/assets/environment/asteroids/${fileName}`);
  const json: AsteroidJsonBlueprint = await fetch(url).then(res => res.json());
  asteroidBlueprintCache.set(fileName, json);
  return json;
}

/**
 * Instantiates a new Asteroid from a prefab JSON definition.
 * Uses SOA-based orchestration (no legacy BlockInstance objects).
 */
export async function loadAsteroidFromJson(
  fileName: string,
  objectGrid: CompositeBlockObjectGrid<CompositeBlockObject>
): Promise<Asteroid> {
  const json = await loadAsteroidPrefab(fileName);

  const asteroid = new Asteroid(
    objectGrid,
    undefined,
    {
      position: json.transform.position,
      rotation: json.transform.rotation,
      velocity: { x: 0, y: 0 },
      angularVelocity: 0
    },
    Faction.Neutral
  );

  // Normalize blueprint into SerializedBlockObject format
  const serialized: SerializedBlockObject = {
    transform: {
      position: json.transform.position,
      velocity: { x: 0, y: 0 },
      rotation: json.transform.rotation,
      angularVelocity: 0
    },
    blocks: json.blocks.map(b => ({
      id: b.id,
      coord: b.coord,
      rotation: b.rotation
    })),
    behavior: { type: 'default' } // Asteroids use default behavior
  };

  asteroid.loadFromJson(serialized);

  return asteroid;
}
