// src/game/veil/VeilBossController.ts

import type { Ship } from '@/game/ship/Ship';
import type { BossOptions } from '@/game/veil/interfaces/BossOptions';
import type { VeilBossFactory, VeilBossSpawnContext } from '@/game/veil/factories/VeilBossFactory';

import { destroyEntityExternally } from '@/core/interfaces/events/EntityReporter';
import { DestructionCause } from '@/game/ship/CompositeBlockDestructionService';
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

    // Set ship invulnerable
    ship.makeInvulnerable();

    // Buff block durability based on blockTierUpgrade
    const durabilityMultiplier = 1 + 0.3 * blockTierUpgrade;
    const thrustPowerMultiplier = 1 + 0.3 * blockTierUpgrade;
    ship.setAffixes({ blockDurabilityMulti: durabilityMultiplier, thrustPowerMulti: thrustPowerMultiplier });

    // Upgrade ship blocks
    if (blockTierUpgrade > 0) {
      bulkUpgradeBlockIndicesOnShip(ship, ship.getAllBlockIndices(), blockTierUpgrade);
    }

    // Listen for destruction
    ship.onDestroyedCallback((ship, cause) => {
      if (cause !== 'replaced') {
        this.bossDestroyed = true;
      }
    });

    return ship;
  }

  public update(dt: number): void {
    // If boss exists and is invulnerable, check if construction is done
    if (this.bossShip && this.bossShip.isConstructed()) {
      this.bossShip.removeInvulnerability();
    }
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
    if (this.bossShip) {
      destroyEntityExternally(this.bossShip, 'replaced');
    }

    this.bossShip = null;
    this.bossDestroyed = false;
    this.currentRegionId = null;
  }
}
