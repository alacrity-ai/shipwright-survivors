// src/systems/incidents/IncidentRegistry.ts

import type { IncidentScript, IncidentScriptConstructor } from './types/IncidentScript';
import type { IncidentRuntimeContext } from './types/IncidentRuntimeContext';

// Example scripts — import all here
import { BlackHoleIncident } from './scripts/BlackHoleIncident';
import { HealingBeaconIncident } from './scripts/HealingBeaconIncident';
import { CursedCargoIncident } from './scripts/CursedCargoIncident';
// Add more as needed...

export class IncidentRegistry {
  private readonly scriptConstructors: Map<string, IncidentScriptConstructor> = new Map();

  constructor() {
    this.registerAll();
  }

  /**
   * Internal: bulk registration of all known scripts.
   * This centralizes the registration process and avoids dynamic imports for now.
   */
  private registerAll(): void {
    this.register('BlackHoleIncident', BlackHoleIncident);
    this.register('HealingBeaconIncident', HealingBeaconIncident);
    this.register('CursedCargoIncident', CursedCargoIncident);
    // Register additional scripts here...
  }

  /**
   * Registers a script constructor under a specific ID.
   * Used for manual extension or mod support.
   */
  public register(id: string, ctor: IncidentScriptConstructor): void {
    if (this.scriptConstructors.has(id)) {
      console.warn(`[IncidentRegistry] Duplicate script ID: '${id}'`);
      return;
    }
    this.scriptConstructors.set(id, ctor);
  }

  /**
   * Returns true if the registry contains a script with the given ID.
   */
  public has(id: string): boolean {
    return this.scriptConstructors.has(id);
  }

  /**
   * Instantiates a script by ID with the given options, wave context, and full runtime context.
   */
  public create(
    id: string,
    options: Record<string, any>,
    waveId: number | undefined,
    context: IncidentRuntimeContext
  ): IncidentScript | null {
    const ctor = this.scriptConstructors.get(id);
    if (!ctor) {
      console.warn(`[IncidentRegistry] Unknown incident script ID: '${id}'`);
      return null;
    }

    return new ctor(id, options, waveId, context);
  }

  /**
   * Returns a list of all registered incident script IDs.
   */
  public getRegisteredScriptIds(): string[] {
    return Array.from(this.scriptConstructors.keys());
  }
}
