// src/game/powerups/utils/resolveImmediatePowerups.ts
/*  Resolves “instant-effect” powerups that must mutate game state at the
 *  moment of acquisition (i.e. not handled by passive tick systems).
 */
import { PowerupRegistry }  from '@/game/powerups/registry/PowerupRegistry';
import { blockAffinityTree } from '@/game/powerups/registry/trees/blockAffinityTree';
import { PlayerResources }  from '@/game/player/PlayerResources';
import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
import { ShipRegistry }     from '@/game/ship/ShipRegistry';
import { getBlockType, getRandomBlockInTier, getNextTierBlock } from '@/game/blocks/BlockRegistry';
import { upgradeAffinityBlocksOnShip } from '@/game/blocks/helpers/upgradeUtils';

import type {
  GrantRandomBlocksEffect,
} from '@/game/powerups/types/PowerupMetadataTypes';

export function resolveImmediatePowerups(powerupId: string): void {
  const node = PowerupRegistry.get(powerupId);
  if (!node) return;

  /* ──────────────────────────────────────────────────────────── *
   *  A.  Resupply branch  (instant enqueue of random blocks)     *
   * ──────────────────────────────────────────────────────────── */
  if (node.category === 'resupply' && node.metadata?.grantRandomBlocks) {
    // grantRandomBlocks may be a single bundle or an array thereof.
    const bundles = Array.isArray(
      node.metadata.grantRandomBlocks,
    )
      ? (node.metadata.grantRandomBlocks as GrantRandomBlocksEffect[])
      : [node.metadata.grantRandomBlocks as GrantRandomBlocksEffect];

    bundles.forEach(({ tier, count }) => {
      for (let i = 0; i < count; i++) {
        const randomBlock = getRandomBlockInTier(tier);
        PlayerResources.getInstance().enqueueBlock(randomBlock);
      }
    });
    return; // Done – no fall-through into affinity logic.
  }

  /* ──────────────────────────────────────────────────────────── *
   *  B.  Block-Affinity branch (existing behaviour-unchanged)    *
   * ──────────────────────────────────────────────────────────── */
  const isBlockAffinity =
    blockAffinityTree.some(n => n.id === node.id) ||
    node.category === 'block-affinity';

  if (!isBlockAffinity || !node.metadata) return;

  const ship = ShipRegistry.getInstance().getPlayerShip();
  if (!ship) {
    console.warn('[resolveImmediatePowerups] Player ship not found.');
    return;
  }

  const activeShipDef =
    PlayerShipCollection.getInstance().getActiveShip();
  const affinityBlocks =
    activeShipDef?.metaData?.weaponBlocks ?? [];
  const affinityTag =
    activeShipDef?.metaData?.affinity ?? '';

  if (affinityBlocks.length === 0) {
    console.warn(
      '[resolveImmediatePowerups] Active ship has no weaponBlocks metadata.',
    );
    return;
  }

  /* ─── Case A: Attach a single affinity block ─── */
  if (node.metadata.attachAffinityBlockTier) {
    const tier = node.metadata.attachAffinityBlockTier;
    const blockId = affinityBlocks[tier - 1];
    const blockType = getBlockType(blockId);
    if (!blockType) {
      console.warn(
        `[resolveImmediatePowerups] Unknown block type: ${blockId} (tier ${tier})`,
      );
      return;
    }
    PlayerResources.getInstance().enqueueBlockToFront(blockType);
    return;
  }

  /* ─── Case B: Upgrade existing affinity blocks ─── */
  if (node.metadata.upgradeAffinityBlocksByTier) {
    const delta = node.metadata.upgradeAffinityBlocksByTier;
    upgradeAffinityBlocksOnShip(ship, [affinityTag], delta);
  }
}