// src/game/veil/VeilShipMutator.ts

import { Ship } from '@/game/ship/Ship';
import { CloudManager } from '@/game/veil/CloudManager';
import { getRandomBlockInTier } from '@/game/blocks/BlockRegistry';
import { ShipGrid } from '@/game/ship/ShipGrid';
import { autoPlaceBlock } from '@/systems/autoplacement/autoPlaceUtils';

import type { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';
import type { BlockType } from '@/game/interfaces/types/BlockType';

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
  remainingBlocks: BlockType[];
  elapsed: number; // Time accumulator to throttle per-block mutation
}

export class VeilShipMutator {
  private readonly shipGrid: ShipGrid;
  private readonly mutatingShips: Map<Ship, MutationJob> = new Map();
  private mutateCooldown: number = MUTATE_INTERVAL_SECONDS;

  private readonly scratchCandidates: Ship[] = [];
  private readonly scratchBlockTypes: BlockType[] = [];

  private readonly blockTypeRing: BlockType[] = new Array(BLOCK_TYPE_RING_SIZE);
  private blockTypeCursor: number = 0;

  constructor(
    private readonly cloudManager: CloudManager,
    private readonly playerShip: Ship,
    private readonly shipBuilderEffects: ShipBuilderEffectsSystem
  ) {
    this.shipGrid = ShipGrid.getInstance();
    this.seedBlockTypeRing();
  }

  private seedBlockTypeRing(): void {
    for (let i = 0; i < BLOCK_TYPE_RING_SIZE; i++) {
      this.blockTypeRing[i] = getRandomBlockInTier(BLOCK_TIER);
    }
  }

  private getNextBlockType(): BlockType {
    const block = this.blockTypeRing[this.blockTypeCursor];
    this.blockTypeRing[this.blockTypeCursor] = getRandomBlockInTier(BLOCK_TIER); // recycle slot
    this.blockTypeCursor = (this.blockTypeCursor + 1) % BLOCK_TYPE_RING_SIZE;
    return block;
  }

  private getRandomBlockCount(): number {
    return (
      MINIMUM_RANDOM_BLOCKS +
      Math.floor(Math.random() * (MAXIMUM_RANDOM_BLOCKS - MINIMUM_RANDOM_BLOCKS + 1))
    );
  }

  public update(dt: number): void {
    this.mutateCooldown -= dt;
    if (this.mutateCooldown <= 0 && this.cloudManager.isShipInCloud()) {
      this.tryAddMutationTarget();
      this.mutateCooldown = MUTATE_INTERVAL_SECONDS;
    }

    for (const [ship, job] of this.mutatingShips.entries()) {
      job.elapsed += dt;
      const blocksToAdd = Math.floor(job.elapsed * BLOCKS_PER_SECOND);

      if (blocksToAdd > 0) {
        for (let i = 0; i < blocksToAdd && job.remainingBlocks.length > 0; i++) {
          const blockType = job.remainingBlocks.shift()!;
          autoPlaceBlock(ship, blockType, this.shipBuilderEffects);
        }
        job.elapsed -= blocksToAdd / BLOCKS_PER_SECOND;
      }

      if (job.remainingBlocks.length === 0) {
        this.mutatingShips.delete(ship);
      }
    }
  }

  private tryAddMutationTarget(): void {
    const playerPos = this.playerShip.getTransform().position;
    const { ships, count } = this.shipGrid.getShipsInRadius(
      playerPos.x,
      playerPos.y,
      FETCH_RADIUS,
      this.playerShip.getFaction()
    );

    this.scratchCandidates.length = 0;
    for (let i = 0; i < count; i++) {
      const ship = ships[i];

      if (
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

    const blockTypesForJob = this.scratchBlockTypes.slice();

    // Only mutate after selected
    selected.setMutated(true);
    selected.setBlockColor('#ff0000');

    this.mutatingShips.set(selected, {
      ship: selected,
      remainingBlocks: blockTypesForJob,
      elapsed: 0,
    });
  }

}
