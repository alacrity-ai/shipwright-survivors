// src/game/ship/interfaces/CollectableShipDefinition.ts

export interface CollectableShipDefinition {
  name: string;
  filepath: string;
  iconImagePath: string;
  unlockCostInCores: number;
  metaData?: CollectableShipMetadata;
}

export interface CollectableShipMetadata {
  additionalDescription?: string;
  tier: number;
  offenseRating?: number;
  defenseRating?: number;
  speedRating?: number;
  weaponSpecialization?: string;
}
