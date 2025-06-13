// src/game/planets/PlanetRegistry.ts
import type { PlanetDefinition } from './interfaces/PlanetDefinition';

import { FerrustPlanet } from '@/game/planets/definitions/planet_Ferrust';
import { GilipePlanet } from '@/game/planets/definitions/planet_Gilipe';
import { ArseaPlanet } from '@/game/planets/definitions/planet_Arsea';

const planetMap: Map<string, PlanetDefinition> = new Map();

function registerPlanet(def: PlanetDefinition): void {
  if (planetMap.has(def.name)) {
    throw new Error(`Duplicate planet registration: ${def.name}`);
  }
  planetMap.set(def.name, def);
}

// === Register All Planets ===
registerPlanet(FerrustPlanet);
registerPlanet(GilipePlanet);
registerPlanet(ArseaPlanet);

export const PlanetRegistry = {
  getPlanetByName(name: string): PlanetDefinition {
    const def = planetMap.get(name);
    if (!def) {
      throw new Error(`Planet "${name}" not found in registry`);
    }
    return def;
  },

  getAll(): PlanetDefinition[] {
    return Array.from(planetMap.values());
  }
};
