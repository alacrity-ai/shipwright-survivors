// src/scenes/ship_selection/components/ShipTooltipRenderer.ts

import { CanvasManager } from '@/core/CanvasManager';
import { drawLabel } from '@/ui/primitives/UILabel';

import type { CollectableShipDefinition } from '@/game/ship/interfaces/CollectableShipDefinition';
import { DEFAULT_CONFIG } from '@/config/ui';

const BOX_PADDING = 24;
const LINE_SPACING = 32;
const MAX_WIDTH = 480;

const SCALE_ADJUSTMENT = 0.75;

export class ShipTooltipRenderer {
  private canvasManager: CanvasManager;

  constructor() {
    this.canvasManager = CanvasManager.getInstance();
  }

  renderTooltip(
    ship: CollectableShipDefinition,
    anchorX: number,
    anchorY: number,
    uiScale: number
  ): void {
    uiScale *= SCALE_ADJUSTMENT;
    const ctx = this.canvasManager.getContext('overlay');
    if (!ctx) return;

    const { blackColor, infoTextColor, accentColor, statColor } = DEFAULT_CONFIG.general;

    const meta = ship.metaData;
    if (!meta) return;

    const contentLineCount =
      1 + // name
      (meta.additionalDescription ? 1 : 0) +
      (meta.offenseRating != null ? 1 : 0) +
      (meta.defenseRating != null ? 1 : 0) +
      (meta.speedRating != null ? 1 : 0) +
      (meta.weaponSpecialization ? 1 : 0);

    const boxWidth = MAX_WIDTH * uiScale;
    const boxHeight =
      (contentLineCount * LINE_SPACING + BOX_PADDING * 2) * uiScale;

    const boxX = anchorX + 64 * uiScale; // 32px padding from the cursor/tile
    const boxY = anchorY - boxHeight / 2;

    // === Background Box ===
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = blackColor;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 10 * uiScale);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // === Text ===
    let cursorY = boxY + BOX_PADDING * uiScale;
    const labelX = boxX + BOX_PADDING * uiScale;

    drawLabel(ctx, labelX, cursorY, ship.name, {
      font: `${24}px monospace`,
      color: accentColor,
      glow: true
    }, uiScale);

    cursorY += LINE_SPACING * uiScale;

    if (meta.additionalDescription) {
      drawLabel(ctx, labelX, cursorY, meta.additionalDescription, {
        font: `${18}px monospace`,
        color: infoTextColor
      }, uiScale);

      cursorY += LINE_SPACING * uiScale;
    }

    if (meta.offenseRating != null) {
      this.drawRating(ctx, labelX, cursorY, 'Offense', meta.offenseRating, '#ff4444', uiScale);
      cursorY += LINE_SPACING * uiScale;
    }

    if (meta.defenseRating != null) {
      this.drawRating(ctx, labelX, cursorY, 'Defense', meta.defenseRating, '#44aaff', uiScale);
      cursorY += LINE_SPACING * uiScale;
    }

    if (meta.speedRating != null) {
      this.drawRating(ctx, labelX, cursorY, 'Speed', meta.speedRating, '#ffff44', uiScale);
      cursorY += LINE_SPACING * uiScale;
    }

    if (meta.weaponSpecialization) {
      drawLabel(ctx, labelX, cursorY, `Specialty: ${meta.weaponSpecialization}`, {
        font: `${18}px monospace`,
        color: '#ff99ff'
      }, uiScale);
    }
  }

  private drawRating(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    label: string,
    value: number,
    color: string,
    uiScale: number
  ): void {
    const stars = '★'.repeat(value);
    drawLabel(ctx, x, y, `${label}: ${stars}`, {
      font: `${18}px monospace`,
      color
    }, uiScale);
  }
}
