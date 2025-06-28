// src/systems/incidents/scripts/QuantumBoomIncident.ts

import { BaseIncidentScript } from '@/systems/incidents/types/BaseIncidentScript';
import { GlobalEventBus } from '@/core/EventBus';
import { spawnCurrencyPickup } from '@/core/interfaces/events/PickupSpawnReporter';
import { getPointOnCircle } from '@/shared/vectorUtils';

export interface QuantumBoomOptions {
  x: number;
  y: number;
  radius?: number;
  pickupCount?: number;
}

export class QuantumBoomIncident extends BaseIncidentScript {
  private collected = false;

  constructor(
    id: string,
    options: Record<string, any>,
    waveId: number | undefined,
    context: any
  ) {
    super(id, options, waveId, context);
  }

  protected getMinimapIcon(): string | null {
    return 'quantumAttractor';
  }

  public override onTrigger(): void {
    super.onTrigger();

    const { x, y, radius = 3000, pickupCount = 24 } = this.options as QuantumBoomOptions;

    // Spawn pickups in circular pattern
    for (let i = 0; i < pickupCount; i++) {
      const theta = (i / pickupCount) * Math.PI * 2;
      const { x: px, y: py } = getPointOnCircle({ x, y }, radius, theta);

      spawnCurrencyPickup(px, py, 'entropium', 10 + Math.floor(Math.random() * 20));
    }

    // Spawn quantum attractor in center
    GlobalEventBus.emit('pickup:spawn:quantumAttractor', { x, y });

    // Listen for pickup collection
    GlobalEventBus.on('pickup:collected', this.handlePickupCollected);
  }

  private handlePickupCollected = ({ typeId }: { typeId: string }) => {
    if (typeId === 'quantumAttractor') {
      console.log('Quantum attractor collected!');
      this.collected = true;
      this.onComplete(true);
    }
  };

  public override isComplete(): boolean {
    return this.collected;
  }

  public override destroy(): void {
    GlobalEventBus.off('pickup:collected', this.handlePickupCollected);
    super.destroy();
  }

  public override onComplete(successful: boolean): void {
    GlobalEventBus.off('pickup:collected', this.handlePickupCollected);
    super.onComplete(successful);
  }
}
