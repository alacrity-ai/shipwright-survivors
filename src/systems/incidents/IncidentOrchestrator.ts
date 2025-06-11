// src/systems/incidents/IncidentOrchestrator.ts

import type { IUpdatable, IRenderable } from '@/core/interfaces/types';
import type { IncidentScript } from './types/IncidentScript';
import type { IncidentRuntimeContext } from './types/IncidentRuntimeContext';

import { IncidentRegistry } from './IncidentRegistry';

export class IncidentOrchestrator implements IUpdatable, IRenderable {
  private readonly registry: IncidentRegistry;
  private readonly activeIncidents: Map<string, IncidentScript> = new Map();
  private readonly context: IncidentRuntimeContext;

  constructor(context: IncidentRuntimeContext) {
    this.registry = new IncidentRegistry();
    this.context = context;
  }

  /**
   * Triggers a new incident by ID. The ID must be registered in the IncidentRegistry.
   * If the script is found, it's instantiated, triggered, and tracked for updates/rendering.
   */
  public trigger(
    scriptId: string,
    options: Record<string, any> = {},
    waveId?: number
  ): void {
    const instance = this.registry.create(scriptId, options, waveId, this.context);
    if (!instance) {
      console.warn(`[IncidentOrchestrator] Unknown incident script: '${scriptId}'`);
      return;
    }

    const id = instance.getId();

    if (this.activeIncidents.has(id)) {
      console.warn(`[IncidentOrchestrator] Duplicate incident ID '${id}' — skipping trigger.`);
      return;
    }

    this.activeIncidents.set(id, instance);
    instance.onTrigger();
  }

  /**
   * Called each frame. Updates all active incidents and removes any completed ones.
   */
  public update(dt: number): void {
    for (const [id, script] of this.activeIncidents) {
      script.update(dt);
      if (script.isComplete()) {
        script.onComplete?.();
        script.destroy?.();
        this.activeIncidents.delete(id);
      }
    }
  }

  /**
   * Renders all active incidents that implement the render method.
   */
  public render(dt: number): void {
    const canvasManager = this.context.canvasManager;
    for (const script of this.activeIncidents.values()) {
      script.render?.(canvasManager, dt);
    }
  }

  /**
   * Clears and destroys all incidents associated with a specific waveId.
   * If no waveId is given, clears all.
   */
  public clear(waveId?: number): void {
    for (const [id, script] of this.activeIncidents) {
      const belongsToWave = waveId === undefined || script.getWaveId() === waveId;
      if (belongsToWave) {
        script.destroy?.();
        this.activeIncidents.delete(id);
      }
    }
  }

  /**
   * Force-destroys all active incidents and clears internal state.
   * Call this when tearing down the mission or unloading a scene.
   */
  public destroy(): void {
    for (const script of this.activeIncidents.values()) {
      script.destroy?.();
    }
    this.activeIncidents.clear();
  }

  /**
   * Returns the number of active incidents currently being tracked.
   */
  public getActiveCount(): number {
    return this.activeIncidents.size;
  }

  /**
   * Returns a list of active incident IDs for debugging or telemetry.
   */
  public getActiveIncidentIds(): string[] {
    return Array.from(this.activeIncidents.keys());
  }
}
