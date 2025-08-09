// src/game/passives/ui/PassiveTreeTooltipRenderer.ts


import { CanvasManager } from '@/core/CanvasManager';
import type { PassiveNode } from '@/game/passives/interfaces/PassiveNode';
import { DEFAULT_CONFIG } from '@/config/ui';
import { drawLabel } from '@/ui/primitives/UILabel';

const BOX_PADDING = 24;
const LINE_SPACING = 40;
const MAX_WIDTH = 520; // logical, scaled by uiScale

export type PassiveTooltipViewModel = {
  node: PassiveNode;
  playerCores: number;
  unlocked: boolean;
  affordable: boolean;
  connectivityOk: boolean;
};

export class PassiveTreeTooltipRenderer {
  private readonly cm = CanvasManager.getInstance();

  // Scratch buffers to minimize GC
  private _wrappedLines: string[] = [];
  private _effectLines: string[] = [];

  renderTooltip(vm: PassiveTooltipViewModel, anchorX: number, anchorY: number, uiScale: number): void {
    const ctx = this.cm.getContext('overlay');
    if (!ctx) return;

    const { general } = DEFAULT_CONFIG;
    const {
      blackColor, infoTextColor, hoverColor, accentColor,
      warningColor, disabledColor, statColor,
    } = general;

    const { node, unlocked, affordable, connectivityOk, playerCores } = vm;
    const { name, description, cost, nodeSize, metadata } = node;

    // 1) Compose content
    const boxW = MAX_WIDTH * uiScale;

    this._wrappedLines.length = 0;
    this.wrapText(ctx, description, boxW - (BOX_PADDING * 2 * uiScale), `${18}px monospace`, uiScale, this._wrappedLines);

    this._effectLines.length = 0;
    this.buildEffectLines(metadata, this._effectLines);

    // Header(1) + size chip(1 same line) + desc(N) + state(1) + (cost(1) if !unlocked) + effects(M)
    const lineCount =
      1 + // header
      this._wrappedLines.length +
      1 + // state
      (unlocked ? 0 : 1) + // cost strip
      this._effectLines.length;

    const boxH = (lineCount * LINE_SPACING + BOX_PADDING * 2) * uiScale;

    // 2) Position (prefer left; flip if off-screen)
    let boxX = anchorX - boxW - 64 * uiScale;
    let boxY = anchorY - boxH / 2;

    const { width: cvW, height: cvH } = ctx.canvas;
    if (boxX < 8) boxX = anchorX + 64 * uiScale; // flip to right
    if (boxY < 8) boxY = 8;
    if (boxY + boxH > cvH - 8) boxY = cvH - 8 - boxH;

    // 3) Background
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = blackColor;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    (ctx as any).roundRect?.(boxX, boxY, boxW, boxH, 10 * uiScale);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 4) Text paint
    let y = boxY + BOX_PADDING * uiScale;
    const x = boxX + BOX_PADDING * uiScale;

    // Header: name + size chip color
    drawLabel(ctx, x, y, name, {
      font: `${24}px monospace`,
      color: nodeSize === 'major' ? '#cc66ff' : accentColor,
      glow: true,
    }, uiScale);
    y += LINE_SPACING * uiScale;

    // Description (wrapped)
    for (let i = 0; i < this._wrappedLines.length; i++) {
      drawLabel(ctx, x, y, this._wrappedLines[i], { font: `${15}px monospace`, color: infoTextColor }, uiScale);
      y += LINE_SPACING * uiScale;
    }

    // State line
    const stateText = this.composeStateText(unlocked, affordable, connectivityOk);
    const stateColor =
      unlocked ? accentColor :
      (connectivityOk ? (affordable ? hoverColor : disabledColor) : warningColor);

    drawLabel(ctx, x, y, stateText, { font: `${18}px monospace`, color: stateColor }, uiScale);
    y += LINE_SPACING * uiScale;

    // Cost strip (only if not unlocked)
    if (!unlocked) {
      const costColor = (connectivityOk && affordable) ? hoverColor : disabledColor;
      drawLabel(ctx, x, y, `Cost: ${cost} cores  |  You: ${playerCores}`, {
        font: `${18}px monospace`,
        color: costColor,
      }, uiScale);
      y += LINE_SPACING * uiScale;
    }

