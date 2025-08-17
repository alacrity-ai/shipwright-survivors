// src/game/tradepost/TradePostItemsList.ts

import { drawBlockCard } from '@/ui/primitives/BlockCard';
import { drawShipCard, preloadShipCards } from '@/ui/primitives/ShipCard';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawButton, type UIButton } from '@/ui/primitives/UIButton';
import { isMouseOverRect } from '@/ui/menus/helpers/isMouseOverRect';
import { getUniformScaleFactor } from '@/config/view';

import { getTierFromBlockId } from '@/systems/pickups/helpers/getTierFromBlockId';

import { audioManager } from '@/audio/Audio';

import { isSteamDeck } from '@/config/view';

import type { TradePostInstance } from './interfaces/TradePostInstance';
import type { InputManager } from '@/core/InputManager';
import type { NavPoint } from '@/core/input/interfaces/NavMap';
import { TradePostItemsTooltipRenderer } from './TradePostItemTooltipRenderer';
import { ShipBlueprintRegistry } from '@/game/ship/ShipBlueprintRegistry';
import { reportOverlayInteracting } from '@/core/interfaces/events/UIOverlayInteractingReporter';

import { getArtifactById } from '@/game/ship/artifacts/registry/ArtifactRegistry';
import { drawArtifactSlot, preloadArtifactIcons } from '@/game/ship/artifacts/ui/ArtifactSlotRenderer';
import { ArtifactTooltipRenderer } from '@/game/ship/artifacts/ui/ArtifactTooltipRenderer';
import { PlayerArtifactsManager } from '@/game/player/PlayerArtifactsManager';

export class TradePostItemsList {
  private instance: TradePostInstance;
  private inputManager: InputManager;
  private buttons: UIButton[] = [];

  private tooltipRenderer = new TradePostItemsTooltipRenderer();
  private artifactRenderer = new ArtifactTooltipRenderer();

  private hoveredItem: { label: string; x: number; y: number } | null = null;

  private baseX = 0;
  private baseY = 0;
  private rowHeight = 0;
  private verticalSpacing = 0;
  private cardSize = 0;
  private firstColumnGap = 0;
  private horizontalSpacing = 0;

  private hoveredIndex: number = -1;
  private hoveredType: 'output' | 'want' | null = null;
  private hoveredWantIndex: number = -1;

  private shipCardXCorrection = 0;
  private shipCardYCorrection = 0;

  private yOffset = 0;
  private xOffset = 0;

  // Scratch buffers to avoid per-frame allocations when warming icons
  private _tmpShipIds: string[] = [];
  private _tmpArtifactKeys: string[] = [];

  constructor(instance: TradePostInstance, inputManager: InputManager) {
    this.instance = instance;
    this.inputManager = inputManager;
  }

  resize(baseX: number, baseY: number): void {
    const scale = getUniformScaleFactor();

    this.baseX = baseX;
    this.baseY = baseY;

    this.rowHeight = 48 * scale;
    this.verticalSpacing = 54 * scale;
    this.horizontalSpacing = 32 * scale;
    this.cardSize = 64 * scale;
    this.firstColumnGap = 90 * scale;

    this.shipCardXCorrection = 0;
    this.shipCardYCorrection = 0;

    this.xOffset = 20 * scale;
    this.yOffset = 8 * scale;
  }

