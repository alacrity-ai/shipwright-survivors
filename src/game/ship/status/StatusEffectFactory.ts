// src/game/ship/status/StatusEffectFactory.ts

import type { Ship } from '@/game/ship/Ship';
import type { CombatService } from '@/systems/combat/CombatService';

import { StatusEffectType } from '@/game/ship/interfaces/ShipStatusEffects';
import { IgniteStatus } from '@/game/ship/status/effects/IgniteStatus';
import { FrozenStatus } from '@/game/ship/status/effects/FrozenStatus';
// import { SlowedStatus } from './effects/SlowedStatus';
// import { ElectrocutedStatus } from './effects/ElectrocutedStatus';
import { StatusEffect } from '@/game/ship/status/StatusEffect';

export class StatusEffectFactory {
  static create(type: StatusEffectType, duration: number, sourceShip: Ship | null, intensity: number): StatusEffect {
    switch (type) {
      case 'ignite': return new IgniteStatus(type, duration, sourceShip, intensity);
      case 'frozen': return new FrozenStatus(type, duration, sourceShip, intensity);
      // case 'slowed': return new SlowedStatus(type, duration, intensity);
      // case 'electrocuted': return new ElectrocutedStatus(type, duration, intensity);
      default:
        throw new Error(`Unknown status effect type: ${type}`);
    }
  }
}
