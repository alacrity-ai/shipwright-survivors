// src/systems/galaxymap/registry/GalaxyMapRegistry.ts

import type { LocationDefinition } from '@/systems/galaxymap/types/LocationDefinition';
import { PLANETARY_LOCATIONS } from '@/systems/galaxymap/registry/definitions/Locations';

export class GalaxyMapRegistry {
  private static instance: GalaxyMapRegistry | null = null;

  private readonly locationMap: Map<string, LocationDefinition>;

  private constructor() {
    this.locationMap = new Map();
    for (const location of PLANETARY_LOCATIONS) {
      this.locationMap.set(location.id.toLowerCase(), location);
    }
  }

  public static getInstance(): GalaxyMapRegistry {
    if (!this.instance) {
      this.instance = new GalaxyMapRegistry();
    }
    return this.instance;
  }

  public static destroy(): void {
    this.instance = null;
  }

  public getLocationById(id: string): LocationDefinition | null {
    return this.locationMap.get(id.toLowerCase()) ?? null;
  }

  public getAllLocations(): LocationDefinition[] {
    return Array.from(this.locationMap.values());
  }
}
