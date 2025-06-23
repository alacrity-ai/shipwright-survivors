// src/systems/incidents/scripts/BlackHoleIncident.ts

import { BaseIncidentScript } from '../types/BaseIncidentScript';
import type { IncidentRuntimeContext } from '../types/IncidentRuntimeContext';

export class BlackHoleIncident extends BaseIncidentScript {
  private elapsed = 0;
  private lifetime = 180; // seconds
  private nextLogTime = 0;

  constructor(
    id: string,
    options: Record<string, any>,
    waveId: number | undefined,
    context: IncidentRuntimeContext
  ) {
    super(id, options, waveId, context);
  }

  protected getMinimapIcon(): string | null {
    return 'skullAndBones';
  }

  public onTrigger(): void {
    super.onTrigger();
    console.log(`[BlackHoleIncident] Triggered at (${this.options.x}, ${this.options.y})`);

    this.context.popupMessageSystem.displayMessage('⚠ BLACK HOLE SPAWNED ⚠', {
      color: '#ff5555',
      duration: 3,
      glow: true,
      font: '28px monospace',
    });

    // Future: spawn gravitational pull field, particles, etc.
  }

  public update(dt: number): void {
    this.elapsed += dt;

    if (this.elapsed >= this.nextLogTime) {
      console.log(`[BlackHoleIncident] ${this.elapsed.toFixed(1)}s elapsed (id=${this.getId()})`);
      this.nextLogTime = Math.ceil(this.elapsed);
    }
  }

  public isComplete(): boolean {
    return this.elapsed >= this.lifetime;
  }

  public onComplete(): void {
    console.log(`[BlackHoleIncident] Complete (total time: ${this.elapsed.toFixed(1)}s)`);
    // Base handles minimap marker removal
  }

  public destroy(): void {
    console.log(`[BlackHoleIncident] Destroyed prematurely (elapsed: ${this.elapsed.toFixed(1)}s)`);
    // Base handles minimap marker removal
  }
}