  update(dt: number): void {
    const scale = getUniformScaleFactor();
    const mouse = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();
    const { x: mx, y: my } = mouse ?? { x: -1, y: -1 };

    this.hoveredItem = null;
    this.hoveredIndex = -1;
    this.hoveredType = null;
    this.hoveredWantIndex = -1;

    const entries = this.instance.getAllEntries();
    let y = this.baseY + this.yOffset;

    // ─────────────────────────────────────────────────────
    // Warm any ship/artifact icons visible this frame (idempotent).
    // Keeps drawing synchronous and Z-order deterministic.
    // ─────────────────────────────────────────────────────
    this._tmpShipIds.length = 0;
    this._tmpArtifactKeys.length = 0;

    for (let i = 0; i < entries.length; i++) {
      const item = entries[i].item;

      // Skip unlocked artifacts entirely
      if (item.type === 'artifact' && PlayerArtifactsManager.getInstance().isUnlocked(item.id)) {
        continue;
      }

      if (item.type === 'ship') {
        this._tmpShipIds.push(item.id);
      } else if (item.type === 'artifact') {
        const a = getArtifactById(item.id);
        if (a?.icon) this._tmpArtifactKeys.push(a.icon);
      }
    }

    if (this._tmpShipIds.length > 0) preloadShipCards(this._tmpShipIds);
    if (this._tmpArtifactKeys.length > 0) preloadArtifactIcons(this._tmpArtifactKeys);

    // ─────────────────────────────────────────────────────
    // Hover / click handling
    // ─────────────────────────────────────────────────────
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const item = entry.item;

      if (item.type === 'artifact' && PlayerArtifactsManager.getInstance().isUnlocked(item.id)) {
        continue; // Skip rendering this artifact if unlocked
      }

      const quantity = this.instance.getRemainingQuantity(i);
      const canAfford = this.instance.canAfford(i);

      const rowY = y;
      const iconX = this.baseX + this.xOffset;
      const wantsX = iconX + this.cardSize + this.firstColumnGap;

      // === For Sale Output ===
      const outputRect = {
        x: iconX,
        y: rowY,
        width: this.cardSize,
        height: this.cardSize,
      };

      if (isMouseOverRect(mx, my, outputRect, 1.0)) {
        reportOverlayInteracting();
        this.hoveredIndex = i;
        this.hoveredType = 'output';

        // TODO : Sound specific to item type or tier unlocked
        if (item.type === 'block') {
          const label = this.tooltipRenderer.getBlockName(item.id);
          this.hoveredItem = { label, x: mx, y: my };
        } else if (item.type === 'ship') {
          const shipName = ShipBlueprintRegistry.getByName(item.id)?.name ?? item.id;
          this.hoveredItem = { label: shipName, x: mx, y: my };
        } else if (item.type === 'artifact') {
          const artifact = getArtifactById(item.id);
          const label = artifact?.name ?? item.id;
          this.hoveredItem = { label, x: mx, y: my };
        }

        if (clicked && canAfford && quantity > 0) {
          this.instance.executeTransaction(i);
          audioManager.play('assets/sounds/sfx/ui/gamblewin_02.wav', 'sfx', { maxSimultaneous: 10 });
        }
      }

      // === Wants ===
      const wants = item.wants;
      for (let j = 0; j < wants.length; j++) {
        const blockId = wants[j];
        const bx = wantsX + j * (this.cardSize + this.horizontalSpacing);
        const wantRect = { x: bx, y: rowY, width: this.cardSize, height: this.cardSize };

        if (isMouseOverRect(mx, my, wantRect, 1.0)) {
          this.hoveredIndex = i;
          this.hoveredType = 'want';
          this.hoveredWantIndex = j;

          const label = this.tooltipRenderer.getBlockName(blockId);
          this.hoveredItem = { label, x: mx, y: my };
        }
      }

      y += this.rowHeight + this.verticalSpacing;
    }
  }

  async render(ctx: CanvasRenderingContext2D): Promise<void> {
    const scale = getUniformScaleFactor();
    const entries = this.instance.getAllEntries();
    this.buttons.length = 0;

    let y = this.baseY + this.yOffset;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const item = entry.item;

      if (item.type === 'artifact' && PlayerArtifactsManager.getInstance().isUnlocked(item.id)) {
        continue; // Skip rendering this artifact if unlocked
      }

      const quantity = this.instance.getRemainingQuantity(i);
      const canAfford = this.instance.canAfford(i);

      const iconX = this.baseX + this.xOffset;
      const isOutputHovered = this.hoveredIndex === i && this.hoveredType === 'output';

      // === Render For Sale Item Output ===
      if (item.type === 'block') {
        const tier = getTierFromBlockId(item.id);
        const style = this.getStyleFromTier(tier);

        drawBlockCard({
          ctx,
          x: iconX,
          y,
          width: this.cardSize,
          height: this.cardSize,
          borderRadius: 8,
          baseStyleId: style,
          alpha: canAfford ? 1.0 : 0.3,
          blockId: item.id,
          brighten: isOutputHovered ? 0.6 : 0.0,
        });
      } else if (item.type === 'ship') {
        // Synchronous draw; image has been (or is being) preloaded in update()
        drawShipCard({
          ctx,
          x: iconX - this.shipCardXCorrection,
          y: y - this.shipCardYCorrection,
          size: this.cardSize,
          shipId: item.id,
          isHovered: isOutputHovered,
          isSelected: false,
          isLocked: !canAfford,
        });
      } else if (item.type === 'artifact') {
        const artifact = getArtifactById(item.id);
        if (artifact) {
          // Synchronous draw; icon has been (or is being) preloaded in update()
          drawArtifactSlot({
            ctx,
            x: iconX,
            y,
            size: this.cardSize,
            rarity: artifact.rarity,
            iconKey: artifact.icon,
            isHovered: isOutputHovered,
            isSelected: false,
            isEmpty: false,
          });

          // Optional: lower opacity overlay if unaffordable
          if (!canAfford) {
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#000000';
            ctx.fillRect(iconX, y, this.cardSize, this.cardSize);
            ctx.restore();
          }
        }
      }

      // === Render Wants (Required Blocks) ===
      const wantsX = iconX + this.cardSize + this.firstColumnGap;
      const wants = item.wants;
      for (let j = 0; j < wants.length; j++) {
        const blockId = wants[j];
        const offsetX = wantsX + j * (this.cardSize + this.horizontalSpacing);
        const tier = getTierFromBlockId(blockId);
        const style = this.getStyleFromTier(tier);
        const isWantHovered =
          this.hoveredIndex === i && this.hoveredType === 'want' && this.hoveredWantIndex === j;

        drawBlockCard({
          ctx,
          x: offsetX,
          y,
          width: this.cardSize,
          height: this.cardSize,
          borderRadius: 8,
          baseStyleId: style,
          alpha: canAfford ? 1.0 : 0.3,
          blockId,
          brighten: isWantHovered ? 1.2 : 0.0,
        });
      }

      // === Quantity Indicator ===
      drawLabel(
        ctx,
        this.baseX + (24 * scale),
        y + this.rowHeight + (20 * scale),
        `Stock: ${quantity}`,
        {
          font: `12px monospace`,
          align: 'left',
          color: canAfford ? '#00ff00' : '#888888',
        },
        scale
      );

      y += this.rowHeight + this.verticalSpacing;
    }

    // === Tooltip Rendering ===
    if (this.hoveredItem && this.hoveredIndex >= 0) {
      const hoveredEntry = this.instance.getAllEntries()[this.hoveredIndex];

      if (this.hoveredType === 'output') {
        const hoveredOutput = hoveredEntry.item;
        if (hoveredOutput.type === 'artifact') {
          this.artifactRenderer.renderTooltip(
            hoveredOutput.id,
            this.hoveredItem.x,
            this.hoveredItem.y,
            scale,
            'right',
            null
          );
        } else {
          this.tooltipRenderer.renderTooltip(
            this.hoveredItem.x,
            this.hoveredItem.y,
            this.hoveredItem.label,
            scale,
            hoveredOutput.type === 'block' ? hoveredOutput.id : undefined
          );
        }
      } else if (this.hoveredType === 'want') {
        const wantId = hoveredEntry.item.wants[this.hoveredWantIndex];
        const wantLabel = this.tooltipRenderer.getBlockName(wantId);
        this.tooltipRenderer.renderTooltip(
          this.hoveredItem.x,
          this.hoveredItem.y,
          wantLabel,
          scale,
          wantId
        );
      }
    }
  }

  getNavPoints(): NavPoint[] {
    const scale = getUniformScaleFactor();
    const entries = this.instance.getAllEntries();

    const navPoints: NavPoint[] = [];

    // These constants are based on empirically determined visual alignment
    const verticalOffset = isSteamDeck() ? 10 : 0;
    const baseScreenX = 410 * scale;
    const baseScreenY = 270 * scale + verticalOffset;
    const rowSpacing = 100 * scale;

    for (let i = 0; i < entries.length; i++) {
      const item = entries[i].item;
      if (item.type === 'artifact' && PlayerArtifactsManager.getInstance().isUnlocked(item.id)) {
        continue;
      }

      navPoints.push({
        gridX: 0,
        gridY: navPoints.length,
        screenX: baseScreenX,
        screenY: baseScreenY + (navPoints.length * rowSpacing),
        isEnabled: true,
      });
    }

    return navPoints;
  }

  private getStyleFromTier(tier: number): 'gray' | 'green' | 'blue' | 'purple' | 'gold' {
    switch (tier) {
      case 2: return 'green';
      case 3: return 'blue';
      case 4: return 'purple';
      case 5: return 'gold';
      default: return 'gray';
    }
  }

  private readonly enabledStyle: UIButton['style'] = {
    borderRadius: 8,
    alpha: 0.9,
    borderColor: '#00ff00',
    backgroundGradient: {
      type: 'linear',
      stops: [
        { offset: 0, color: '#003300' },
        { offset: 1, color: '#001a00' }
      ]
    }
  };

  private readonly disabledStyle: UIButton['style'] = {
    borderRadius: 8,
    alpha: 0.5,
    borderColor: '#555555',
    backgroundGradient: {
      type: 'linear',
      stops: [
        { offset: 0, color: '#111111' },
        { offset: 1, color: '#080808' }
      ]
    }
  };
}
