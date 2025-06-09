// src/systems/ai/types/BehaviorProfile.ts

export type AttackBehaviorType = 'orbit' | 'ram' | 'strafe';
export type SeekBehaviorType = 'direct' | 'flank';

export interface BehaviorProfile {
  attack: AttackBehaviorType;
  seek: SeekBehaviorType;
}

// === Predefined Profiles ===

export const DefaultBehaviorProfile: BehaviorProfile = {
  attack: 'orbit',
  seek: 'direct',
};

export const RammingBehaviorProfile: BehaviorProfile = {
  attack: 'ram',
  seek: 'direct',
};

export const StrafingBehaviorProfile: BehaviorProfile = {
  attack: 'strafe',
  seek: 'flank',
};
