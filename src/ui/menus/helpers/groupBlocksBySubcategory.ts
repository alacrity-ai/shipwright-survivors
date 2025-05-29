// src/ui/menus/helpers/groupBlocksBySubcategory.ts

import type { BlockType } from '@/game/interfaces/types/BlockType';

export function groupBlocksBySubcategory(blocks: BlockType[]): Map<string, BlockType[]> {
  const groups = new Map<string, BlockType[]>();

  for (const block of blocks) {
    const groupKey =
      block.subcategory?.toLowerCase() ??
      block.id.match(/^[a-z]+/)?.[0] ??
      'default';

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(block);
  }

  return groups;
}
