// src/game/ship/artifacts/ui/ArtifactTooltipRenderer.ts

import { CanvasManager } from '@/core/CanvasManager';
import { drawLabel } from '@/ui/primitives/UILabel';
import { getArtifactById } from '@/game/ship/artifacts/registry/ArtifactRegistry';
import { DEFAULT_CONFIG } from '@/config/ui';
import { getRarityColor } from '@/game/ship/artifacts/helpers/getRarityColor';
import { PlayerArtifactsManager } from '@/game/player/PlayerArtifactsManager';

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
    equippedOnShipName: string | null
  ): void {
    const ctx = this.canvasManager.getContext('overlay');
    if (!ctx) return;

    const artifact = getArtifactById(artifactId);
    if (!artifact) return;

    const {
      name,
      description,
      rarity,
      metadata
    } = artifact;

    const { blackColor, infoTextColor, accentColor, statColor } = DEFAULT_CONFIG.general;

    uiScale *= 0.75;

    const metadataEntries = Object.entries(metadata);

    // === Pre-calculate wrapped lines ===
    ctx.save();
    ctx.font = BODY_FONT;
    const descriptionLines = this.wrapText(ctx, description, MAX_WIDTH - BOX_PADDING * 2);
    ctx.restore();

    // === Compute dynamic height ===
    const nameLineCount = 1;
    const wrappedLineCount = descriptionLines.length;
    const wrappedHeight =
      (wrappedLineCount - 1) * WRAPPED_LINE_SPACING + LINE_SPACING;

    const metadataLineCount = metadataEntries.length;

    let totalHeight =
      nameLineCount * LINE_SPACING +
      wrappedHeight +
      metadataLineCount * LINE_SPACING;

    if (equippedOnShipName) {
      totalHeight += LINE_SPACING; // extra room for equipped warning
    }

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
    drawLabel(ctx, labelX, currentY, name, {
      font: NAME_FONT,
      color: getRarityColor(rarity),
      glow: true,
    }, uiScale);

    currentY += LINE_SPACING * uiScale;

    // Description (wrapped, with reduced spacing)
    for (let i = 0; i < descriptionLines.length; i++) {
      drawLabel(ctx, labelX, currentY, descriptionLines[i], {
        font: BODY_FONT,
        color: infoTextColor,
      }, uiScale);
      currentY += (i === descriptionLines.length - 1 ? LINE_SPACING : WRAPPED_LINE_SPACING) * uiScale;
    }

    // Metadata
    for (const [key, value] of metadataEntries) {
      const label = `${this.formatLabel(key)}: ${this.formatValue(value)}`;
      drawLabel(ctx, labelX, currentY, label, {
        font: BODY_FONT,
        color: statColor,
      }, uiScale);
      currentY += LINE_SPACING * uiScale;
    }

    // Equipped warning line
    if (equippedOnShipName) {
      drawLabel(ctx, labelX, currentY, `Equipped on "${equippedOnShipName}"`, {
        font: BODY_FONT,
        color: '#C7A45B',
      }, uiScale);
      currentY += LINE_SPACING * uiScale;
    }
  }

  renderLockedTooltip(
    anchorX: number,
    anchorY: number,
    uiScale: number,
    position: 'left' | 'right' = 'right'
  ): void {
    const ctx = this.canvasManager.getContext('overlay');
    if (!ctx) return;

    const { blackColor, accentColor, infoTextColor } = DEFAULT_CONFIG.general;

    uiScale *= 0.75;

    const mysteryName = '????';
    const mysteryDescription = 'This artifact has not yet been discovered.';
    const descriptionLines = this.wrapText(ctx, mysteryDescription, MAX_WIDTH - BOX_PADDING * 2);

    const wrappedLineCount = descriptionLines.length;
    const wrappedHeight =
      (wrappedLineCount - 1) * WRAPPED_LINE_SPACING + LINE_SPACING;

    const totalHeight = LINE_SPACING + wrappedHeight;
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

    drawLabel(ctx, labelX, currentY, mysteryName, {
      font: NAME_FONT,
      color: '#888888',
      glow: false,
    }, uiScale);

    currentY += LINE_SPACING * uiScale;

    for (let i = 0; i < descriptionLines.length; i++) {
      drawLabel(ctx, labelX, currentY, descriptionLines[i], {
        font: BODY_FONT,
        color: infoTextColor,
      }, uiScale);
      currentY += (i === descriptionLines.length - 1 ? LINE_SPACING : WRAPPED_LINE_SPACING) * uiScale;
    }
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const { width } = ctx.measureText(testLine);
      if (width > maxWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines;
  }

  private formatLabel(key: string): string {
    const map: Record<string, string> = {
      maxHealthBonus: 'Max HP',
      cockpitArmorBonus: 'Cockpit Armor',
      energyRegenRate: 'Energy Regen',
      entropiumPickupBonus: 'Entropium Bonus',
      reviveOnDeath: 'Auto-Revive',
      heatSeekersTargetNearest: 'Heat Seeker Targeting',
      alwaysSuperPulse: 'Super Pulse Always',
      startingBlocks: 'Starting Blocks',
      chanceToReflectTurretProjectiles: 'Turret Reflect Chance',
      solarCapacitorSpecial: 'Solar Explosion',
    };
    return map[key] ?? key;
  }

  private formatValue(value: unknown): string {
    if (typeof value === 'boolean') {
      return value ? '✓' : '✗';
    }

    if (typeof value === 'number') {
      // Integers remain as-is
      if (Number.isInteger(value)) {
        return `${value}`;
      }

      // Render decimals as percentages (e.g., 0.15 → "15%")
      const percentage = (value * 100).toFixed(1).replace(/\.0$/, '');
      return `${percentage}%`;
    }

    if (Array.isArray(value)) {
      return `[${value.join(', ')}]`;
    }

    return String(value);
  }
}
