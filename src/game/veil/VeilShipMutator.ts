// src/game/veil/VeilShipMutator.ts

import { Ship } from '@/game/ship/Ship';
import { CloudManager } from '@/game/veil/CloudManager';
import { getRandomBlockInTier } from '@/game/blocks/BlockRegistry';
import { ShipGrid } from '@/game/ship/ShipGrid';
import { autoPlaceBlock } from '@/systems/autoplacement/autoPlaceUtils';

import type { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';
import type { BlockType } from '@/game/interfaces/types/BlockType';
import type { MutationOptions } from '@/game/veil/interfaces/MutationOptions';

const FETCH_RADIUS = 3200;
const MINIMUM_RANDOM_BLOCKS = 5;
const MAXIMUM_RANDOM_BLOCKS = 25;
const BLOCK_TIER = 0;
const MUTATE_INTERVAL_SECONDS = 10;
const BLOCKS_PER_SECOND = 7;
const BLOCK_TYPE_RING_SIZE = 128;
const SHIP_SIZE_LIMIT = 50;

interface MutationJob {
  ship: Ship;
  regionId: string;            // Cloud region where this ship was mutated
  remainingBlocks: BlockType[];
  elapsed: number;             // Time accumulator to throttle per-block mutation
  mutationComplete: boolean;   // NEW — set true when all blocks placed
}

export class VeilShipMutator {
  private readonly shipGrid: ShipGrid;
  private readonly mutatingShips: Map<Ship, MutationJob> = new Map();
  private readonly regionKillTally: Map<string, number> = new Map();

  private mutateCooldown: number = MUTATE_INTERVAL_SECONDS;

  private readonly scratchCandidates: Ship[] = [];
  private readonly scratchBlockTypes: BlockType[] = [];

  private readonly blockTypeRing: BlockType[] = new Array(BLOCK_TYPE_RING_SIZE);
  private blockTypeCursor: number = 0;

  private mutateShips: boolean = false;

  constructor(
    private readonly cloudManager: CloudManager,
    private readonly playerShip: Ship,
    private readonly shipBuilderEffects: ShipBuilderEffectsSystem,
    private readonly mutationOptions: MutationOptions
  ) {
    this.shipGrid = ShipGrid.getInstance();
    this.seedBlockTypeRing();
    this.mutateShips = this.mutationOptions.mutateShips ?? false;
  }

  private seedBlockTypeRing(): void {
    const tier = this.mutationOptions.mutationBlockTier ?? BLOCK_TIER;
    for (let i = 0; i < BLOCK_TYPE_RING_SIZE; i++) {
      this.blockTypeRing[i] = getRandomBlockInTier(tier);
    }
  }

  private getNextBlockType(): BlockType {
    const block = this.blockTypeRing[this.blockTypeCursor];
    this.blockTypeRing[this.blockTypeCursor] =
      getRandomBlockInTier(this.mutationOptions.mutationBlockTier ?? BLOCK_TIER);
    this.blockTypeCursor = (this.blockTypeCursor + 1) % BLOCK_TYPE_RING_SIZE;
    return block;
  }

  private getRandomBlockCount(): number {
    const [min, max] =
      this.mutationOptions.mutationBlockCount ?? [MINIMUM_RANDOM_BLOCKS, MAXIMUM_RANDOM_BLOCKS];
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  public update(dt: number): void {
    if (!this.mutateShips) return;
    this.mutateCooldown -= dt;

    if (this.mutateCooldown <= 0 && this.cloudManager.isShipInCloud()) {
      this.tryAddMutationTarget();
      this.mutateCooldown =
        this.mutationOptions.mutationIntervalSeconds ?? MUTATE_INTERVAL_SECONDS;
    }

    for (const job of this.mutatingShips.values()) {
      if (job.mutationComplete) {
        // No more blocks to place, just wait for destruction
        continue;
      }

      job.elapsed += dt;
      const blocksToAdd = Math.floor(job.elapsed * BLOCKS_PER_SECOND);

      if (blocksToAdd > 0) {
        for (let i = 0; i < blocksToAdd && job.remainingBlocks.length > 0; i++) {
          const blockType = job.remainingBlocks.shift()!;
          autoPlaceBlock(job.ship, blockType, this.shipBuilderEffects);
        }
        job.elapsed -= blocksToAdd / BLOCKS_PER_SECOND;
      }

      if (job.remainingBlocks.length === 0) {
        job.mutationComplete = true; // mark complete, do NOT remove from map
      }
    }
  }

  private tryAddMutationTarget(): void {
    const playerTransform = this.playerShip.getTransform?.();
    if (!playerTransform) return;

    const regionId = this.cloudManager.getCurrentRegionId();
    if (!regionId) return; // Only mutate if actually in a cloud region

    const { x, y } = playerTransform.position;
    const { ships, count } = this.shipGrid.getShipsInRadius(
      x,
      y,
      FETCH_RADIUS,
      this.playerShip.getFaction()
    );

    this.scratchCandidates.length = 0;

    for (let i = 0; i < count; i++) {
      const ship = ships[i];
      if (
        ship &&
        !ship.isDestroyed?.() &&
        !ship.isVeilMutated?.() &&
        !this.mutatingShips.has(ship) &&
        ship.getBlockCount() <= SHIP_SIZE_LIMIT
      ) {
        this.scratchCandidates.push(ship);
      }
    }

    if (this.scratchCandidates.length === 0) return;

    const selected =
      this.scratchCandidates[Math.floor(Math.random() * this.scratchCandidates.length)];
    const blockCount = this.getRandomBlockCount();

    this.scratchBlockTypes.length = 0;
    for (let i = 0; i < blockCount; i++) {
      this.scratchBlockTypes.push(this.getNextBlockType());
    }

    selected.setMutated?.(true);
    selected.setBlockColor?.('#ff0000');

    // Bind destruction listener to track kills per region
    selected.onDestroyedCallback((ship, cause) => {
      console.log(
        `[VeilShipMutator] Mutated ship destroyed (region=${regionId}, cause=${cause})`
      );
      const job = this.mutatingShips.get(ship);
      if (!job) {
        console.warn('[VeilShipMutator] Destroyed ship not found in mutatingShips map');
        return;
      }
      const prev = this.regionKillTally.get(job.regionId) || 0;
      this.regionKillTally.set(job.regionId, prev + 1);
      console.log(
        `[VeilShipMutator] Kill count for region ${job.regionId}: ${prev + 1}`
      );
      this.mutatingShips.delete(ship);
    });

    this.mutatingShips.set(selected, {
      ship: selected,
      regionId,
      remainingBlocks: this.scratchBlockTypes.slice(),
      elapsed: 0,
      mutationComplete: false
    });
  }

  // === Public API ===

  /** Get the region ID for a currently mutated ship, or null if not mutated */
  public getRegionForMutatedShip(ship: Ship): string | null {
    const job = this.mutatingShips.get(ship);
    return job ? job.regionId : null;
  }

  /** Get how many mutated ships have been destroyed in the given region */
  public getKillsInRegion(regionId: string): number {
    return this.regionKillTally.get(regionId) || 0;
  }
}
