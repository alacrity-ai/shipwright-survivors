// src/ui/overlays/components/ButtonTooltip.ts

import { CanvasManager } from '@/core/CanvasManager';
import { DEFAULT_CONFIG } from '@/config/ui';
import { drawLabel } from '@/ui/primitives/UILabel';

const PADDING        = 12;           // px
const FONT_SIZE_PX   = 12;
const FONT_FAMILY    = 'monospace';
const FONT           = `${FONT_SIZE_PX}px ${FONT_FAMILY}`;
const BORDER_RADIUS  = 8;

export class UIButtonTooltipRenderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor() {
    const cm = CanvasManager.getInstance();
    const context = cm.getContext('overlay');
    if (!context) throw new Error('[UIButtonTooltipRenderer] overlay ctx unavailable');
    this.ctx = context;
  }

  /**
   * Paints a one-liner tooltip above the given anchor rectangle.
   *
   * @param text        Tooltip copy, e.g. `"Place Block (Q)"`
   * @param anchorX     Control’s X coordinate (world-space pixels)
   * @param anchorY     Control’s Y coordinate
   * @param anchorW     Control width
   * @param uiScale     Uniform UI scale factor
   */
  public render(
    text   : string,
    anchorX: number,
    anchorY: number,
    anchorW: number,
    uiScale: number,
    centered: boolean = false,
  ): void {
    // ---- early out (caller already checked hover) ------------------------
    if (!text) return;

    const { general } = DEFAULT_CONFIG;
    const bgColor  = general.blackColor;
    const stroke   = general.accentColor;
    const textCol  = general.infoTextColor;

    const scaledPad = PADDING * uiScale;

    // ---- text metrics ----------------------------------------------------
    const ctx = this.ctx;
    ctx.save();
    ctx.font = FONT;
    const textW = ctx.measureText(text).width;
    const boxW  = textW + scaledPad * 2;
    const boxH  = FONT_SIZE_PX + scaledPad * 2;

    // Center horizontally over the control; place 8 px above it.
    const boxX = anchorX + (anchorW - boxW) / 2;
    const boxY = anchorY - boxH - 8 * uiScale;

    // ---- background ------------------------------------------------------
    ctx.globalAlpha = 0.92;
    ctx.fillStyle   = bgColor;
    ctx.strokeStyle = stroke;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, BORDER_RADIUS * uiScale);
    ctx.fill();
    ctx.stroke();

    // ---- label -----------------------------------------------------------
    drawLabel(
      ctx,
      boxX + (scaledPad / 2),
      boxY + (scaledPad / 2),
      text,
      { font: FONT, color: textCol, align: centered ? 'center' : 'left' },
      uiScale,
    );
    ctx.restore();
  }
}
