// src/game/planets/definitions/planet_Arsea.ts
import type { PlanetDefinition } from '../interfaces/PlanetDefinition';

export const ArseaPlanet: PlanetDefinition = {
  name: 'Arsea',
  imagePath: 'assets/planets/7.png',
  scale: 8,
  interactionDialogueId: 'planet-generic',
  tradePostId: 'mission2-tradepost-0',
  questIds: ['ability:rollblocks', 'ability:combineblocks'],
  // approachDialogueId: 'dialogue-aetherion-approach',
};
