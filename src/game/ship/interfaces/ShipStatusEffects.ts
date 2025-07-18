// src/game/ship/interfaces/StatusEffect.ts

import type { Ship } from '@/game/ship/Ship';

export interface StatusEffect {
  type: StatusEffectType;
  duration: number;            // Time remaining in seconds
  sourceShip: Ship | null;
  intensity?: number;          // Optional, for effects like slow amount
}

export type StatusEffectType = 'ignite' | 'frozen' | 'slowed' | 'electrocuted';
