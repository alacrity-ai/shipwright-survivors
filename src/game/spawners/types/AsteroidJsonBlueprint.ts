// src/game/environment/asteroids/interfaces/AsteroidJsonBlueprint.ts

import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { Vector2 } from '@/game/interfaces/types/Vector2';

export interface AsteroidBlockDefinition {
  id: string;               // e.g., 'rock0'
  coord: GridCoord;         // grid-relative position
  rotation: number;         // absolute block rotation in radians
}

export interface AsteroidTransformDefinition {
  position: Vector2;        // world position of asteroid
  rotation: number;         // world rotation
}

export interface AsteroidJsonBlueprint {
  transform: AsteroidTransformDefinition;
  blocks: AsteroidBlockDefinition[];
}
