// src/game/ship/artifacts/helpers/unlockAllArtifacts.ts

import { PlayerArtifactsManager } from '@/game/player/PlayerArtifactsManager';
import { getAllArtifacts } from '@/game/ship/artifacts/registry/ArtifactRegistry';

/**
 * Unlocks all known artifact definitions for the player.
 * Useful for debugging, sandbox modes, or internal QA tools.
 */
export function unlockAllArtifacts(): void {
  const manager = PlayerArtifactsManager.getInstance();
  const allArtifacts = getAllArtifacts();

  for (const artifact of allArtifacts) {
    manager.unlockArtifact(artifact.id);
  }
}
