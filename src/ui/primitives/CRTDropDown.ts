// src/ui/primitives/CRTDropDown.ts

import { brightenColor } from '@/shared/colorUtils';
import { drawLabel } from '@/ui/primitives/UILabel';

export interface CRTDropDownItem {
  value: string;
  label: string;
}

export interface CRTDropDown {
  x: number;
  y: number;
  width: number;
  height: number;
  items: CRTDropDownItem[];
  selectedIndex: number;
  isOpen: boolean;
  isHovered?: boolean;
  hoverIndex?: number;
  onSelect?: (item: CRTDropDownItem) => void;

  style?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    font?: string;
    glow?: boolean;
    chromaticAberration?: boolean;
    alpha?: number;
  };
}

/**
 * Draws a CRT-style dropdown menu, optionally expanded.
 *
 * @param ctx - Canvas rendering context
 * @param dropdown - Dropdown config
 * @param uiScale - UI scaling factor (default = 1.0)
 * @param label - Optional label to the right of the dropdown
 */
export function drawCRTDropDown(
  ctx: CanvasRenderingContext2D,
  dropdown: CRTDropDown,
  uiScale: number = 1.0,
  label?: string
): void {
  const {
    x, y, width, height,
    items, selectedIndex, isOpen,
    hoverIndex, isHovered,
    style = {},
  } = dropdown;

  const {
    backgroundColor = '#001100',
    borderColor = '#00ff41',
    textColor = '#00ff41',
    font = '13px "Courier New", monospace',
    glow = true,
    chromaticAberration = true,
    alpha = 1.0,
  } = style;

  // === Scaled Dimensions (but not position) ===
  const scaledWidth = width * uiScale;
  const scaledHeight = height * uiScale;
  const scaledFont = font.replace(/(\d+)(px)/, (_, sz, unit) =>
    `${Math.round(parseInt(sz) * uiScale)}${unit}`
  );

  const aberrationOffset = 0.5 * uiScale;
  const effectiveBorderColor = isHovered ? brightenColor(borderColor, 0.8) : borderColor;
  const effectiveTextColor = isHovered ? brightenColor(textColor, 0.8) : textColor;

  // === Main Box ===
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(x, y, scaledWidth, scaledHeight);

  if (glow) {
    ctx.shadowColor = effectiveBorderColor;
    ctx.shadowBlur = 8 * uiScale;
  }

  ctx.strokeStyle = effectiveBorderColor;
  ctx.lineWidth = 2 * uiScale;
  ctx.strokeRect(x, y, scaledWidth, scaledHeight);
  ctx.restore();

  // === Selected Label ===
  const labelX = x + 6 * uiScale;
  const labelY = y + scaledHeight / 2;
  const currentItem = items[selectedIndex];

  ctx.save();
  ctx.font = scaledFont;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  if (glow) {
    ctx.shadowColor = effectiveTextColor;
    ctx.shadowBlur = 4 * uiScale;
  }

  if (chromaticAberration) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff0000';
    ctx.fillText(currentItem.label, labelX - aberrationOffset, labelY);
    ctx.fillStyle = '#0000ff';
    ctx.fillText(currentItem.label, labelX + aberrationOffset, labelY);
    ctx.restore();
  }

  ctx.globalAlpha = 1.0;
  ctx.fillStyle = effectiveTextColor;
  ctx.fillText(currentItem.label, labelX, labelY);
  ctx.restore();

  // === Right-Aligned Label ===
  if (label) {
    drawLabel(ctx, x + scaledWidth + 12, y + scaledHeight / 2, label, {
      font: scaledFont,
      color: '#ccc',
      align: 'left',
    });
  }

  // === Expanded Items ===
  if (isOpen) {
    const itemHeight = scaledHeight;

    items.forEach((item, index) => {
      const itemY = y + scaledHeight + index * itemHeight;
      const isHoveredItem = hoverIndex === index;

      const bgColor = isHoveredItem
        ? brightenColor(backgroundColor, 0.2)
        : backgroundColor;
      const txtColor = isHoveredItem
        ? brightenColor(textColor, 0.8)
        : textColor;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = bgColor;
      ctx.fillRect(x, itemY, scaledWidth, itemHeight);

      if (glow) {
        ctx.shadowColor = borderColor;
        ctx.shadowBlur = 6 * uiScale;
      }

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1 * uiScale;
      ctx.strokeRect(x, itemY, scaledWidth, itemHeight);

      ctx.font = scaledFont;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      const itemLabelY = itemY + itemHeight / 2;

      if (chromaticAberration) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff0000';
        ctx.fillText(item.label, labelX - aberrationOffset, itemLabelY);
        ctx.fillStyle = '#0000ff';
        ctx.fillText(item.label, labelX + aberrationOffset, itemLabelY);
        ctx.restore();
      }

      ctx.globalAlpha = 1.0;
      ctx.fillStyle = txtColor;
      ctx.fillText(item.label, labelX, itemLabelY);
      ctx.restore();
    });
  }
}
