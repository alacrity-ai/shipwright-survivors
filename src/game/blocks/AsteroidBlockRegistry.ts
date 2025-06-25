// src/game/environment/AsteroidBlockRegistry.ts

import type { BlockType } from '@/game/interfaces/types/BlockType';

const asteroidBlockTypes: Record<string, BlockType> = {
  // Rounded rock
  circleRock0: {
    id: 'circleRock0',
    name: 'Basalt Chunk',
    armor: 5,
    cost: 0,
    mass: 120,
    sprite: 'circleRock0',
    category: 'environment',
    subcategory: 'asteroid',
    dropRate: 0,
    tier: 0,
    metatags: ['asteroid']
  },
  // Square shaped rock
  rock0: {
    id: 'rock0',
    name: 'Basalt Chunk',
    armor: 5,
    cost: 0,
    mass: 120,
    sprite: 'rock0',
    category: 'environment',
    subcategory: 'asteroid',
    dropRate: 0,
    tier: 0,
    metatags: ['asteroid']
  },
  // Wedge shaped rock
  facetRock0: {
    id: 'facetRock0',
    name: 'Basalt Chunk',
    armor: 5,
    cost: 0,
    mass: 120,
    sprite: 'facetRock0',
    category: 'environment',
    subcategory: 'asteroid',
    dropRate: 0,
    tier: 0,
    metatags: ['asteroid']
  },
  facetRock1: {
    id: 'facetRock1',
    name: 'Basalt Chunk',
    armor: 5,
    cost: 0,
    mass: 120,
    sprite: 'facetRock1',
    category: 'environment',
    subcategory: 'asteroid',
    dropRate: 0,
    tier: 0,
    metatags: ['asteroid']
  },
  facetRockSlim0: {
    id: 'facetRockSlim0',
    name: 'Basalt Chunk',
    armor: 5,
    cost: 0,
    mass: 120,
    sprite: 'facetRockSlim0',
    category: 'environment',
    subcategory: 'asteroid',
    dropRate: 0,
    tier: 0,
    metatags: ['asteroid']
  },
};

export function getAsteroidBlockType(id: string): BlockType | undefined {
  return asteroidBlockTypes[id];
}

export function getAllAsteroidBlockTypes(): BlockType[] {
  return Object.values(asteroidBlockTypes);
}
