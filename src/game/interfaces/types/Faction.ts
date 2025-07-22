// src/game/interfaces/types/Faction.ts

// Represents a faction in the game, such as the player, enemies, or neutral entities

export enum Faction {
  Player = 'player',
  Enemy = 'enemy',
  Neutral = 'neutral',
}

// Faction enum mapping for SOA storage
export const FACTION_TO_INDEX: Record<Faction, number> = {
  [Faction.Player]: 0,
  [Faction.Enemy]: 1,
  [Faction.Neutral]: 2,
};

export const INDEX_TO_FACTION: Faction[] = [
  Faction.Player,
  Faction.Enemy,
  Faction.Neutral,
];

export function factionToIndex(faction: Faction): number {
  return FACTION_TO_INDEX[faction];
}

export function indexToFaction(index: number): Faction {
  return INDEX_TO_FACTION[index];
}
