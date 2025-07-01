// src/game/tradepost/TradePostItemsList.ts

import { drawBlockCard } from '@/ui/primitives/BlockCard';
import { drawShipCard } from '@/ui/primitives/ShipCard';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawButton, type UIButton } from '@/ui/primitives/UIButton';
import { isMouseOverRect } from '@/ui/menus/helpers/isMouseOverRect';
import { getUniformScaleFactor } from '@/config/view';

import { getTierFromBlockId } from '@/systems/pickups/helpers/getTierFromBlockId';

import type { TradePostInstance } from './interfaces/TradePostInstance';
import type { InputManager } from '@/core/InputManager';
import type { NavPoint } from '@/core/input/interfaces/NavMap';
import { TradePostItemsTooltipRenderer } from './TradePostItemTooltipRenderer';
import { ShipBlueprintRegistry } from '@/game/ship/ShipBlueprintRegistry';

export class TradePostItemsList {
  private instance: TradePostInstance;
  private inputManager: InputManager;
  private buttons: UIButton[] = [];

  private tooltipRenderer = new TradePostItemsTooltipRenderer();
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

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const item = entry.item;
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
        this.hoveredIndex = i;
        this.hoveredType = 'output';

        if (item.type === 'block') {
          const label = this.tooltipRenderer.getBlockName(item.id);
          this.hoveredItem = { label, x: mx, y: my };
        } else if (item.type === 'ship') {
          const shipName = ShipBlueprintRegistry.getByName(item.id)?.name ?? item.id;
          this.hoveredItem = { label: shipName, x: mx, y: my };
        }

        if (clicked && canAfford && quantity > 0) {
          this.instance.executeTransaction(i);
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
        await drawShipCard({
          ctx,
          x: iconX - this.shipCardXCorrection,
          y: y - this.shipCardYCorrection,
          size: this.cardSize,
          shipId: item.id,
          isHovered: isOutputHovered,
          isSelected: false,
          isLocked: !canAfford,
        });
      }

      // === Render Wants (Required Blocks) ===
      const wantsX = iconX + this.cardSize + this.firstColumnGap;
      const wants = item.wants;
      for (let j = 0; j < wants.length; j++) {
        const blockId = wants[j];
        const offsetX = wantsX + j * (this.cardSize + this.horizontalSpacing);
        const tier = getTierFromBlockId(blockId);
        const style = this.getStyleFromTier(tier);
        const isWantHovered = this.hoveredIndex === i && this.hoveredType === 'want' && this.hoveredWantIndex === j;

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
    if (this.hoveredItem) {
      this.tooltipRenderer.renderTooltip(
        this.hoveredItem.x,
        this.hoveredItem.y,
        this.hoveredItem.label,
        scale
      );
    }
  }

  getNavPoints(): NavPoint[] {
    const scale = getUniformScaleFactor();
    const entries = this.instance.getAllEntries();

    const navPoints: NavPoint[] = [];

    // These constants are based on empirically determined visual alignment
    const baseScreenX = 410 * scale;
    const baseScreenY = 270 * scale;
    const rowSpacing = 100 * scale;

    for (let i = 0; i < entries.length; i++) {

      navPoints.push({
        gridX: 0,
        gridY: i,
        screenX: baseScreenX,
        screenY: baseScreenY + (i * rowSpacing),
        isEnabled: true,
      });
    }

    return navPoints;
  }

  private getStyleFromTier(tier: number): 'gray' | 'green' | 'blue' | 'purple' {
    switch (tier) {
      case 2: return 'green';
      case 3: return 'blue';
      case 4: return 'purple';
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
