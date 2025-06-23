// src/systems/incidents/scripts/CursedCargoIncident.ts

import { BaseIncidentScript } from '../types/BaseIncidentScript';
import { v4 } from 'uuid';
import { spawnWave, clearWave } from '@/core/interfaces/events/WaveSpawnReporter';
import { GlobalEventBus } from '@/core/EventBus';
import { spawnCurrencyExplosion } from '@/systems/pickups/helpers/spawnCurrencyExplosion';
import { spawnBlockExplosion } from '@/systems/pickups/helpers/spawnBlockExplosion';
import { spawnRepairExplosion } from '@/systems/pickups/helpers/spawnRepairExplosion';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';

import type { IncidentRuntimeContext } from '../types/IncidentRuntimeContext';

export class CursedCargoIncident extends BaseIncidentScript {
  private elapsed = 0;
  private lifetime = 180;
  private nextLogTime = 0;

  private waveTag: string = `cursed-cargo-${v4()}`;
  private hasSpawnedAmbush = false;
  private isResolvedByWave = false;

  private readonly handleWaveCompleted = (data: { tag: string }) => {
    if (data.tag === this.waveTag) {
      this.isResolvedByWave = true;
    }
  };

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

    this.context.popupMessageSystem.displayMessage('✨ Cursed Cargo Detected! ✨', {
      color: '#00ffaa',
      duration: 3,
      font: '26px monospace',
      glow: true,
    });

    // Spawn the cursed cargo
    const CursedCargo: WaveDefinition = {
      spawnDistribution: 'at',
      atCoords: { x: this.options.x, y: this.options.y },
      duration: Infinity,
      mods: [],
      ships: [
        { shipId: 'incidents/cursed_cargo_00', count: 1 },
      ],
      formations: [],
    };
    spawnWave(this.waveTag + '-cargo', CursedCargo);
  }

  protected onPlayerEnterProximity(): void {
    if (this.hasSpawnedAmbush) return;

    spawnWave(this.waveTag, CursedWave);
    GlobalEventBus.on('wave:completed', this.handleWaveCompleted);
    this.hasSpawnedAmbush = true;

    this.context.popupMessageSystem.displayMessage('🚨 Ambush Incoming! 🚨', {
      color: '#ff3333',
      duration: 3,
      font: '26px monospace',
      glow: true,
    });
  }

  public update(dt: number): void {
    super.update(dt);
    this.elapsed += dt;

    if (this.elapsed >= this.nextLogTime) {
      this.nextLogTime = Math.ceil(this.elapsed);
    }
  }

  // Can be completed by time, or by wave completion
  public isComplete(): boolean {
    return this.elapsed >= this.lifetime || this.isResolvedByWave;
  }

  public onComplete(): void {
    // Spawn reward

    spawnCurrencyExplosion({
      x: this.options.x,
      y: this.options.y,
      currencyType: 'entropium',        // Your game's currency type
      totalAmount: 3000,             // Total currency to distribute
      pickupCount: 80,              // Number of pickup entities
      spreadRadius: 1100,           // Circular explosion radius
      randomizeAmount: true,        // Use varying amounts per pickup
    });

    spawnBlockExplosion({
      x: this.options.x,
      y: this.options.y,
      tier: 1,
      blockCount: 12,
      spreadRadius: 1100,
    });

    spawnBlockExplosion({
      x: this.options.x,
      y: this.options.y,
      tier: 2,
      blockCount: 4,
      spreadRadius: 1100,
    });

    spawnRepairExplosion({
      x: this.options.x,
      y: this.options.y,
      totalAmount: 300,
      pickupCount: 4,
      spreadRadius: 1100,
      randomizeAmount: true,
    });

    // Light effect
    createLightFlash(this.options.x, this.options.y, 1400, 1.0, 0.5, '#ffffff');

    clearWave(this.waveTag);
    clearWave(this.waveTag + '-cargo');
    GlobalEventBus.off('wave:completed', this.handleWaveCompleted);
    super.onComplete();
  }

  public destroy(): void {
    clearWave(this.waveTag);
    clearWave(this.waveTag + '-cargo');
    GlobalEventBus.off('wave:completed', this.handleWaveCompleted);
    super.destroy();
  }
}

const CursedWave: WaveDefinition = {
  spawnDistribution: 'aroundPlayerNear',
  duration: Infinity,
  mods: [],
  ships: [
    { shipId: 'wave_0_00', count: 2 },
    { shipId: 'wave_0_01', count: 2 },
    { shipId: 'wave_0_02', count: 2 },
  ],
  formations: [],
};
