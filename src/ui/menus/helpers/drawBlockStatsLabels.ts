import { drawLabelLine } from '@/ui/utils/drawLabelLine';
import type { BlockType } from '@/game/interfaces/types/BlockType';

const IGNORED_KEYS = new Set([
  'type',
  'icon',
  'sprite',
  'id',
  'size',
  'canFire',
  'canThrust'
]);

const IGNORED_BEHAVIOR_PATHS = new Set([
  'fire.fireType',
  'fire.detonationDelayMs',
  'fire.lifetime',
  'fire.projectileSpeed',
  'haloBladeProperties.color',
  'haloBladeProperties.size'
]);

function isIgnoredBehaviorPath(path: string): boolean {
  return IGNORED_BEHAVIOR_PATHS.has(path);
}

export function drawBlockStatsLabels(
  ctx: CanvasRenderingContext2D,
  block: BlockType | null,
  startX: number,
  startY: number,
  maxWidth: number,
  scale: number
): number {
  if (!block) return startY;

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
  const formatValue = (val: unknown): string | number =>
    val === undefined ? '—' :
    typeof val === 'boolean' ? (val ? 'Yes' : 'No') :
    typeof val === 'number' || typeof val === 'string' ? val :
    String(val);

  let y = startY;

  y = drawLabelLine(ctx, startX, y, 'Armor', formatValue(block.armor), '#09f', maxWidth, scale);
  y = drawLabelLine(ctx, startX, y, 'Mass', formatValue(block.mass), '#999', maxWidth, scale);
  y = drawLabelLine(ctx, startX, y, 'Cost', formatValue(block.cost), '#6f6', maxWidth, scale);

  if (block.behavior) {
    for (const [key, val] of Object.entries(block.behavior)) {
      if (IGNORED_KEYS.has(key)) continue;

      if (val && typeof val === 'object' && !Array.isArray(val)) {
        let printedSectionHeader = false;

        for (const [subKey, subVal] of Object.entries(val)) {
          const fullPath = `${key}.${subKey}`;
          if (isIgnoredBehaviorPath(fullPath)) continue;

          if (!printedSectionHeader) {
            y = drawLabelLine(ctx, startX, y, capitalize(key), '', '#fc6', maxWidth, scale);
            printedSectionHeader = true;
          }

          const label = `• ${capitalize(subKey)}`;
          y = drawLabelLine(ctx, startX, y, label, formatValue(subVal), '#999', maxWidth, scale);
        }

      } else {
        const fullPath = key;
        if (isIgnoredBehaviorPath(fullPath)) continue;

        y = drawLabelLine(ctx, startX, y, capitalize(key), formatValue(val), '#fc6', maxWidth, scale);
      }
    }
  }

  return y;
}
