// src/game/interfaces/BlockType.ts

import type { BlockBehavior } from '@/game/interfaces/behavior/BlockBehavior';

export type BlockCategory = 'system' | 'hull' | 'engine' | 'weapon' | 'utility';

export interface BlockType {
  id: string;
  name: string;
  sprite: string;
  armor: number;
  mass: number;
  cost: number;
  category: BlockCategory;
  subcategory?: string;
  behavior?: BlockBehavior;
  size?: number;
  dropRate?: number; // ADDED
}
