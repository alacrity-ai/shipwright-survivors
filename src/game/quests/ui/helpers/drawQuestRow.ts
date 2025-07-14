// src/game/quests/ui/helpers/drawQuestRow.ts
// ─────────────────────────────────────────────────────────────────────────────
//  drawQuestRow
//  • Renders a stylized row for a given quest, including icon, name,
//    description, reward text, and a checkbox. Adds hovered visual affordance.
// ─────────────────────────────────────────────────────────────────────────────

import type { Quest } from '@/game/quests/interfaces/Quest';
import { drawLabel }  from '@/ui/primitives/UILabel';

/* ────────────────────────────────────────────────────────────────────────
 *  Typings
 * ──────────────────────────────────────────────────────────────────── */
export interface DrawQuestRowParams {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  width: number;
  quest: Quest;
  icon: HTMLImageElement | HTMLCanvasElement;
  tracked: boolean;
  hovered: boolean;
  scale: number;
  height?: number;
}

/* ────────────────────────────────────────────────────────────────────────
 *  Constants (unscaled)
 * ──────────────────────────────────────────────────────────────────── */
const BORDER_RADIUS     = 8;
const BORDER_STROKE     = 2;
const ICON_SIDE         = 48;
const CHECKBOX_SIDE     = 20;
const H_PADDING         = 12;
const V_PADDING         = 8;
const COL_GAP           = 12;
const NAME_FONT_SIZE    = 16;
const DESC_FONT_SIZE    = 12;
const REWARD_FONT_SIZE  = 12;

export const QUEST_ROW_BASE_HEIGHT = 64;   // 48px icon + 8px * 2 vertical padding

/* ────────────────────────────────────────────────────────────────────────
 *  Public API
 * ──────────────────────────────────────────────────────────────────── */
export function drawQuestRow(p: DrawQuestRowParams): number {
  const {
    ctx,
    x, y,
    width,
    quest,
    icon,
    tracked,
    hovered,
    scale,
  } = p;

  const borderStroke = BORDER_STROKE * scale;
  const iconSide     = ICON_SIDE * scale;
  const checkboxSide = CHECKBOX_SIDE * scale;
  const hPad         = H_PADDING * scale;
  const vPad         = V_PADDING * scale;
  const colGap       = COL_GAP  * scale;

  const textBlockH   = NAME_FONT_SIZE * scale + DESC_FONT_SIZE * scale + 4 * scale;
  const rowH         = p.height ?? Math.max(iconSide, textBlockH) + vPad * 2;

  const innerX       = x + borderStroke;
  const innerY       = y + borderStroke;
  const innerW       = width - borderStroke * 2;
  const innerH       = rowH - borderStroke * 2;

  const iconColW     = iconSide;
  const checkboxColW = checkboxSide;
  const rewardColW   = 160 * scale;
  const textColW     = innerW - iconColW - rewardColW - checkboxColW - colGap * 3;

  /* ──────────────────────────────────────
   *  Visual styling depending on state
   * ────────────────────────────────────── */
  const borderColor = hovered
    ? '#ffffff'
    : tracked
      ? '#00ffff'
      : '#666';

  const backgroundColor = hovered
    ? 'rgba(32, 64, 64, 0.65)'
    : tracked
      ? 'rgba(0, 64, 64, 0.45)'
      : 'rgba(16, 16, 16, 0.45)';

  const textGlow = hovered ? true : false;

  const checkboxBorderColor = hovered ? '#ffffff' : '#ccc';
  const checkboxFillColor   = '#00ffff';

  /* ──────────────────────────────────────
   *  Rendering pass
   * ────────────────────────────────────── */
  ctx.save();

  /* Border & background */
  ctx.lineWidth = borderStroke;
  ctx.strokeStyle = borderColor;
  ctx.fillStyle   = backgroundColor;
  ctx.beginPath();
  ctx.roundRect(x, y, width, rowH, BORDER_RADIUS * scale);
  ctx.fill();
  ctx.stroke();

  /* Icon */
  {
    const ix = innerX + hPad;
    const iy = innerY + (innerH - iconSide) / 2;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(icon, ix, iy, iconSide, iconSide);
  }

  /* Quest name & description */
  {
    const tx = innerX + hPad + iconColW + colGap;
    const ty = innerY + vPad;

    drawLabel(ctx, tx, ty,
      quest.name,
      {
        font: `${NAME_FONT_SIZE * scale}px monospace`,
        align: 'left',
        glow: textGlow,
      });

    drawLabel(ctx, tx, ty + NAME_FONT_SIZE * scale + 4 * scale,
      quest.description,
      {
        font: `${DESC_FONT_SIZE * scale}px monospace`,
        align: 'left',
        glow: false,
        alpha: 0.8,
      });
  }

  /* Reward blurb */
  if (quest.rewards.length > 0) {
    const rewardOffset = 60 * scale;
    const reward = quest.rewards[0].blurb ?? '';
    const rx = innerX + hPad + iconColW + colGap + textColW - rewardOffset;
    const ry = innerY + (innerH - REWARD_FONT_SIZE * scale) / 2;

    drawLabel(ctx, rx, ry,
      reward,
      {
        font: `${REWARD_FONT_SIZE * scale}px monospace`,
        align: 'left',
        glow: textGlow,
      });
  }

  /* Checkbox */
  {
    const cbX = x + width - checkboxSide - hPad;
    const cbY = innerY + (innerH - checkboxSide) / 2;

    ctx.lineWidth   = borderStroke;
    ctx.strokeStyle = checkboxBorderColor;
    ctx.strokeRect(cbX, cbY, checkboxSide, checkboxSide);

    if (tracked) {
      ctx.fillStyle = checkboxFillColor;
      ctx.fillRect(
        cbX + 4 * scale,
        cbY + 4 * scale,
        checkboxSide - 8 * scale,
        checkboxSide - 8 * scale,
      );
    }
  }

  ctx.restore();
  return rowH;
}
