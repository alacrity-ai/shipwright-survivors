// src/game/registries/BlockToObjectIndex.ts
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';

const map = new Map<BlockInstance, CompositeBlockObject>();

export const BlockToObjectIndex = {
  registerBlock(block: BlockInstance, parent: CompositeBlockObject) {
    map.set(block, parent);
  },

  unregisterBlock(block: BlockInstance) {
    map.delete(block);
  },

  getObject(block: BlockInstance): CompositeBlockObject | undefined {
    return map.get(block);
  },

  clear() {
    map.clear();
  },

  size(): number {
    return map.size;
  }
};
