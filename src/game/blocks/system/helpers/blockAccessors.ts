// src/game/blocks/system/helpers/blockAccessors.ts

import { BlockManager } from '@/game/blocks/system/BlockManager';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';

const SCRATCH_LIGHT_IDS = new Uint32Array(512); // Adjustable size cap

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
 * Returns block indices belonging to a specific group on the given ship.
 *
 * @param shipId Ship ID
 * @param group  Group number (0–255)
 * @returns Uint32Array of block indices in the specified group
 */
export function getShipBlocksInGroup(shipId: number, group: number): Uint32Array {
  const orchestrator = BlockManager.getInstance().getBlockOrchestrator();
  return orchestrator.getShipBlocksInGroup(shipId, group);
}

/**
 * Returns block indices belonging to any of the specified groups on the given ship.
 *
 * @param shipId Ship ID
 * @param groups List of group numbers (0–255)
 * @returns Uint32Array of block indices in the specified groups
 */
export function getShipBlocksInGroups(shipId: number, groups: readonly number[] | Uint8Array): Uint32Array {
  const orchestrator = BlockManager.getInstance().getBlockOrchestrator();
  return orchestrator.getShipBlocksInGroups(shipId, groups);
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

  const animator = lo.getAnimator();
  const lightIds = getLightIdsForBlocks(blocks, SCRATCH_LIGHT_IDS);
  animator?.stopPulsingLights(getLightIdsForBlocks(blocks, lightIds));

  for (let i = 0; i < blocks.length; i++) {
    const blockIndex = blocks[i];
    const lightId = store.lightId[blockIndex];
    if (lightId !== -1) {
      lo.turnOnLight(lightId);
    }
  }
}

// Helpers for light manipulation via animation

/**
 * Resolves light IDs from a given set of block indices.
 * Skips blocks without lights (lightId === -1).
 *
 * @param blocks        - Block indices (assumed valid)
 * @param lightIdsOut   - Scratch buffer to write into (should be same size or larger)
 * @returns Subarray of lightIdsOut containing valid light IDs
 */
export function getLightIdsForBlocks(
  blocks: Uint32Array,
  lightIdsOut: Uint32Array
): Uint32Array {
  const store = BlockManager.getInstance().getBlockStore();
  let count = 0;

  for (let i = 0; i < blocks.length; i++) {
    const blockIndex = blocks[i];
    const lightId = store.lightId[blockIndex];
    if (lightId !== -1) {
      lightIdsOut[count++] = lightId;
    }
  }

  return lightIdsOut.subarray(0, count);
}


/**
 * Applies a fade animation to the lights associated with the given block indices.
 *
 * @param blocks       - Block indices (Uint32Array)
 * @param from         - Starting value (usually 0 for fade-in, or current for fade-out)
 * @param to           - Target value to fade to
 * @param duration     - Duration of fade in seconds
 * @param field        - 'intensity' or 'radius'
 */
export function fadeBlockLightsTo(
  blocks: Uint32Array,
  from: number,
  to: number,
  duration: number,
  field: 'intensity' | 'radius'
): void {
  const lo = LightingOrchestrator.getInstance();
  const animator = lo.getAnimator();
  if (!animator) return;

  const lightIds = getLightIdsForBlocks(blocks, SCRATCH_LIGHT_IDS);
  animator.fadeLights(lightIds, from, to, duration, field);
}



/**
 * Applies a pulsing animation to the lights associated with the given block indices.
 *
 * @param blocks    - Block indices (Uint32Array)
 * @param base      - Base value of the field (center of sine wave)
 * @param amplitude - Amplitude of the pulse
 * @param frequency - Frequency in Hz
 * @param field     - 'intensity' or 'radius'
 */
export function pulseBlockLights(
  blocks: Uint32Array,
  base: number,
  amplitude: number,
  frequency: number,
  field: 'intensity' | 'radius'
): void {
  const lo = LightingOrchestrator.getInstance();
  const animator = lo.getAnimator();
  if (!animator) return;

  const lightIds = getLightIdsForBlocks(blocks, SCRATCH_LIGHT_IDS);
  animator.pulseLights(lightIds, base, amplitude, frequency, field);
}
