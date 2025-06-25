// src/systems/incidents/scripts/dimensionalPortal/DimensionalPortalIncident.ts

import { BaseIncidentScript } from '@/systems/incidents/types/BaseIncidentScript';
import { spawnWave, clearWave } from '@/core/interfaces/events/WaveSpawnReporter';
import { GlobalEventBus } from '@/core/EventBus';
import { spawnCurrencyExplosion } from '@/systems/pickups/helpers/spawnCurrencyExplosion';
import { spawnBlockExplosion } from '@/systems/pickups/helpers/spawnBlockExplosion';
import { spawnRepairExplosion } from '@/systems/pickups/helpers/spawnRepairExplosion';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';

import type { WaveShipEntry, WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { IncidentRuntimeContext } from '@/systems/incidents/types/IncidentRuntimeContext';

export interface DimensionalPortalOptions {
  x: number;
  y: number;
  tiers: WaveShipEntry[][];
  maxDuration?: number;
}

export class DimensionalPortalIncident extends BaseIncidentScript {
  private baseDuration: number;
  private dynamicDuration: number;

  private elapsed = 0;
  private kills = 0;
  private currentTier = 0;
  private challengeStarted = false;

  private readonly ownedWaveTags: Set<string> = new Set();
  private readonly portalWaveTag: string;

  constructor(
    id: string,
    options: Record<string, any>,
    waveId: number | undefined,
    context: IncidentRuntimeContext
  ) {
    super(id, options, waveId, context);
    this.baseDuration = options.maxDuration ?? 30;
    this.dynamicDuration = this.baseDuration;
    this.portalWaveTag = this.generateWaveTag('node');
  }

  protected getMinimapIcon(): string | null {
    return 'purpleVortex';
  }

  public onTrigger(): void {
    super.onTrigger();
    const { x, y } = this.options as DimensionalPortalOptions;

    this.ownedWaveTags.add(this.portalWaveTag);

    spawnWave(this.portalWaveTag, {
      spawnDistribution: 'at',
      atCoords: { x, y },
      duration: Infinity,
      ships: [{
        shipId: 'incidents/dimensional_portal/portal_node',
        count: 1,
        affixes: { invulnerable: true },
      }],
      mods: [],
      formations: [],
    });

    this.context.popupMessageSystem.displayMessage('💫 Dimensional Portal Detected 💫', {
      color: '#aa66ff',
      duration: 3,
      font: '26px monospace',
      glow: true,
    });
  }

  protected onPlayerEnterProximity(): void {
    if (this.challengeStarted) return;
    this.challengeStarted = true;

    this.context.popupMessageSystem.displayMessage('🛑 Survive the Rift! 🛑\nDefeat as many as you can.', {
      color: '#ff66aa',
      duration: 3,
      font: '24px monospace',
      glow: true,
    });

    this.context.popupMessageSystem.setTimer(this.getMaxDuration());
    GlobalEventBus.on('wave:completed', this.handleWaveCompleted);
    this.spawnNextWave();
  }

  private handleWaveCompleted = (data: { tag: string }) => {
    if (!this.ownedWaveTags.has(data.tag)) {
      return;
    }

    this.ownedWaveTags.delete(data.tag);

    const prevTier = this.currentTier;
    this.kills++;

    const newTier = Math.floor(this.kills / 5);
    const bonusTime = newTier > prevTier ? 5 : 1;

    this.extendTimer(bonusTime);
    this.currentTier = newTier;

    this.context.popupMessageSystem.displayMessage(`⏱ +${bonusTime}s`, {
      color: '#ffff99',
      duration: 2,
      font: '20px monospace',
      glow: true,
    });

    if (this.elapsed < this.getMaxDuration()) {
      this.spawnNextWave();
    }
  };

  private spawnNextWave(): void {
    const { x, y, tiers } = this.options as DimensionalPortalOptions;

    const tierIndex = Math.floor(this.kills / 5);
    const ships = tiers?.[tierIndex];

    if (!ships || ships.length === 0) {
      console.warn(`[DimensionalPortalIncident] No ships defined for tier ${tierIndex}`);
      return;
    }

    const tag = this.generateWaveTag(`wave-${this.kills}`);
    this.ownedWaveTags.add(tag);

    const wave: WaveDefinition = {
      spawnDistribution: 'at',
      atCoords: { x, y, spreadRadius: 1000 },
      duration: Infinity,
      ships,
      mods: [],
      formations: [],
    };

    spawnWave(tag, wave);
  }

  protected override onUpdate(dt: number): void {
    if (!this.challengeStarted) return;

    this.elapsed += dt;

    const remaining = Math.max(0, this.getMaxDuration() - this.elapsed);
    this.context.popupMessageSystem.setTimer(remaining);

    // No need to call onComplete() — orchestrator will invoke it
  }

  public override isComplete(): boolean {
    return this.elapsed >= this.getMaxDuration();
  }

  public override onComplete(): void {
    const { x, y } = this.options as DimensionalPortalOptions;

    spawnCurrencyExplosion({
      x,
      y,
      currencyType: 'entropium',
      totalAmount: 100 * this.kills,
      pickupCount: 5 * this.kills,
      spreadRadius: 1000,
      randomizeAmount: true,
    });

    spawnBlockExplosion({
      x,
      y,
      tier: 1 + Math.floor(this.kills / 10),
      blockCount: Math.floor(this.kills / 5),
      spreadRadius: 1000,
    });

    spawnRepairExplosion({
      x,
      y,
      totalAmount: 300,
      pickupCount: 5,
      spreadRadius: 1000,
    });

    createLightFlash(x, y, 1400, 1.0, 0.5, '#ffffff');

    for (const tag of this.ownedWaveTags) {
      clearWave(tag);
    }

    GlobalEventBus.off('wave:completed', this.handleWaveCompleted);
    this.context.popupMessageSystem.clearTimer();
    super.onComplete();
  }

  public destroy(): void {
    for (const tag of this.ownedWaveTags) {
      clearWave(tag);
    }

    GlobalEventBus.off('wave:completed', this.handleWaveCompleted);
    this.context.popupMessageSystem.clearTimer();
    super.destroy();
  }

  // === Helpers ===
  private getMaxDuration(): number {
    return this.dynamicDuration;
  }

  private extendTimer(seconds: number): void {
    this.dynamicDuration += seconds;
  }
}
