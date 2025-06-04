// src/game/entities/utils/CompositeBlockObjectUtils.ts

import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import { CompositeBlockObjectRegistry } from '@/game/entities/registries/CompositeBlockObjectRegistry';

export function findObjectByBlock(block: BlockInstance): CompositeBlockObject | null {
  const registry = CompositeBlockObjectRegistry.getInstance();
  return registry.getById(block.ownerShipId) ?? null;
}

export function findBlockCoordinatesInObject(
  targetBlock: BlockInstance,
  object: CompositeBlockObject
): GridCoord | null {
  return object.getBlockCoord(targetBlock);
}
