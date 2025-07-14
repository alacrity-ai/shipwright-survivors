// ──────────────────────────────────────────────────────────────────────────
//  @/game/quests/cache/QuestIconCache.ts
//  • Declarative mapping → “quest-icon-key” ⟶ HTMLImageElement
//  • Leverages the central `loadImage` helper, which auto-caches results.
//  • Guarantees type-safety via `as const` literal keys.
// ──────────────────────────────────────────────────────────────────────────

import { loadImage }   from '@/shared/imageCache';
import { getAssetPath } from '@/shared/assetHelpers';

/**
 * Authoritative list of quest-icon keys → relative asset paths.
 * Add new entries here when you drop PNGs into `assets/quests/`.
 */
const ICON_PATHS = {
  // Tutorial / Mission 1
  quest_rollblocks      : 'assets/quests/mission01Quests/quest_rollblocks.png',
  quest_combineblocks   : 'assets/quests/mission01Quests/quest_combineblocks.png',
  quest_jumpcast         : 'assets/quests/mission01Quests/quest_jumpcast.png',
  quest_stationslayer    : 'assets/quests/mission01Quests/quest_stationslayer.png',
  quest_cursedcargo      : 'assets/quests/mission01Quests/quest_cursedcargo.png',

  // …add additional quest icons below…
} as const;

/** Literal union of every registered icon-key. */
export type QuestIconKey = keyof typeof ICON_PATHS;

/** Runtime cache: icon-key → resolved, *loaded* HTMLImageElement. */
const resolvedIcons = new Map<QuestIconKey, HTMLImageElement>();

/**
 * Resolves (and lazily loads) the sprite for the requested quest icon.
 *
 * ```ts
 * const img = await resolveQuestIconSprite('quest_first_flight');
 * ctx.drawImage(img, x, y);
 * ```
 *
 * @throws  Error if the key is unknown or if the image fails to load.
 */
export async function resolveQuestIconSprite(key: QuestIconKey): Promise<HTMLImageElement> {
  // ↑ Key-level caching avoids a second Map lookup inside loadImage.
  if (resolvedIcons.has(key)) {
    return resolvedIcons.get(key)!;
  }

  const relPath = ICON_PATHS[key];
  if (!relPath) {
    throw new Error(`[QuestIconCache] Unknown icon key: ${key}`);
  }

  const img = await loadImage(getAssetPath(relPath));
  resolvedIcons.set(key, img);
  return img;
}

/* Usage Pattern:
import { resolveQuestIconSprite } from '@/game/quests/cache/QuestIconCache';

async function drawQuestIcon(ctx: CanvasRenderingContext2D, key: QuestIconKey, x: number, y: number) {
  const sprite = await resolveQuestIconSprite(key);
  ctx.drawImage(sprite, x, y);
}
*/