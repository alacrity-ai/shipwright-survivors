import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

// === Artifact Definitions ===
import { fortificationModule } from '@/game/ship/artifacts/registry/definitions/fortificationModule';
import { heatSeekerTargettingModule } from '@/game/ship/artifacts/registry/definitions/heatSeekerTargettingModule';
import { unstableThruster } from '@/game/ship/artifacts/registry/definitions/unstableThruster';
import { reflectorPlate } from '@/game/ship/artifacts/registry/definitions/reflectorPlate';
import { solarCapacitor } from '@/game/ship/artifacts/registry/definitions/solarCapacitor';


// === Internal Artifact Lookup ===
const internalRegistry: Record<string, ArtifactDefinition> = {
  [fortificationModule.id]: fortificationModule,
  [heatSeekerTargettingModule.id]: heatSeekerTargettingModule,
  [unstableThruster.id]: unstableThruster,
  [reflectorPlate.id]: reflectorPlate,
  [solarCapacitor.id]: solarCapacitor,
};

/**
 * Retrieves an artifact definition by its ID.
 */
export function getArtifactById(id: string): ArtifactDefinition | undefined {
  return internalRegistry[id];
}

/**
 * Returns all registered artifact definitions.
 */
export function getAllArtifacts(): ArtifactDefinition[] {
  return Object.values(internalRegistry);
}

/**
 * Checks whether an artifact ID is registered.
 */
export function isArtifactRegistered(id: string): boolean {
  return id in internalRegistry;
}
