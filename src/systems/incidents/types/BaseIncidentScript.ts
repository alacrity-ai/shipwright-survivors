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
  private hasCompleted = false;

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

    if (typeof x !== 'number' || typeof y !== 'number') {
      const fallback = getRandomWorldCoordinates(400);
      x = fallback.x;
      y = fallback.y;
      this.options.x = x;
      this.options.y = y;
    }

    if (icon) {
      reportMinimapMarker({ id: this.id, icon, x, y });
      this.minimapRegistered = true;
    }
  }

  /**
   * Called once when the player first enters proximity range.
   */
  protected onPlayerEnterProximity(): void {
    // No-op by default
  }

  /**
   * Subclasses must implement this to update incident logic.
   * Should still call super.update(dt) to preserve proximity check behavior.
   */
  public update(dt: number): void {
    if (this.hasCompleted) return;
    this.checkPlayerProximity();
    this.onUpdate(dt);
  }

  protected onUpdate(_dt: number): void {
    // Default no-op
  }

  private checkPlayerProximity(): void {
    if (this.proximityTriggered) return;

    const { x, y, proximityRadius = 1200 } = this.options;
    if (typeof x !== 'number' || typeof y !== 'number') return;

    const playerShip = ShipRegistry.getInstance().getPlayerShip();
    const playerPos = playerShip?.getTransform().position;
    if (!playerPos) return;

    const dist = getDistance(playerPos, { x, y });
    if (dist <= proximityRadius) {
      this.proximityTriggered = true;
      this.onPlayerEnterProximity();
    }
  }

  public render?(canvasManager: CanvasManager, dt: number): void;

  /**
   * Optional override: incidents may use this to signal logical completion.
   */
  public isComplete(): boolean {
    return this.hasCompleted;
  }

  /**
   * Call this when the incident finishes. Ensures onComplete logic only runs once.
   */
  public onComplete(successful: boolean = true): void {
    if (this.hasCompleted) {
      console.warn(`[Incident:${this.getId()}] onComplete() called more than once.`);
      return;
    }
    this.hasCompleted = true;

    if (successful) {
      audioManager.play('assets/sounds/sfx/pickups/powerup_02.wav', 'sfx', { maxSimultaneous: 1 });

      this.context.popupMessageSystem.displayMessage('MISSION OBJECTIVE ACHIEVED', {
        color: '#00ff00',
        duration: 3,
        font: '28px monospace',
        glow: true,
      });

      missionResultStore.incrementIncidentsCompleted();
    }

    if (this.minimapRegistered) {
      clearMinimapMarker(this.id);
      this.minimapRegistered = false;
    }
  }

  /**
   * Use to generate incident-owned tags (e.g. for spawned waves).
   */
  protected generateWaveTag(suffix: string): string {
    return `${this.id}:${suffix}`;
  }

  /**
   * Called when the incident is forcibly removed or cleared.
   */
  public destroy(): void {
    if (this.minimapRegistered) {
      clearMinimapMarker(this.id);
      this.minimapRegistered = false;
    }
  }
}
