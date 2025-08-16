// src/game/waves/io/BehaviorRegistry.ts
import type { BehaviorProfile } from '@/systems/ai/types/BehaviorProfile';
import { SiegeBehaviorProfile } from '@/systems/ai/types/BehaviorProfile';

type Creator = (params?: Record<string, any>) => BehaviorProfile;

class BehaviorRegistry {
  private creators = new Map<string, Creator>();

  register(preset: string, creator: Creator) {
    this.creators.set(preset, creator);
  }

  create(preset: string, params?: Record<string, any>): BehaviorProfile {
    const c = this.creators.get(preset);
    if (!c) throw new Error(`Unknown behavior preset: ${preset}`);
    return c(params);
  }
}

export const behaviorRegistry = new BehaviorRegistry();

// Register built-ins once during boot
behaviorRegistry.register('siege', (params) => ({
  ...SiegeBehaviorProfile,
  params: { ...SiegeBehaviorProfile.params, ...(params ?? {}) }
}));

// Additional presets go here as needed.
// behaviorRegistry.register('kamikaze', ...);
