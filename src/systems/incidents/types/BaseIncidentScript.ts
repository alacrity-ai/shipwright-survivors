// src/systems/incidents/types/BaseIncidentScript.ts

import { reportMinimapMarker, clearMinimapMarker } from '@/core/interfaces/events/IncidentMinimapReporter';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { getDistance, getRandomWorldCoordinates } from '@/shared/vectorUtils';

import { audioManager } from '@/audio/Audio';

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
  private proximityTriggered = false;

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

  public getId(): string {
    return this.id;
  }

  public getWaveId(): number | undefined {
    return this.waveId;
  }

  /**
   * Override this method to specify the minimap icon to use.
   */
  protected getMinimapIcon(): string | null {
    return null;
  }

  /**
   * Called once when the incident is spawned into the world.
   */
  public onTrigger(): void {
    const icon = this.getMinimapIcon();
    let { x, y } = this.options;

    // Fallback to random coordinates if not provided
    if (typeof x !== 'number' || typeof y !== 'number') {
      const fallback = getRandomWorldCoordinates(400); // Optional: supply a default margin
      x = fallback.x;
      y = fallback.y;
      this.options.x = x;
      this.options.y = y;
    }

    if (icon) {
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
   * Called once when the player first enters proximity range.
   * Override this in subclasses to implement ambush, dialogue, etc.
   */
  protected onPlayerEnterProximity(): void {
    // Base class does nothing
  }

  /**
   * Subclasses must implement this to update incident logic.
   * Should still call super.update(dt) to preserve proximity check behavior.
   */
  public update(dt: number): void {
    this.checkPlayerProximity();
  }

  private checkPlayerProximity(): void {
    if (this.proximityTriggered) return;

    const { x, y, proximityRadius = 1200 } = this.options;
    if (typeof x !== 'number' || typeof y !== 'number') return;

    const playerShip = ShipRegistry.getInstance().getPlayerShip();
    const playerPos = playerShip?.getTransform().position;
    if (!playerPos) return;

    const incidentPos = { x, y };
    const dist = getDistance(playerPos, incidentPos);
    if (dist <= proximityRadius) {
      this.proximityTriggered = true;
      this.onPlayerEnterProximity();
    }
  }

  public render?(canvasManager: CanvasManager, dt: number): void;

  public abstract isComplete(): boolean;

  /**
   * Called automatically by the orchestrator when this incident completes naturally.
   * Subclasses overriding this must call `super.onComplete()`.
   */
  public onComplete(): void {
    audioManager.play('assets/sounds/sfx/pickups/powerup_02.wav', 'sfx', { maxSimultaneous: 1 });

    // Popup text on completion:
    this.context.popupMessageSystem.displayMessage('MISSION OBJECTIVE ACHIEVED', {
      color: '#00ff00',
      duration: 3,
      font: '28px monospace',
      glow: true,
    });

    if (this.minimapRegistered) {
      clearMinimapMarker(this.id);
      this.minimapRegistered = false;
    }
    missionResultStore.incrementIncidentsCompleted();
  }

  /**
   * Called when the incident is forcibly removed or cleared.
   * Subclasses overriding this must call `super.destroy()`.
   */
  public destroy(): void {
    if (this.minimapRegistered) {
      clearMinimapMarker(this.id);
      this.minimapRegistered = false;
    }
  }
}
