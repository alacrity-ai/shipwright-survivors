// src/game/tradepost/TradePostItemsTooltipRenderer.ts

import { CanvasManager } from '@/core/CanvasManager';
import { drawLabel } from '@/ui/primitives/UILabel';
import { getBlockType } from '@/game/blocks/BlockRegistry';

const PADDING = 12;
const BOX_WIDTH = 240;
const BOX_HEIGHT = 40;

export class TradePostItemsTooltipRenderer {
  private readonly canvasManager: CanvasManager;

  constructor() {
    this.canvasManager = CanvasManager.getInstance();
  }

  /**
   * Renders a tooltip near the hovered card with the item name or ship ID.
   * @param ctx rendering context (optional override)
   * @param x screen-space anchor x
   * @param y screen-space anchor y
   * @param label the name to display
   * @param uiScale global UI scale
   */
  renderTooltip(x: number, y: number, label: string, uiScale: number): void {
    const ctx = this.canvasManager.getContext('overlay');
    if (!ctx || !label) return;

    const width = BOX_WIDTH * uiScale;
    const height = BOX_HEIGHT * uiScale;
    const boxX = x + 16 * uiScale;
    const boxY = y - height / 2;

    // === Tooltip Background ===
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#001100';
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, width, height, 8 * uiScale);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // === Label ===
    drawLabel(
      ctx,
      boxX + PADDING * uiScale,
      boxY + height / 2,
      label,
      {
        font: `${16}px monospace`,
        color: '#00ff00',
        align: 'left',
      },
      uiScale
    );
  }

  /** Utility for resolving block display names */
  getBlockName(id: string): string {
    return getBlockType(id)?.name ?? `[Unknown: ${id}]`;
  }
}
