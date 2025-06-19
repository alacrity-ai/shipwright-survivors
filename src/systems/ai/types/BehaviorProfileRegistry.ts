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
export const BehaviorProfileRegistry: Record<BehaviorTypeKey, BehaviorProfile> = {
  default: DefaultBehaviorProfile,
  rammer: RammingBehaviorProfile,
  strafe: StrafingBehaviorProfile,
  spaceStation: SpaceStationBehaviorProfile,
};

/**
 * Type guard to check whether a string is a valid BehaviorTypeKey.
 */
export function isBehaviorTypeKey(value: string): value is BehaviorTypeKey {
  return value in BehaviorProfileRegistry;
}
