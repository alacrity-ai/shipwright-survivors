// src/game/ship/artifacts/helpers/eraseAllArtifacts.ts

import { PlayerArtifactsManager } from '@/game/player/PlayerArtifactsManager';
import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';

/**
 * Removes all artifact unlocks and unequips them from every ship.
 * Clears cached metadata modifiers for consistency.
 */
export function eraseAllArtifacts(): void {
  const artifactManager = PlayerArtifactsManager.getInstance();
  const shipCollection = PlayerShipCollection.getInstance();

  // === Unequip artifacts from every ship ===
  for (const [shipName] of artifactManager.getAllEquippedArtifactEntries()) {
    artifactManager.unequipArtifact(shipName, 0);
    artifactManager.unequipArtifact(shipName, 1);
    artifactManager.unequipArtifact(shipName, 2);
  }

  // === Reset all global artifact unlocks ===
  artifactManager.reset();

  // === Clear modifier caches to reflect erased state ===
  shipCollection.clearCachedModifiers();

  console.info('[eraseAllArtifacts] All artifact unlocks and equips removed.');
}
