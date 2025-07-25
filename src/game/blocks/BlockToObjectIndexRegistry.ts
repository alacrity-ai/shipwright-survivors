// src/game/blocks/BlockToObjectIndexRegistry.ts
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';

// Map SOA block index → owning CompositeBlockObject
const indexMap = new Map<number, CompositeBlockObject>();

export const BlockToObjectIndex = {
  /**
   * Registers a mapping from a BlockStore index to its owning CompositeBlockObject.
   */
  registerBlock(idx: number, parent: CompositeBlockObject) {
    indexMap.set(idx, parent);
  },

  /**
   * Removes a block index mapping.
   */
  unregisterBlock(idx: number) {
    indexMap.delete(idx);
  },

  /**
   * Resolves the CompositeBlockObject for a given BlockStore index.
   */
  getObject(idx: number): CompositeBlockObject | undefined {
    return indexMap.get(idx);
  },

  clear() {
    indexMap.clear();
  },

  size(): number {
    return indexMap.size;
  }
};