    // Effect table
    for (let i = 0; i < this._effectLines.length; i++) {
      drawLabel(ctx, x, y, this._effectLines[i], {
        font: `${18}px monospace`,
        color: statColor,
      }, uiScale);
      y += LINE_SPACING * uiScale;
    }
  }

  // === Internals ===

  private composeStateText(unlocked: boolean, affordable: boolean, connectivityOk: boolean): string {
    if (unlocked) return 'Unlocked ✓';
    if (!connectivityOk) return 'Locked — not connected';
    if (!affordable) return 'Locked — need more cores';
    return 'Unlockable';
  }

  private buildEffectLines(metadata: PassiveNode['metadata'], out: string[]): void {
    // Deterministic ordering (match PASSIVES.md groups)
    const order = [
      // Offense
      'damage',
      'fireRate',
      'criticalChance',
      'criticalMultiplier',
      'stunChance',
      'bossDamage',

      // Defense
      'armor',
      'mitigation',
      'ignoreDamageChance',

      // Movement
      'thrust',
      'turnPower',
      'explorer', // numeric % exploration speed bonus

      // Utility
      'entropiumPickupBonus',
      'blockDropRate',
      'harvestRange',
      'attachTierUpChance',
      'rareItemTradepostChance',
      'voidIntensity',

      // Ability
      'abilityCooldown',
      'abilityPower',

      // Incidents
      'incidentSpawnChance',

      // Capstones (booleans)
      'slayer',
      'voidwalker',
      'atronach',
      'incidentInvestigator',
      'builder',
      'trademaster',
      'bossMastery',
    ];

    for (const key of order) {
      const v = (metadata as any)[key];
      if (v == null) continue;
      out.push(`${this.friendlyLabel(key)}: ${this.formatValue(key, v)}`);
    }

    // Any additional, non-ordered keys: append deterministically by key name
    const known = new Set(order);
    const extras = Object.keys(metadata).filter(k => !known.has(k)).sort();
    for (const key of extras) {
      const v = (metadata as any)[key];
      if (v == null) continue;
      out.push(`${this.friendlyLabel(key)}: ${this.formatValue(key, v)}`);
    }
  }

  private formatValue(key: string, value: unknown): string {
    if (typeof value === 'boolean') return value ? '✓' : '—';
    if (typeof value === 'number') {
      // Treat most values as percents when 0..1 (per PASSIVES.md semantics)
      if (value >= 0 && value < 1) return `${Math.round(value * 100)}%`;
      return Number.isInteger(value) ? String(value) : value.toFixed(2);
    }
    if (Array.isArray(value)) return `[${value.join(', ')}]`;
    return String(value);
  }

  private friendlyLabel(key: string): string {
    const map: Record<string, string> = {
      // Offense
      damage: 'Damage',
      fireRate: 'Fire Rate',
      criticalChance: 'Critical Chance',
      criticalMultiplier: 'Critical Damage Multiplier',
      stunChance: 'Stun Chance',
      bossDamage: 'Boss Damage',

      // Defense
      armor: 'Armor',
      mitigation: 'Mitigation',
      ignoreDamageChance: 'Ignore Damage Chance',

      // Movement
      thrust: 'Thrust',
      turnPower: 'Turn Power',
      explorer: 'Exploration Speed',

      // Utility
      entropiumPickupBonus: 'Entropium Bonus',
      blockDropRate: 'Block Drop Rate',
      harvestRange: 'Harvest Range',
      attachTierUpChance: 'Attach Tier-Up Chance',
      rareItemTradepostChance: 'Rare Tradepost Item Chance',
      voidIntensity: 'Void Intensity',

      // Ability
      abilityCooldown: 'Ability Cooldown Reduction',
      abilityPower: 'Ability Power',

      // Incidents
      incidentSpawnChance: 'Incident Spawn Chance',

      // Capstones
      slayer: 'Slayer',
      voidwalker: 'Voidwalker',
      atronach: 'Atronach',
      incidentInvestigator: 'Incident Investigator',
      builder: 'Builder',
      trademaster: 'Trademaster',
      bossMastery: 'Boss Mastery',
    };

    return map[key] ?? this.humanizeKey(key);
  }

  private humanizeKey(k: string): string {
    return k
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/^./, c => c.toUpperCase());
  }

  // Simple greedy wrapper using Canvas measureText; keeps your UILabel font semantics.
  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidthPx: number,
    font: string,
    uiScale: number,
    outLines: string[]
  ): void {
    // Set font on context so measureText uses correct metrics
    const prevFont = ctx.font;
    ctx.font = font;

    const words = text.split(/\s+/);
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const test = line ? `${line} ${words[i]}` : words[i];
      const width = ctx.measureText(test).width * uiScale; // scale to match drawLabel usage
      if (width <= maxWidthPx || !line) {
        line = test;
      } else {
        outLines.push(line);
        line = words[i];
      }
    }
    if (line) outLines.push(line);

    ctx.font = prevFont;
  }
}
