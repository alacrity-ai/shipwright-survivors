import type { Grid } from '@/systems/physics/Grid';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { AsteroidJsonBlueprint } from '@/game/spawners/types/AsteroidJsonBlueprint';
import type { CompositeBlockObjectGrid } from '@/game/entities/CompositeBlockObjectGrid';

import { Asteroid } from '@/game/entities/Asteroid';
import { getAsteroidBlockType } from '@/game/blocks/AsteroidBlockRegistry';
import { getAssetPath } from '@/shared/assetHelpers';
import { Faction } from '@/game/interfaces/types/Faction';

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

export function serializeCompositeBlockObject(
  object: CompositeBlockObject,
  grid: Grid
): SerializedBlockObject {
  const transform = object.getTransform();

  const serializedTransform = {
    position: transform.position,
    velocity: transform.velocity,
    rotation: transform.rotation,
    angularVelocity: transform.angularVelocity,
  };

  const serializedBlocks = object.getAllBlocks().map(([coord, block]) => {
    grid.addBlockToCell(block); // Ensure it's registered
    return {
      id: block.type.id,
      coord,
      rotation: block.rotation ?? 0,
    };
  });

  return {
    transform: serializedTransform,
    blocks: serializedBlocks,
    behavior: { type: 'default' },
  };
}


const asteroidBlueprintCache = new Map<string, AsteroidJsonBlueprint>();

export async function loadAsteroidPrefab(fileName: string): Promise<AsteroidJsonBlueprint> {
  if (asteroidBlueprintCache.has(fileName)) {
    return asteroidBlueprintCache.get(fileName)!;
  }
  const url = getAssetPath(`/assets/environment/asteroids/${fileName}`);
  const json: AsteroidJsonBlueprint = await fetch(url).then((res) => res.json());
  asteroidBlueprintCache.set(fileName, json);
  return json;
}

export async function loadAsteroidFromJson(
  fileName: string,
  grid: Grid,
  objectGrid: CompositeBlockObjectGrid<CompositeBlockObject>
): Promise<Asteroid> {
  const json = await loadAsteroidPrefab(fileName);

  const asteroid = new Asteroid(grid, objectGrid, [], {
    position: json.transform.position,
    rotation: json.transform.rotation,
    velocity: { x: 0, y: 0 },
    angularVelocity: 0,
  });

  for (const b of json.blocks) {
    const type = getAsteroidBlockType(b.id);
    if (!type) throw new Error(`Unknown block type: ${b.id}`);

    const block: BlockInstance = {
      id: crypto.randomUUID(),
      ownerFaction: Faction.Neutral, // Asteroids are neutral by default
      type,
      hp: type.armor,
      ownerShipId: asteroid.id,
      position: { x: 0, y: 0 },
      rotation: b.rotation,
    };

    asteroid.placeBlock(b.coord, block);
  }

  return asteroid;
}


