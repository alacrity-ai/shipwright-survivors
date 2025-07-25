// src/game/blocks/blockVisuals.ts
import { getDamageLevel, getBlockAtlasUVOffset } from '@/rendering/cache/BlockSpriteCache';
import { BlockStore } from '@/game/blocks/system/BlockStore';

/**
 * Recomputes UVs for a single block based on its current HP.
 * Assumes `armor` and `atlasKey` were pre-populated when the block was created.
 */
export function updateUV(blockStore: BlockStore, idx: number): void {
  if (!blockStore.isAllocated(idx)) return;

  const hp = blockStore.hp[idx];
  const armor = blockStore.armor[idx];        // cached at creation
  const atlasKey = blockStore.atlasKey[idx];  // typically == typeIndex

  const damageLevel = getDamageLevel(hp, armor);
  const { baseUV, overlayUV } = getBlockAtlasUVOffset(atlasKey, damageLevel);

  blockStore.uvBaseX[idx] = baseUV[0];
  blockStore.uvBaseY[idx] = baseUV[1];
  blockStore.uvOverlayX[idx] = overlayUV?.[0] ?? -1;
  blockStore.uvOverlayY[idx] = overlayUV?.[1] ?? -1;
}
