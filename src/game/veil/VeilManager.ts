// src/game/veil/VeilManager.ts

import type { Ship } from '@/game/ship/Ship';
import type { CloudRegion } from '@/game/veil/interfaces/CloudRegion';
import type { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';

// import { reportTitle } from '@/core/interfaces/events/TitleReporter';
import { applyWarmCinematicEffect, applyBossCinematicEffect } from '@/core/interfaces/events/PostProcessingEffectReporter';
import { shakeCamera } from '@/core/interfaces/events/CameraReporter';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { audioManager } from '@/audio/Audio';

import { CloudManager } from '@/game/veil/CloudManager';
import { VeilShipMutator } from '@/game/veil/VeilShipMutator';
import { ShipFactory } from '@/game/ship/factories/ShipFactory';

import { VeilBossFactory } from '@/game/veil/factories/VeilBossFactory';
import { VeilBossController } from '@/game/veil/VeilBossController';

export class VeilManager {
  private readonly cloudManager: CloudManager;
  private readonly shipMutator: VeilShipMutator;
  private readonly bossController: VeilBossController;

  private bossKillCount: number = 0;

  private readonly regions: CloudRegion[];
  private readonly processedRegions = new Set<string>(); // Tracks regions where boss decision is already made

  constructor(
    private readonly playerShip: Ship,
    shipBuilderEffects: ShipBuilderEffectsSystem,
    cloudRegions: CloudRegion[] | null | undefined,
    shipFactory: ShipFactory
  ) {
    this.regions = cloudRegions ?? [];

    this.cloudManager = new CloudManager(playerShip, this.regions);

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

    this.checkBossSpawnConditions();

    // If a boss is alive and gets destroyed this frame, clear the region and mark processed
    if (
      !this.bossController.isBossAlive() &&
      this.bossController.isBossDestroyed()
    ) {
      // Restore shader
      applyWarmCinematicEffect();

      // Increment boss kill count
      this.bossKillCount++;

      // // Play Title
      // reportTitle('VEIL CLEARED', '', 3.8, 0.55, 'center', '#ff00ffff');
      
      const regionId = this.bossController.getBossRegionId();
      if (regionId) {
        this.cloudManager.removeRegionById(regionId);
        this.bossController.clearBoss();
        this.processedRegions.add(regionId); // Prevent re-spawn in this region
      }
    }
  }

  private async checkBossSpawnConditions(): Promise<void> {
    if (this.bossController.isBossAlive()) return;

    const currentRegion = this.cloudManager.getCurrentRegion();
    if (!currentRegion?.bossOptions) return;

    const regionId = currentRegion.id;
    if (this.processedRegions.has(regionId)) return; // Already processed this region

    const killCount = this.shipMutator.getKillsInRegion(regionId);
    const killThreshold = currentRegion.mutationOptions?.mutatedShipKillLimit ?? 0;

    if (killThreshold > 0 && killCount >= killThreshold) {
      const chance = currentRegion.bossOptions.spawnChance ?? 1.0;
      const shouldSpawn = Math.random() <= chance;

      // Mark processed regardless of spawn success
      this.processedRegions.add(regionId);

      if (shouldSpawn) {
        const playerPos = this.playerShip.getTransform?.().position;
        if (!playerPos) return;

        // Apply shader effect
        applyBossCinematicEffect();

        // Screenshake // Light Flash / Sound FX
        shakeCamera(12, 1, 12, 'boss:spawn');
        createLightFlash(playerPos.x, playerPos.y, 2600, 2.0, 0.5, '#ff3211');
        audioManager.play('assets/sounds/sfx/magic/megasub.wav', 'sfx');

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

  /**
   * Returns an array of { regionId, kills } for all current veil regions.
   * Useful for debugging overlays.
   */
  public getAllRegionKillCounts(): { regionId: string; kills: number }[] {
    const result: { regionId: string; kills: number }[] = [];
    for (let i = 0; i < this.regions.length; i++) {
      const id = this.regions[i].id;
      result.push({
        regionId: id,
        kills: this.shipMutator.getKillsInRegion(id)
      });
    }
    return result;
  }

  // Debug: Returns the region the player is currently in, or null if not in any.
  public getRegionPlayerIsIn(): string | null {
    return this.cloudManager.getCurrentRegionId();
  }
}
