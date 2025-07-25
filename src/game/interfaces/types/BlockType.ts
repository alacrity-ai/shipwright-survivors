// src/game/interfaces/BlockType.ts

import type { BlockBehavior } from '@/game/interfaces/behavior/BlockBehavior';

export type BlockCategory = 'system' | 'hull' | 'engine' | 'weapon' | 'utility' | 'environment';

export interface BlockType {
  id: string;
  tier: number;
  name: string;
  sprite: string;
  armor: number;
  mass: number;
  cost: number;
  category: BlockCategory;
  subcategory?: string;
  behavior?: BlockBehavior;
  size?: number;
  dropRate?: number;
  placementSound?: string;
  metatags?: string[];
  blockDropOverride?: string;
}

// src/game/blocks/constants/BlockCategories.ts

export const BlockCategoryEnum = {
  System: 0,
  Hull: 1,
  Engine: 2,
  Weapon: 3,
  Utility: 4,
  Environment: 5,
} as const;

export type BlockCategoryCode = typeof BlockCategoryEnum[keyof typeof BlockCategoryEnum];

// Subcategories (flattened for all types)
export const BlockSubcategoryEnum = {
  None: 0,
  FacetPlate: 1,
  Turret: 2,
  ExplosiveLance: 3,
  Laser: 4,
  Energy: 5,
  Shield: 6,
  Engine: 7,
  Fin: 8,
  Exploration: 9,
  HaloBlade: 10,
  HeatSeeker: 11,
  FlameThrower: 12,
  Fuel: 13,
  Cockpit: 14
} as const;

export type BlockSubcategoryCode = typeof BlockSubcategoryEnum[keyof typeof BlockSubcategoryEnum];
