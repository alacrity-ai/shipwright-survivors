// src/game/ship/artifacts/ui/ArtifactTooltipRenderer.ts

import { CanvasManager } from '@/core/CanvasManager';
import { drawLabel } from '@/ui/primitives/UILabel';
import { getArtifactById } from '@/game/ship/artifacts/registry/ArtifactRegistry';
import { DEFAULT_CONFIG } from '@/config/ui';
import { getRarityColor } from '@/game/ship/artifacts/helpers/getRarityColor';
import { formatLabel, formatValue } from '@/game/ship/artifacts/helpers/tooltipLabelHelpers';
import {
  drawRichWrappedText,
  measureRichTextHeight,
} from '../helpers/descriptionTextHelpers';

const BOX_PADDING = 24;
const LINE_SPACING = 36;
const WRAPPED_LINE_SPACING = LINE_SPACING * (2 / 3);
const MAX_WIDTH = 480;
const NAME_FONT_SIZE = 22;
const BODY_FONT_SIZE = 18;
const NAME_FONT = `${NAME_FONT_SIZE}px monospace`;
const BODY_FONT = `${BODY_FONT_SIZE}px monospace`;

export class ArtifactTooltipRenderer {
  private canvasManager: CanvasManager;

  constructor() {
    this.canvasManager = CanvasManager.getInstance();
  }

  renderTooltip(
    artifactId: string,
    anchorX: number,
    anchorY: number,
    uiScale: number,
    position: 'left' | 'right' = 'right',
    equippedOnShipName: string | null,
    locked: boolean = false
  ): void {
    const ctx = this.canvasManager.getContext('overlay');
    if (!ctx) return;

    const artifact = getArtifactById(artifactId);
    if (!artifact) return;

    const { name, description, rarity, metadata } = artifact;

    const {
      blackColor,
      infoTextColor,
      accentColor: baseAccentColor,
      statColor,
    } = DEFAULT_CONFIG.general;

    const accentColor = locked ? '#666666' : baseAccentColor;
    const dimmedTextColor = locked ? '#999999' : infoTextColor;
    const nameColor = getRarityColor(rarity);

    uiScale *= 0.75;

    const metadataEntries = Object.entries(metadata);

    // === Height Calculation ===
    const wrappedHeight = measureRichTextHeight(
      ctx,
      description,
      BODY_FONT,
      MAX_WIDTH - BOX_PADDING * 2,
      WRAPPED_LINE_SPACING
    );

    let totalHeight =
      LINE_SPACING + // name
      wrappedHeight +
      metadataEntries.length * LINE_SPACING;

    if (equippedOnShipName) totalHeight += LINE_SPACING;
    if (locked) totalHeight += LINE_SPACING;

    const boxWidth = MAX_WIDTH * uiScale;
    const boxHeight = (totalHeight + BOX_PADDING * 2) * uiScale;

    const boxX =
      position === 'left'
        ? anchorX - boxWidth - 80 * uiScale
        : anchorX + 80 * uiScale;

    const boxY = anchorY - boxHeight / 2;

    // === Background Box ===
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = blackColor;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 10 * uiScale);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // === Text Rendering ===
    let currentY = boxY + BOX_PADDING * uiScale;
    const labelX = boxX + BOX_PADDING * uiScale;

    // Name
    drawLabel(
      ctx,
      labelX,
      currentY,
      name,
      {
        font: NAME_FONT,
        color: nameColor,
        glow: !locked,
      },
      uiScale
    );

    currentY += LINE_SPACING * uiScale;

    // Description (wrapped, with rich color parsing)
    drawRichWrappedText(
      ctx,
      labelX,
      currentY,
      description,
      BODY_FONT,
      dimmedTextColor,
      MAX_WIDTH - BOX_PADDING * 2,
      WRAPPED_LINE_SPACING,
      uiScale
    );

    currentY += wrappedHeight * uiScale;

    // Metadata
    for (const [key, value] of metadataEntries) {
      const label = `${formatLabel(key)}: ${formatValue(value)}`;
      drawLabel(
        ctx,
        labelX,
        currentY,
        label,
        {
          font: BODY_FONT,
          color: statColor,
        },
        uiScale
      );
      currentY += LINE_SPACING * uiScale;
    }

    // Equipped warning
    if (equippedOnShipName) {
      drawLabel(
        ctx,
        labelX,
        currentY,
        `Equipped on "${equippedOnShipName}"`,
        {
          font: BODY_FONT,
          color: '#C7A45B',
        },
        uiScale
      );
      currentY += LINE_SPACING * uiScale;
    }

    // Locked warning
    if (locked) {
      drawLabel(
        ctx,
        labelX,
        currentY,
        `Not yet discovered`,
        {
          font: BODY_FONT,
          color: '#AAAAAA',
        },
        uiScale
      );
      currentY += LINE_SPACING * uiScale;
    }
  }
}
