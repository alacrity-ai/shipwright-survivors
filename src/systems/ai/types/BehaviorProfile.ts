// src/systems/ai/types/BehaviorProfile.ts

import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { BaseAIState } from '@/systems/ai/fsm/BaseAIState';
import { ShipRegistry } from '@/game/ship/ShipRegistry';

import { SeekTargetState } from '@/systems/ai/fsm/SeekTargetState';
import { PatrolState } from '@/systems/ai/fsm/PatrolState';
import { IdleState } from '@/systems/ai/fsm/IdleState';

export type AttackBehaviorType = 'orbit' | 'ram' | 'strafe' | 'siege';
export type SeekBehaviorType = 'direct' | 'flank';

/**
 * Optional parameters for behavior tuning, passed to AttackState and other AI FSMs.
 */
export interface BehaviorParams {
  orbitRadius?: number;
  siegeRange?: number;
  [key: string]: any;
}

export interface BehaviorProfile {
  attack: AttackBehaviorType;
  seek: SeekBehaviorType;
  /**
   * Optional per-behavior parameters (e.g. orbit radius, siege range).
   */
  params?: BehaviorParams;

  /**
   * Optional factory function for setting the initial FSM state.
   * If omitted, the AI will start in idle state.
   */
  initialStateFactory?: (controller: AIControllerSystem) => BaseAIState;
}

// === Predefined Profiles ===

export const DefaultBehaviorProfile: BehaviorProfile = {
  attack: 'orbit',
  seek: 'direct',
  initialStateFactory: (controller) =>
    new PatrolState(controller, controller.getShip()),
};

export const SiegeBehaviorProfile: BehaviorProfile = {
  attack: 'siege',
  seek: 'direct',
  params: {
    siegeRange: 800,
  },
  initialStateFactory: (controller) => {
    const player = ShipRegistry.getInstance().getPlayerShip();
    if (!player) {
      console.warn('[AI] SiegeBehaviorProfile: Player ship not found, defaulting to IdleState');
      return new IdleState(controller, controller.getShip());
    }

    return new SeekTargetState(controller, controller.getShip(), player);
  },
};

export const RammingBehaviorProfile: BehaviorProfile = {
  attack: 'ram',
  seek: 'direct',
  initialStateFactory: (controller) => {
    const player = ShipRegistry.getInstance().getPlayerShip();
    if (!player) {
      console.warn('[AI] RammingBehaviorProfile: Player ship not found, defaulting to IdleState');
      return new IdleState(controller, controller.getShip());
    }

    return new SeekTargetState(controller, controller.getShip(), player);
  },
};

export const StrafingBehaviorProfile: BehaviorProfile = {
  attack: 'strafe',
  seek: 'flank',
  initialStateFactory: (controller) =>
    new PatrolState(controller, controller.getShip()),
};

export const SpaceStationBehaviorProfile: BehaviorProfile = {
  attack: 'orbit', // Structurally valid, but unused
  seek: 'direct',  // Unused — station is immobile
  initialStateFactory: (controller) =>
    new IdleState(controller, controller.getShip()),
};
