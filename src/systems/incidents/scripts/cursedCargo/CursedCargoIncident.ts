// src/systems/incidents/scripts/CursedCargoIncident.ts

import { BaseIncidentScript } from '@/systems/incidents/types/BaseIncidentScript';
import { v4 } from 'uuid';
import { spawnWave, clearWave } from '@/core/interfaces/events/WaveSpawnReporter';
import { GlobalEventBus } from '@/core/EventBus';
import { spawnCurrencyExplosion } from '@/systems/pickups/helpers/spawnCurrencyExplosion';
import { spawnBlockExplosion } from '@/systems/pickups/helpers/spawnBlockExplosion';
import { spawnRepairExplosion } from '@/systems/pickups/helpers/spawnRepairExplosion';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';

import type { WaveDefinition, WaveShipEntry } from '@/game/waves/types/WaveDefinition';

import type { IncidentRuntimeContext } from '@/systems/incidents/types/IncidentRuntimeContext';

export interface CursedCargoOptions {
  x: number;
  y: number;
  ships?: WaveShipEntry[];
  cursedCacheShip?: WaveShipEntry;
  rewardBlockTier?: number;
  rewardQuantityMultiplier?: number;
}

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

    const { x, y, cursedCacheShip } = this.options as CursedCargoOptions;

    const cargoShipEntry: WaveShipEntry = cursedCacheShip
      ? {
          ...cursedCacheShip,
          count: 1, // force count
          affixes: {
            ...cursedCacheShip.affixes,
            invulnerable: true, // override or insert
          },
        }
      : {
          shipId: 'incidents/cursed_cargo/cursed_cargo_00',
          count: 1,
          affixes: { invulnerable: true },
        };

    const CursedCargo: WaveDefinition = {
      spawnDistribution: 'at',
      atCoords: { x, y },
      duration: Infinity,
      mods: [],
      ships: [cargoShipEntry],
      formations: [],
    };

    spawnWave(this.waveTag + '-cargo', CursedCargo);
  }

  protected onPlayerEnterProximity(): void {
    if (this.hasSpawnedAmbush) return;

    const { x, y, ships } = this.options as CursedCargoOptions;

    const ambushShips: WaveShipEntry[] =
      Array.isArray(ships) && ships.length > 0
        ? ships
        : [
            { shipId: 'wave_0_00', count: 2 },
            { shipId: 'wave_0_01', count: 2 },
            { shipId: 'wave_0_02', count: 2 },
          ];

    const AmbushWave: WaveDefinition = {
      spawnDistribution: 'at',
      atCoords: { x: x, y: y, spreadRadius: 1000 },
      duration: Infinity,
      mods: [],
      ships: ambushShips,
      formations: [],
    };

    spawnWave(this.waveTag, AmbushWave);
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
    const { x, y, rewardBlockTier = 1, rewardQuantityMultiplier = 1 } = this.options as CursedCargoOptions;

    spawnCurrencyExplosion({
      x: x,
      y: y,
      currencyType: 'entropium',
      totalAmount: 3000,
      pickupCount: 40 * rewardQuantityMultiplier,
      spreadRadius: 1100,
      randomizeAmount: true,
    });

    spawnBlockExplosion({
      x: x,
      y: y,
      tier: rewardBlockTier,
      blockCount: 10 * rewardQuantityMultiplier,
      spreadRadius: 1100,
    });

    spawnRepairExplosion({
      x: x,
      y: y,
      totalAmount: 300,
      pickupCount: 4 * rewardQuantityMultiplier,
      spreadRadius: 1100,
      randomizeAmount: true,
    });

    createLightFlash(x, y, 1400, 1.0, 0.5, '#ffffff');

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
