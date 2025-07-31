// src/game/boss/interfaces/BossSpawnContext.ts

import type { BossDefinition } from '@/game/boss/interfaces/BossDefinition';

export interface BossSpawnContext {
  definition: BossDefinition;  // BossRegistry entry
  position: { x: number; y: number }; // Spawn position in world space
}
