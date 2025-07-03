import { CanvasManager } from '@/core/CanvasManager';
import { getBlockType } from '@/game/blocks/BlockRegistry';
import type { SkillNode } from '@/game/ship/skills/interfaces/SkillNode';
import { drawLabel } from '@/ui/primitives/UILabel';

import { DEFAULT_CONFIG } from '@/config/ui';

import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';

import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
import { PlayerShipSkillTreeManager } from '@/game/player/PlayerShipSkillTreeManager';
import { PlayerMetaCurrencyManager } from '@/game/player/PlayerMetaCurrencyManager'; // ⬅ Add this

const BOX_PADDING = 24;
const LINE_SPACING = 40;
const MAX_WIDTH = 480;

export class ShipSkillTreeTooltipRenderer {
  private canvasManager: CanvasManager;

  constructor() {
    this.canvasManager = CanvasManager.getInstance();
  }

  renderTooltip(
    node: SkillNode,
    anchorX: number,
    anchorY: number,
    uiScale: number,
    shipId: string
  ): void {
    const ctx = this.canvasManager.getContext('overlay');
    if (!ctx) return;

    const { name, description, cost, metadata, nodeSize } = node;
    const metadataEntries = Object.entries(metadata);

    const contentLineCount = 3 + metadataEntries.length;
    const boxWidth = MAX_WIDTH * uiScale;
    const boxHeight =
      (contentLineCount * LINE_SPACING + BOX_PADDING * 3) * uiScale;

    const boxX = anchorX - boxWidth - 64 * uiScale;
    const boxY = anchorY - boxHeight / 2;

    const { 
      blackColor, 
      infoTextColor, 
      hoverColor, 
      accentColor, 
      warningColor, 
      disabledColor, 
      statColor 
    } = DEFAULT_CONFIG.general;

    // === Background ===
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
    let currentY = boxY + BOX_PADDING * uiScale;
    const labelX = boxX + BOX_PADDING * uiScale;

    drawLabel(
      ctx,
      labelX,
      currentY,
      name,
      {
        font: `${24}px monospace`,
        color: nodeSize === 'major' ? '#cc66ff' : accentColor,
        glow: true,
      },
      uiScale
    );
    currentY += (LINE_SPACING + 8)* uiScale;

    drawLabel(
      ctx,
      labelX,
      currentY,
      description,
      {
        font: `${18}px monospace`,
        color: infoTextColor,
      },
      uiScale
    );
    currentY += LINE_SPACING * uiScale;

    // === Cost + Player Core Count ===
    const metaManager = PlayerMetaCurrencyManager.getInstance();
    const playerCores = metaManager.getMetaCurrency();
    const alreadyUnlocked = PlayerShipSkillTreeManager.getInstance().hasNode(
      shipId,
      node.id
    );

    if (alreadyUnlocked) {
      const actionButton = InputDeviceTracker.getInstance().getLastUsed() === 'gamepad'
        ? 'B'
        : 'Right Click';
      drawLabel(
        ctx,
        labelX,
        currentY,
        `Refund (${actionButton})`,
        {
          font: `${18}px monospace`,
          color: accentColor,
        },
        uiScale
      );
      currentY += LINE_SPACING * uiScale;
    } else {
      const masteryLevel = PlayerShipCollection.getInstance().getShipMasteryLevel(shipId);
      const selectedCount = PlayerShipSkillTreeManager.getInstance().getSelectedCount(shipId);
      const requiredMastery = node.masteryRequirement ?? selectedCount + 1;
      const hasEnoughMastery = masteryLevel >= requiredMastery;

      const canAfford = metaManager.canAfford(cost);
      const costColor = hasEnoughMastery
        ? (canAfford ? hoverColor : disabledColor) // Yellow if afford, gray if not
        : disabledColor; // Dimmed if mastery too low

      drawLabel(
        ctx,
        labelX,
        currentY,
        `Cost: ${cost} cores  |  You: ${playerCores}`,
        {
          font: `${18}px monospace`,
          color: costColor,
        },
        uiScale
      );
      currentY += LINE_SPACING * uiScale;

      const masteryColor = hasEnoughMastery ? accentColor : warningColor;
      drawLabel(
        ctx,
        labelX,
        currentY,
        `Requires Mastery Level: ${requiredMastery}`,
        {
          font: `${18}px monospace`,
          color: masteryColor,
        },
        uiScale
      );
      currentY += LINE_SPACING * uiScale;
    }

    for (const [key, value] of metadataEntries) {
      const formatted = `${this.formatLabel(key)}: ${this.formatValue(key, value)}`;
      drawLabel(
        ctx,
        labelX,
        currentY,
        formatted,
        {
          font: `${18}px monospace`,
          color: statColor,
        },
        uiScale
      );
      currentY += LINE_SPACING * uiScale;
    }
  }

  private formatValue(key: string, value: unknown): string {
    if (typeof value === 'boolean') {
      return value ? '✓' : '✗';
    }

    if (typeof value === 'number') {
      if (value >= 0 && value < 1) {
        return `${Math.round(value * 100)}%`;
      }
      return Number.isInteger(value) ? value.toString() : value.toFixed(2);
    }

    if (Array.isArray(value)) {
      if (key === 'startingBlocks') {
        const names = value
          .map((id) => {
            const blockType = getBlockType(id);
            return blockType ? blockType.name : `[Unknown: ${id}]`;
          })
          .join(', ');
        return names;
      }
      return `[${value.join(', ')}]`;
    }

    return String(value);
  }

  private formatLabel(key: string): string {
    const friendlyNames: Record<string, string> = {
      turretDamage: 'Turret Damage',
      turretProjectileSpeed: 'Projectile Speed',
      turretCriticalChance: 'Critical Chance',
      turretPenetratingShots: 'Piercing Shots',
      turretSplitShots: 'Split Shots',

      igniteOnSeekerMissileExplosion: 'Ignite on Explosion',
      seekerMissileExplosionRadius: 'Explosion Radius',
      seekerMissileDamage: 'Missile Damage',
      doubleSeekerMissileShotChance: 'Double Shot Chance',
      timeFreezeOnSeekerMissileExplosion: 'Freeze on Explosion',

      explosiveLanceGrappling: 'Grappling Lance',
      explosiveLanceLifesteal: 'Lifesteal',
      explosiveLanceDamage: 'Lance Damage',
      explosiveLanceElectrocution: 'Electrocute',
      explosiveLanceFiringRate: 'Firing Rate',
      explosiveLanceRange: 'Lance Range',

      haloBladeSplitBlades: 'Split Blades',
      haloBladeDetonateOnHit: 'Detonate on Hit',
      haloBladeFreezeOnHit: 'Freeze on Hit',
      haloBladeDamage: 'Blade Damage',
      haloBladeSize: 'Blade Size',
      haloBladeOrbitRadius: 'Orbit Radius',

      laserDamage: 'Laser Damage',
      laserBeamWidth: 'Beam Width',
      laserEfficiency: 'Efficiency',
      laserShieldPenetration: 'Shield Penetration',
      laserTargeting: 'Auto-Targeting',

      startingBlocks: 'Starting Blocks',
    };

    return friendlyNames[key] ?? key;
  }
}
