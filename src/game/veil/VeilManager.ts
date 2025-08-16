// src/game/veil/VeilManager.ts

import type { Ship } from '@/game/ship/Ship';
import type { CloudRegion } from '@/game/veil/interfaces/CloudRegion';
import type { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';

// import { reportTitle } from '@/core/interfaces/events/TitleReporter';
import { openPowerupMenu } from '@/core/interfaces/events/MenuOpenReporter';
import { applyWarmCinematicEffect, applyBossCinematicEffect } from '@/core/interfaces/events/PostProcessingEffectReporter';
import { emitHugeShockwave } from '@/core/interfaces/events/SpecialFxReporter';
import { shakeCamera } from '@/core/interfaces/events/CameraReporter';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { audioManager } from '@/audio/Audio';

import { CloudManager } from '@/game/veil/CloudManager';
import { VeilShipMutator } from '@/game/veil/VeilShipMutator';
import { ShipFactory } from '@/game/ship/factories/ShipFactory';

import { VeilBossFactory } from '@/game/veil/factories/VeilBossFactory';
import { VeilBossController } from '@/game/veil/VeilBossController';

const POWERUP_DELAY_SECONDS = 1.5;
const MAX_TIER = 5;

export class VeilManager {
  private readonly cloudManager: CloudManager;
  private readonly shipMutator: VeilShipMutator;
  private readonly bossController: VeilBossController;

  private bossKillCount: number = 0;

  private delayedPowerupMenuTime: number = 0;
  private pendingPowerupMenu: boolean = false;

  private readonly regions: CloudRegion[];
  private readonly processedRegions = new Set<string>(); // Tracks regions where boss decision is already made

  private bossPostFightHandled: boolean = false;

  constructor(
    private readonly playerShip: Ship,
    shipBuilderEffects: ShipBuilderEffectsSystem,
    cloudRegions: CloudRegion[] | null | undefined,
    shipFactory: ShipFactory
  ) {
    this.regions = cloudRegions ?? [];

    this.cloudManager = new CloudManager(playerShip, this.regions, 1);

    const mutationOptions =
      this.regions.length > 0 && this.regions[0]?.mutationOptions
        ? this.regions[0].mutationOptions
        : {};

    this.shipMutator = new VeilShipMutator(
      this.cloudManager,
      playerShip,
      shipBuilderEffects,
      mutationOptions
    );

    const bossFactory = new VeilBossFactory(shipFactory);
    this.bossController = new VeilBossController(bossFactory);
  }

  public update(dt: number): void {
    this.cloudManager.update(dt);
    this.shipMutator.update(dt);
    this.bossController.update(dt);

    this.checkBossSpawnConditions();

    // ─── Retreat Handling ────────────────────────────────
    if (
      this.bossController.isBossAlive() &&
      !this.cloudManager.isShipInCloud()
    ) {
      const regionId = this.bossController.getBossRegionId();
      if (regionId) {
        this.bossController.clearBoss();
        applyWarmCinematicEffect();
        this.cloudManager.removeRegionById(regionId);
        this.processedRegions.add(regionId);

        // Block reward logic for this boss instance
        this.bossPostFightHandled = false;
        return;
      }
    }

    // ─── Powerup Menu Delay ──────────────────────────────
    if (this.pendingPowerupMenu) {
      this.delayedPowerupMenuTime -= dt;
      if (this.delayedPowerupMenuTime <= 0) {
        this.pendingPowerupMenu = false;
        openPowerupMenu('veil');
      }
    }

    // ─── Boss Defeat Effects ─────────────────────────────
    if (
      !this.bossPostFightHandled &&
      this.cloudManager.isShipInCloud() &&
      !this.bossController.isBossAlive() &&
      this.bossController.isBossDestroyed()
    ) {
      this.bossPostFightHandled = true;

      applyWarmCinematicEffect();

      this.bossKillCount++;

      this.delayedPowerupMenuTime = POWERUP_DELAY_SECONDS;
      this.pendingPowerupMenu = true;

      this.shipMutator.regenerateBlockTypeRing(Math.min(this.bossKillCount, MAX_TIER));

      const playerPos = this.playerShip.getTransform().position;
      emitHugeShockwave(playerPos.x, playerPos.y);

      // reportTitle('VEIL CLEARED', '', 3.8, 0.55, 'center', '#ff00ffff');

      const regionId = this.bossController.getBossRegionId();
      if (regionId) {
        this.cloudManager.removeRegionById(regionId);
        this.bossController.clearBoss();
        this.processedRegions.add(regionId);
      }
    }
  }

  private async checkBossSpawnConditions(): Promise<void> {
    if (this.bossController.isBossAlive()) return;

    const currentRegion = this.cloudManager.getCurrentRegion();
    if (!currentRegion?.bossOptions) return;

    const regionId = currentRegion.id;
    if (this.processedRegions.has(regionId)) return;

    const killCount = this.shipMutator.getKillsInRegion(regionId);
    const killThreshold = currentRegion.mutationOptions?.mutatedShipKillLimit ?? 0;

    if (killThreshold > 0 && killCount >= killThreshold) {
      const chance = currentRegion.bossOptions.spawnChance ?? 1.0;
      const shouldSpawn = Math.random() <= chance;

      this.processedRegions.add(regionId);

      if (shouldSpawn) {
        const playerPos = this.playerShip.getTransform?.().position;
        if (!playerPos) return;

        this.bossPostFightHandled = false; // reset for this boss

        applyBossCinematicEffect();
        shakeCamera(12, 1, 12, 'boss:spawn');
        createLightFlash(playerPos.x, playerPos.y, 2600, 2.0, 0.5, '#ff3211');
        audioManager.play('assets/sounds/sfx/magic/megasub.wav', 'sfx');
        audioManager.play('assets/sounds/sfx/magic/creature_00.wav', 'sfx');

        await this.bossController.spawnBoss(
          currentRegion.bossOptions,
          { x: currentRegion.center.x, y: currentRegion.center.y },
          regionId,
          this.bossKillCount
        );
      } else {
        this.cloudManager.removeRegionById(regionId);
      }
    }
  }

  public isPlayerInVeil(): boolean {
    return this.cloudManager.isShipInCloud();
  }

  public getRegionCoords(): readonly { x: number; y: number; radius: number }[] {
    return this.cloudManager.getRegionCoords();
  }

  public isBossDestroyed(): boolean {
    return this.bossController.isBossDestroyed();
  }

  public getBossShip(): Ship | null {
    return this.bossController.getBossShip();
  }

  public getAllRegionKillCounts(): { regionId: string; kills: number }[] {
    return this.regions.map(r => ({
      regionId: r.id,
      kills: this.shipMutator.getKillsInRegion(r.id)
    }));
  }

  public getRegionPlayerIsIn(): string | null {
    return this.cloudManager.getCurrentRegionId();
  }
}
