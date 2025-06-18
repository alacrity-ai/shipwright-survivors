// src/systems/ai/types/BehaviorProfileRegistry.ts

import {
  BehaviorProfile,
  DefaultBehaviorProfile,
  RammingBehaviorProfile,
  StrafingBehaviorProfile,
  SpaceStationBehaviorProfile,
} from './BehaviorProfile';

export type BehaviorTypeKey = 'default' | 'rammer' | 'strafe' | 'spaceStation';

/**
 * Maps string identifiers from serialized JSON (behavior.type)
 * to concrete BehaviorProfile implementations used by the AIControllerSystem.
 */
export const BehaviorProfileRegistry: Record<string, BehaviorProfile> = {
  default: DefaultBehaviorProfile,
  rammer: RammingBehaviorProfile,
  strafe: StrafingBehaviorProfile,
  spaceStation: SpaceStationBehaviorProfile,
};
