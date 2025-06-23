// src/systems/incidents/scripts/HealingBeaconIncident.ts

import { BaseIncidentScript } from '../types/BaseIncidentScript';
import type { IncidentRuntimeContext } from '../types/IncidentRuntimeContext';

export class HealingBeaconIncident extends BaseIncidentScript {
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
    return 'greenCross';
  }

  public onTrigger(): void {
    super.onTrigger();
    
    console.log(`[HealingBeaconIncident] Deployed at (${this.options.x}, ${this.options.y})`);

    this.context.popupMessageSystem.displayMessage('✨ Healing Beacon Online ✨', {
      color: '#00ffaa',
      duration: 3,
      font: '26px monospace',
      glow: true,
    });

    // Future: spawn the actual healing entity and associated particle FX
  }

  public update(dt: number): void {
    this.elapsed += dt;

    if (this.elapsed >= this.nextLogTime) {
      console.log(`[HealingBeaconIncident] Active for ${this.elapsed.toFixed(1)}s (id=${this.getId()})`);
      this.nextLogTime = Math.ceil(this.elapsed);
    }
  }

  public isComplete(): boolean {
    return this.elapsed >= this.lifetime;
  }

  public onComplete(): void {
    console.log(`[HealingBeaconIncident] Completed after ${this.elapsed.toFixed(1)}s`);
    // Future: emit final healing burst or clean visual anchor
  }

  public destroy(): void {
    console.log(`[HealingBeaconIncident] Destroyed early at ${this.elapsed.toFixed(1)}s`);
    // Future: cancel healing and cleanup entities
  }
}
