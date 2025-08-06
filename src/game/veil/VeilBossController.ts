// src/game/veil/VeilBossController.ts

import type { Ship } from '@/game/ship/Ship';
import type { BossOptions } from '@/game/veil/interfaces/BossOptions';
import type { VeilBossFactory, VeilBossSpawnContext } from '@/game/veil/factories/VeilBossFactory';

import { bulkUpgradeBlockIndicesOnShip } from '@/game/blocks/helpers/upgradeUtils';

/**
 * Orchestrates the lifecycle of a single veil boss instance.
 * Handles spawning, tracking alive/dead state, and cleanup.
 */
export class VeilBossController {
  private bossShip: Ship | null = null;
  private bossDestroyed: boolean = false;
  private currentRegionId: string | null = null;

  constructor(private readonly bossFactory: VeilBossFactory) {}

  /**
   * Spawns the veil boss at the specified position.
   * If a boss is already active, this will overwrite it.
   */
  public async spawnBoss(
    bossOptions: BossOptions,
    position: { x: number; y: number },
    regionId: string,
    blockTierUpgrade: number = 0
  ): Promise<Ship> {
    // Destroy/cleanup any existing boss before spawning a new one
    this.clearBoss();

    const context: VeilBossSpawnContext = { bossOptions, position };
    const ship = await this.bossFactory.create(context);

    this.bossShip = ship;
    this.bossDestroyed = false;
    this.currentRegionId = regionId;

    // Set Auralight to big bigger
    ship.updateAuraLight('#ff0000', 1000, 1.8);

    // Upgrade ship blocks
    if (blockTierUpgrade > 0) {
      bulkUpgradeBlockIndicesOnShip(ship, ship.getAllBlockIndices(), blockTierUpgrade);
    }

    // Listen for destruction
    ship.onDestroyedCallback(() => {
      this.bossDestroyed = true;
      this.bossShip = null;
    });

    return ship;
  }

  /**
   * Returns true if the boss is currently active and alive.
   */
  public isBossAlive(): boolean {
    return !!this.bossShip && !this.bossDestroyed;
  }

  /**
   * Returns true if the last spawned boss has been destroyed.
   */
  public isBossDestroyed(): boolean {
    return this.bossDestroyed;
  }

  /**
   * Gets the active boss ship instance, if any.
   */
  public getBossShip(): Ship | null {
    return this.bossShip;
  }

  /**
   * Gets the region ID in which the current boss was spawned.
   */
  public getBossRegionId(): string | null {
    return this.currentRegionId;
  }

  /**
   * Removes any references to the current boss.
   * Does not force-destroy the ship; intended for cleanup after despawn or death.
   */
  public clearBoss(): void {
    this.bossShip = null;
    this.bossDestroyed = false;
    this.currentRegionId = null;
  }
}
