// src/game/ship/interfaces/StatusEffect.ts

export interface StatusEffect {
  type: StatusEffectType;
  duration: number;            // Time remaining in seconds
  intensity?: number;          // Optional, for effects like slow amount
}

export type StatusEffectType = 'ignite' | 'frozen' | 'slowed' | 'electrocuted';
