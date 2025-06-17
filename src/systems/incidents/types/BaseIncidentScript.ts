// src/systems/incidents/types/BaseIncidentScript.ts

import { reportMinimapMarker, clearMinimapMarker } from '@/core/interfaces/events/IncidentMinimapReporter';
import { missionResultStore } from '@/game/missions/MissionResultStore';

import type { IncidentScript } from './IncidentScript';
import type { CanvasManager } from '@/core/CanvasManager';
import type { IncidentRuntimeContext } from './IncidentRuntimeContext';

/**
 * Abstract base class for all incident scripts.
 * Implements common lifecycle and metadata functionality.
 * Concrete subclasses must implement `update()` and `isComplete()`.
 */
export abstract class BaseIncidentScript implements IncidentScript {
  protected readonly id: string;
  protected readonly options: Record<string, any>;
  protected readonly waveId?: number;
  protected readonly context: IncidentRuntimeContext;

  private minimapRegistered = false;

  constructor(
    id: string,
    options: Record<string, any>,
    waveId: number | undefined,
    context: IncidentRuntimeContext
  ) {
    this.id = id;
    this.options = options;
    this.waveId = waveId;
    this.context = context;
  }

  /**
   * Returns this incident's unique runtime ID.
   */
  public getId(): string {
    return this.id;
  }

  /**
   * Returns the wave ID associated with this incident, if any.
   */
  public getWaveId(): number | undefined {
    return this.waveId;
  }

  /**
   * Override this method to specify the minimap icon to use.
   * If null is returned, no icon will be shown.
   */
  protected getMinimapIcon(): string | null {
    return null;
  }

  /**
   * Called once when the incident is first triggered.
   * Subclasses may override this to perform setup logic.
   * Automatically registers a minimap icon if `getMinimapIcon()` is defined.
   */
  public onTrigger(): void {
    const icon = this.getMinimapIcon();
    const { x, y } = this.options;

    if (icon && typeof x === 'number' && typeof y === 'number') {
      reportMinimapMarker({
        id: this.id,
        icon,
        x,
        y,
      });
      this.minimapRegistered = true;
    }
  }

  /**
   * Must be implemented by subclasses to handle per-frame logic.
   */
  public abstract update(dt: number): void;

  /**
   * Optional: render visuals using the provided canvas manager.
   */
  public render?(canvasManager: CanvasManager, dt: number): void;

  /**
   * Must return true once this incident is fully resolved.
   */
  public abstract isComplete(): boolean;

  /**
   * Optional: hook for finalization after normal completion.
   * Automatically unregisters the minimap marker if one was created.
   */
  public onComplete?(): void {
    if (this.minimapRegistered) {
      clearMinimapMarker(this.id);
      this.minimapRegistered = false;
    }
    missionResultStore.incrementIncidentsCompleted();
  }

  /**
   * Optional: cleanup hook when forcibly destroyed.
   * Automatically unregisters the minimap marker if one was created.
   */
  public destroy?(): void {
    if (this.minimapRegistered) {
      clearMinimapMarker(this.id);
      this.minimapRegistered = false;
    }
  }
}
