// src/systems/incidents/IncidentOrchestrator.ts

import type { IUpdatable, IRenderable } from '@/core/interfaces/types';
import type { IncidentScript } from './types/IncidentScript';
import type { IncidentRuntimeContext } from './types/IncidentRuntimeContext';

import { IncidentRegistry } from './IncidentRegistry';
import { GlobalEventBus } from '@/core/EventBus';

interface PendingTrigger {
  id: string;
  scriptId: string;
  options: Record<string, any>;
  waveId?: number;
  remainingDelay: number;
}

export class IncidentOrchestrator implements IUpdatable, IRenderable {
  private readonly registry: IncidentRegistry;
  private readonly activeIncidents: Map<string, IncidentScript> = new Map();
  private readonly context: IncidentRuntimeContext;
  private readonly waveIncidentCounters: Map<string, number> = new Map();
  private readonly pendingTriggers: PendingTrigger[] = [];

  constructor(context: IncidentRuntimeContext) {
    this.registry = new IncidentRegistry();
    this.context = context;

    GlobalEventBus.on('incident:trigger', this.handleTriggerEvent);
    GlobalEventBus.on('incident:clear', this.handleClearEvent);
  }

  /**
   * Triggers an incident script immediately or after an optional delay.
   */
  public trigger(
    scriptId: string,
    options: Record<string, any> = {},
    waveId?: number,
    delaySeconds?: number
  ): void {
    const base = `${scriptId}:${waveId ?? 'none'}`;
    const count = (this.waveIncidentCounters.get(base) ?? 0) + 1;
    this.waveIncidentCounters.set(base, count);
    const id = `${base}:${count}`;

    if (delaySeconds && delaySeconds > 0) {
      this.pendingTriggers.push({
        id,
        scriptId,
        options,
        waveId,
        remainingDelay: delaySeconds,
      });
      return;
    }

    if (this.activeIncidents.has(id)) {
      console.warn(`[IncidentOrchestrator] Duplicate incident ID '${id}' — skipping trigger.`);
      return;
    }

    const instance = this.registry.create(scriptId, options, waveId, this.context, id);
    if (!instance) {
      console.warn(`[IncidentOrchestrator] Failed to instantiate incident: '${scriptId}'`);
      return;
    }

    this.activeIncidents.set(id, instance);
    instance.onTrigger();
  }

  public triggerAdhoc(scriptId: string, tag: string, options: Record<string, any> = {}): void {
    if (this.activeIncidents.has(tag)) {
      console.warn(`[IncidentOrchestrator] Duplicate incident tag '${tag}' — skipping trigger.`);
      return;
    }

    const instance = this.registry.create(scriptId, options, undefined, this.context, tag);
    if (!instance) {
      console.warn(`[IncidentOrchestrator] Failed to instantiate ad-hoc incident: '${scriptId}'`);
      return;
    }

    this.activeIncidents.set(tag, instance);
    instance.onTrigger();
  }

  public update(dt: number): void {
    for (let i = this.pendingTriggers.length - 1; i >= 0; i--) {
      const trigger = this.pendingTriggers[i];
      trigger.remainingDelay -= dt;

      if (trigger.remainingDelay <= 0) {
        if (this.activeIncidents.has(trigger.id)) {
          console.warn(`[IncidentOrchestrator] Duplicate delayed incident ID '${trigger.id}' — skipping.`);
        } else {
          const instance = this.registry.create(
            trigger.scriptId,
            trigger.options,
            trigger.waveId,
            this.context,
            trigger.id
          );
          if (instance) {
            this.activeIncidents.set(trigger.id, instance);
            instance.onTrigger();
          } else {
            console.warn(`[IncidentOrchestrator] Failed to instantiate delayed incident: '${trigger.scriptId}'`);
          }
        }
        this.pendingTriggers.splice(i, 1);
      }
    }

    // === Active incidents ===
    for (const [id, script] of this.activeIncidents) {
      script.update(dt);
      if (script.isComplete()) {
        script.onComplete?.();
        script.destroy?.();
        this.activeIncidents.delete(id);
      }
    }
  }

  public render(dt: number): void {
    const canvasManager = this.context.canvasManager;
    for (const script of this.activeIncidents.values()) {
      script.render?.(canvasManager, dt);
    }
  }

  public clear(waveId?: number): void {
    for (const [id, script] of this.activeIncidents) {
      const belongsToWave = waveId === undefined || script.getWaveId() === waveId;
      if (belongsToWave) {
        script.destroy?.();
        this.activeIncidents.delete(id);
      }
    }
  }

  public clearByTag(tag: string): void {
    const script = this.activeIncidents.get(tag);
    if (!script) return;

    script.destroy?.();
    this.activeIncidents.delete(tag);
  }

  public clearAll(): void {
    for (const script of this.activeIncidents.values()) {
      script.destroy?.();
    }
    this.activeIncidents.clear();
    this.pendingTriggers.length = 0;
  }

  public destroy(): void {
    GlobalEventBus.off('incident:trigger', this.handleTriggerEvent);
    GlobalEventBus.off('incident:clear', this.handleClearEvent);

    this.clearAll();
    this.waveIncidentCounters.clear();
  }

  public getActiveCount(): number {
    return this.activeIncidents.size;
  }

  public getActiveIncidentIds(): string[] {
    return Array.from(this.activeIncidents.keys());
  }

  private readonly handleTriggerEvent = (payload: {
    script: string;
    tag: string;
    options?: Record<string, any>;
  }): void => {
    this.triggerAdhoc(payload.script, payload.tag, payload.options ?? {});
  };

  private readonly handleClearEvent = (payload: { tag: string }): void => {
    this.clearByTag(payload.tag);
  };
}
