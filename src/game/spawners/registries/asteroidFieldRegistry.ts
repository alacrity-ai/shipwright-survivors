// src/game/spawners/registries/AsteroidFieldRegistry.ts

import type { AsteroidFieldDefinition } from '@/game/spawners/types/AsteroidFieldDefinition';

import { asteroidField01 } from '@/game/spawners/spawnConfigurations/asteroidField01';
import { asteroidField02 } from '@/game/spawners/spawnConfigurations/asteroidField02';
// Future fields
// import { asteroidField03 } from '@/game/spawners/spawnConfigurations/asteroidField03';

const asteroidFieldRegistry = new Map<string, AsteroidFieldDefinition>([
  ['asteroid-field-01', asteroidField01],
  ['asteroid-field-02', asteroidField02]
  // ['asteroid-field-03', asteroidField03]
]);

export function getAsteroidFieldDefinition(id: string): AsteroidFieldDefinition | undefined {
  return asteroidFieldRegistry.get(id);
}

export function getAllAsteroidFieldDefinitions(): AsteroidFieldDefinition[] {
  return Array.from(asteroidFieldRegistry.values());
}
