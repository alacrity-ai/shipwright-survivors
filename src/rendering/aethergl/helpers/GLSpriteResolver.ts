// src/rendering/unified/helpers/GLSpriteResolver.ts

import {
  DamageLevel,
  getGL2BlockSprite,
} from '@/rendering/cache/BlockSpriteCache';

import { getBlockType } from '@/game/blocks/BlockRegistry';

import {
  AsteroidDamageLevel,
  getGL2AsteroidBlockSprite,
} from '@/rendering/cache/AsteroidSpriteCache';

import { getAsteroidBlockType } from '@/game/blocks/AsteroidBlockRegistry';

import type { GLBlockSprite } from '@/rendering/cache/BlockSpriteCache';
import type { GLAsteroidSprite } from '@/rendering/cache/AsteroidSpriteCache';

/**
 * Maps canonical ship damage levels to asteroid equivalents.
 * Light → Fractured
 * Moderate/Heavy → Crumbling
 * None → None
 */
function mapDamageLevelToAsteroid(level: DamageLevel): AsteroidDamageLevel {
  switch (level) {
    case DamageLevel.LIGHT:
      return AsteroidDamageLevel.FRACTURED;
    case DamageLevel.MODERATE:
    case DamageLevel.HEAVY:
      return AsteroidDamageLevel.CRUMBLING;
    case DamageLevel.NONE:
    default:
      return AsteroidDamageLevel.NONE;
  }
}

/**
 * Resolves a GL2 sprite for any known block type (ship or asteroid).
 * Dispatches to the correct cache and maps damage levels accordingly.
 * Throws if the typeId is not registered in either domain.
 */
export function getGL2BlockOrAsteroidSprite(
  typeId: string,
  damageLevel: DamageLevel
): GLBlockSprite | GLAsteroidSprite {
  const blockType = getBlockType(typeId);
  if (blockType) {
    return getGL2BlockSprite(blockType, damageLevel);
  }
  const asteroidType = getAsteroidBlockType(typeId);
  if (asteroidType) {
    return getGL2AsteroidBlockSprite(asteroidType, mapDamageLevelToAsteroid(damageLevel));
  }
  throw new Error(`Unrecognized block typeId: ${typeId}`);
}
