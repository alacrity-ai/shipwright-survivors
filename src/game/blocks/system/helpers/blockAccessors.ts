import { BlockManager } from '@/game/blocks/system/BlockManager';

import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';


/**
 * Returns block indices on the **left side** (localX < 0) for the given ship.
 */
export function getLeftSideShipBlocks(shipId: number, typeFilter?: number): Uint32Array {
  return filterShipBlocks(shipId, (x, _y) => x < 0, typeFilter);
}

/**
 * Returns block indices on the **right side** (localX > 0) for the given ship.
 */
export function getRightSideShipBlocks(shipId: number, typeFilter?: number): Uint32Array {
  return filterShipBlocks(shipId, (x, _y) => x > 0, typeFilter);
}

/**
 * Returns block indices on the **front** (localY < 0) for the given ship.
 */
export function getFrontalShipBlocks(shipId: number, typeFilter?: number): Uint32Array {
  return filterShipBlocks(shipId, (_x, y) => y < 0, typeFilter);
}

/**
 * Returns block indices on the **rear** (localY > 0) for the given ship.
 */
export function getRearShipBlocks(shipId: number, typeFilter?: number): Uint32Array {
  return filterShipBlocks(shipId, (_x, y) => y > 0, typeFilter);
}

/** 
 * Returns all block indices for the given ship.
*/
export function getAllShipBlocks(shipId: number): Uint32Array {
  const orchestrator = BlockManager.getInstance().getBlockOrchestrator();
  const indices = orchestrator.getShipBlocks(shipId);
  return indices ?? new Uint32Array(0);
}

/**
 * Internal utility to filter a ship’s block indices by localX/localY predicates.
 */
function filterShipBlocks(
  shipId: number,
  predicate: (localX: number, localY: number) => boolean,
  typeFilter?: number
): Uint32Array {
  const orchestrator = BlockManager.getInstance().getBlockOrchestrator();
  const store = orchestrator['store']; // intentional access for raw data

  const indices = orchestrator.getShipBlocks(shipId);
  const count = indices?.length ?? 0;

  if (!indices) return new Uint32Array(0);

  const result = new Uint32Array(count);
  let resultCount = 0;

  for (let i = 0; i < count; i++) {
    const index = indices[i];
    if (!store.isAllocated(index)) continue;

    const x = store.localX[index];
    const y = store.localY[index];

    if (!predicate(x, y)) continue;
    if (typeFilter !== undefined && store.typeIndex[index] !== typeFilter) continue;

    result[resultCount++] = index;
  }

  return result.slice(0, resultCount);
}

/**
 * Boosts the light intensity and radius for all blocks in the given list by specified multipliers.
 *
 * @param blocks       - Block indices (e.g. from getLeftSideBlocks)
 * @param intensityMul - Multiplier for light intensity (e.g. 1.5 for +50%)
 * @param radiusMul    - Multiplier for light radius (e.g. 2.0 for doubling)
 */
export function boostBlockLights(
  blocks: Uint32Array,
  intensityMul: number,
  radiusMul: number
): void {
  const store = BlockManager.getInstance().getBlockStore();
  const lo = LightingOrchestrator.getInstance();
  const soa = lo.getLightSOA();
  const idToIndex = (lo as any)['idToIndex'] as Map<number, number>;

  for (let i = 0; i < blocks.length; i++) {
    const blockIndex = blocks[i];
    const lightId = store.lightId[blockIndex];
    if (lightId === -1) continue;

    const lightIndex = idToIndex.get(lightId);
    if (lightIndex == null) continue;

    lo.updateLight(lightId, {
      intensity: soa.intensity[lightIndex] * intensityMul,
      radius: soa.radius[lightIndex] * radiusMul,
    });
  }
}

/**
 * Restores light intensity and radius for all blocks using their initial values.
 */
export function restoreBlockLights(blocks: Uint32Array): void {
  const store = BlockManager.getInstance().getBlockStore();
  const lo = LightingOrchestrator.getInstance();

  for (let i = 0; i < blocks.length; i++) {
    const blockIndex = blocks[i];
    const lightId = store.lightId[blockIndex];
    if (lightId !== -1) {
      lo.turnOnLight(lightId);
    }
  }
}
