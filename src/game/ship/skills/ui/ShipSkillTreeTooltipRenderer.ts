import { CanvasManager } from '@/core/CanvasManager';
import { getBlockType } from '@/game/blocks/BlockRegistry';
import type { SkillNode } from '@/game/ship/skills/interfaces/SkillNode';
import { drawLabel } from '@/ui/primitives/UILabel';

import { PlayerMetaCurrencyManager } from '@/game/player/PlayerMetaCurrencyManager'; // ⬅ Add this

const BOX_PADDING = 24;
const LINE_SPACING = 36;
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
    uiScale: number
  ): void {
    const ctx = this.canvasManager.getContext('overlay');
    if (!ctx) return;

    const { name, description, cost, metadata, nodeSize } = node;
    const metadataEntries = Object.entries(metadata);

    const contentLineCount = 3 + metadataEntries.length;
    const boxWidth = MAX_WIDTH * uiScale;
    const boxHeight =
      (contentLineCount * LINE_SPACING + BOX_PADDING * 2) * uiScale;

    const boxX = anchorX - boxWidth - 16 * uiScale;
    const boxY = anchorY - boxHeight / 2;

    // === Background ===
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#001100';
    ctx.strokeStyle = '#00ff00';
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
        font: `${22}px monospace`,
        color: nodeSize === 'major' ? '#cc66ff' : '#00ff00',
        glow: true,
      },
      uiScale
    );
    currentY += LINE_SPACING * uiScale;

    drawLabel(
      ctx,
      labelX,
      currentY,
      description,
      {
        font: `${16}px monospace`,
        color: '#cccccc',
      },
      uiScale
    );
    currentY += LINE_SPACING * uiScale;

    // === Cost + Player Core Count ===
    const metaManager = PlayerMetaCurrencyManager.getInstance();
    const playerCores = metaManager.getMetaCurrency();
    const canAfford = metaManager.canAfford(cost);
    const costColor = canAfford ? '#ffaa00' : '#666666';

    drawLabel(
      ctx,
      labelX,
      currentY,
      `Cost: ${cost} cores  |  You: ${playerCores}`,
      {
        font: `${16}px monospace`,
        color: costColor,
      },
      uiScale
    );
    currentY += LINE_SPACING * uiScale;

    for (const [key, value] of metadataEntries) {
      const formatted = `${this.formatLabel(key)}: ${this.formatValue(key, value)}`;
      drawLabel(
        ctx,
        labelX,
        currentY,
        formatted,
        {
          font: `${16}px monospace`,
          color: '#8888ff',
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
