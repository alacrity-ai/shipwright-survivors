// src/systems/incidents/scripts/cursedCargo/CursedCargoIncident.ts

import { BaseIncidentScript } from '@/systems/incidents/types/BaseIncidentScript';
import { spawnWave, clearWave } from '@/core/interfaces/events/WaveSpawnReporter';
import { GlobalEventBus } from '@/core/EventBus';
import { spawnCurrencyExplosion } from '@/systems/pickups/helpers/spawnCurrencyExplosion';
import { spawnBlockExplosion } from '@/systems/pickups/helpers/spawnBlockExplosion';
import { spawnRepairExplosion } from '@/systems/pickups/helpers/spawnRepairExplosion';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { randomIntFromRange } from '@/shared/mathUtils';

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
  private timedOut = false;

  private readonly ownedWaveTags: Set<string> = new Set();
  private hasSpawnedAmbush = false;
  private ambushTag: string | null = null;

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

    const { x, y, cursedCacheShip } = this.options as CursedCargoOptions;

    this.context.popupMessageSystem.displayMessage('✨ Cursed Cargo Detected! ✨', {
      color: '#00ffaa',
      duration: 5,
      font: '26px monospace',
      glow: true,
    });

    const cargoWaveTag = this.generateWaveTag('cargo');
    this.ownedWaveTags.add(cargoWaveTag);

    const cargoShipEntry: WaveShipEntry = cursedCacheShip
      ? {
          ...cursedCacheShip,
          count: 1,
          affixes: {
            ...cursedCacheShip.affixes,
            invulnerable: true,
          },
        }
      : {
          shipId: 'incidents/cursed_cargo/cursed_cargo_00',
          count: 1,
          affixes: { invulnerable: true },
        };

    const wave: WaveDefinition = {
      spawnDistribution: 'at',
      atCoords: { x, y },
      duration: Infinity,
      ships: [cargoShipEntry],
      mods: [],
      formations: [],
    };

    spawnWave(cargoWaveTag, wave);
  }

  protected onPlayerEnterProximity(): void {
    if (this.hasSpawnedAmbush) return;

    const { x, y, ships } = this.options as CursedCargoOptions;

    const ambushShips: WaveShipEntry[] = ships?.length
      ? ships
      : [
          { shipId: 'wave_0_00', count: 2 },
          { shipId: 'wave_0_01', count: 2 },
          { shipId: 'wave_0_02', count: 2 },
        ];

    this.ambushTag = this.generateWaveTag('ambush');
    this.ownedWaveTags.add(this.ambushTag);

    const ambushWave: WaveDefinition = {
      spawnDistribution: 'at',
      atCoords: { x, y, spreadRadius: 1000 },
      duration: Infinity,
      ships: ambushShips,
      mods: [],
      formations: [],
    };

    spawnWave(this.ambushTag, ambushWave);
    GlobalEventBus.on('wave:completed', this.handleWaveCompleted);
    this.hasSpawnedAmbush = true;

    this.context.popupMessageSystem.displayMessage('🚨 Ambush Incoming! 🚨', {
      color: '#ff3333',
      duration: 5,
      font: '26px monospace',
      glow: true,
    });
  }

  private readonly handleWaveCompleted = (data: { tag: string }) => {
    if (this.ownedWaveTags.has(data.tag)) {
      this.ownedWaveTags.delete(data.tag);
    } 
  };

  protected override onUpdate(dt: number): void {
    this.elapsed += dt;

    if (this.elapsed >= this.nextLogTime) {
      this.nextLogTime = Math.ceil(this.elapsed);
    }
  }

  public override isComplete(): boolean {
    const timeExceeded = this.elapsed >= this.lifetime;
    const ambushCleared = this.hasSpawnedAmbush && this.ambushTag !== null && !this.ownedWaveTags.has(this.ambushTag);

    if (timeExceeded && !ambushCleared) {
      this.timedOut = true;
    }

    return timeExceeded || ambushCleared;
  }

  public override onComplete(): void {
    const successful = !this.timedOut;

    if (successful) {
      const { x, y, rewardBlockTier = 1, rewardQuantityMultiplier = 1 } = this.options as CursedCargoOptions;

      spawnCurrencyExplosion({
        x,
        y,
        currencyType: 'entropium',
        totalAmount: 1000,
        pickupCount: randomIntFromRange(10, 25) * rewardQuantityMultiplier,
        spreadRadius: 1100,
        randomizeAmount: true,
      });

      spawnBlockExplosion({
        x,
        y,
        tier: rewardBlockTier,
        blockCount: randomIntFromRange(2, 4) * rewardQuantityMultiplier,
        spreadRadius: 1100,
      });

      spawnRepairExplosion({
        x,
        y,
        totalAmount: 300,
        pickupCount: randomIntFromRange(2, 4) * rewardQuantityMultiplier,
        spreadRadius: 1100,
        randomizeAmount: true,
      });

      createLightFlash(x, y, 1400, 1.0, 0.5, '#ffffff');
    }

    for (const tag of this.ownedWaveTags) {
      clearWave(tag);
    }

    GlobalEventBus.off('wave:completed', this.handleWaveCompleted);
    super.onComplete(successful);
  }

  public destroy(): void {
    for (const tag of this.ownedWaveTags) {
      clearWave(tag);
    }

    GlobalEventBus.off('wave:completed', this.handleWaveCompleted);
    super.destroy();
  }
}
