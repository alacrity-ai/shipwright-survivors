// src/systems/ai/helpers/FormationHelpers.ts

import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { BaseAIState } from '@/systems/ai/fsm/BaseAIState';
import type { Ship } from '@/game/ship/Ship';

import { PatrolState } from '@/systems/ai/fsm/PatrolState';

/**
 * Handles the teardown and fallback behavior when a formation leader is destroyed.
 * Clears formation context, removes the formation from the registry, and transitions the ship to PatrolState.
 */
export function handleFormationLeaderDeath(
  controller: AIControllerSystem,
  ship: Ship
): BaseAIState {
  const registry = controller.getFormationRegistry();
  const formationId = controller.getFormationId();

  if (registry && formationId) {
    registry.removeFormation(formationId);
  }

  controller.clearFormationContext();

  const patrol = new PatrolState(controller, ship);
  controller.setInitialState(patrol);
  return patrol;
}
