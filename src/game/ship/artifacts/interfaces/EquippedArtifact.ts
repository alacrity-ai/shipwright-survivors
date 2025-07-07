// src/game/ship/artifacts/interfaces/EquippedArtifact.ts

export interface EquippedArtifact {
  shipName: string;       // The canonical ship identity (e.g., 'vanguard')
  artifactId: string;     // Artifact that is equipped
  slotIndex: 0 | 1 | 2;       // Slot the artifact occupies
}
