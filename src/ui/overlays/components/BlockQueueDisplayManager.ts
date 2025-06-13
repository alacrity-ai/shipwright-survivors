// src/ui/hud/BlockQueueDisplayManager.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { PlayerResources } from '@/game/player/PlayerResources';

import { BLOCK_TIER_COLORS } from '@/game/blocks/BlockColorSchemes';
import { getTierFromBlockId } from '@/systems/pickups/helpers/getTierFromBlockId';
import { brightenColor } from '@/shared/colorUtils';
import { getUniformScaleFactor } from '@/config/view';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawWindow } from '@/ui/primitives/WindowBox';
import { BlockPreviewRenderer } from '@/ui/components/BlockPreviewRenderer';
import { getBlockType } from '@/game/blocks/BlockRegistry';

export class BlockQueueDisplayManager {
  private readonly blockPreviewRenderer: BlockPreviewRenderer;
  private readonly MINI_BLOCK_SIZE = 16;
  private readonly MINI_BLOCK_SPIN_SPEED = 0.5;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly playerResources: PlayerResources
  ) {
    // Initialize preview renderer with fallback block type
    const defaultBlockType = getBlockType('hull0')!;
    this.blockPreviewRenderer = new BlockPreviewRenderer(
      defaultBlockType,
      this.MINI_BLOCK_SPIN_SPEED,
      this.MINI_BLOCK_SPIN_SPEED * 1.5
    );
  }

  update(dt: number): void {
    this.blockPreviewRenderer.update(dt);
  }

  render(): void {
    const ctx = this.canvasManager.getContext('ui');
    const canvas = ctx.canvas;
    const scale = getUniformScaleFactor();

    const blockQueue = this.playerResources.getBlockQueue();
    const blockCount = blockQueue.length;

    const distanceFromBottom = Math.floor(80 * scale);
    const centerScreenX = Math.floor(canvas.width / 2);

    // Preview Card Dimensions
    const cardWidth = Math.floor(32 * scale);
    const cardHeight = Math.floor(32 * scale);
    const cardMarginX = Math.floor(8 * scale);
    const cardMarginY = Math.floor(8 * scale);
    const cardColumns = 6;

    // Encompassing Window Dimensions
    const windowMarginX = Math.floor(6 * scale);
    const windowMarginY = Math.floor(6 * scale);
    const windowWidth = Math.floor((cardWidth * cardColumns) + (windowMarginX * 2) + (cardMarginX * (cardColumns - 1)));
    const windowHeight = Math.floor(44 * scale);
    const windowX = centerScreenX - windowWidth / 2;
    const windowY = canvas.height - distanceFromBottom;

    const borderColor = blockCount > 0 ? '#00ff00' : '#003400';

    drawWindow({
      ctx,
      x: windowX,
      y: windowY,
      width: windowWidth,
      height: windowHeight,
      options: {
        alpha: 0.5,
        borderRadius: 12,
        borderColor,
        backgroundColor: '#00000000',
      }
    });

    drawLabel(
      ctx,
      windowX,
      windowY - (14 * scale),
      `Blocks: ${blockCount}`,
      { align: 'left', color: borderColor },
      scale
    );

    // === Individual Block Preview Cards ===
    const previewSize = Math.floor(this.MINI_BLOCK_SIZE * scale);

    // Calculate overlap if we have more cards than columns
    let cardSpacing = cardWidth + cardMarginX;
    let overlapAmount = 0;

    if (blockCount > cardColumns) {
      // Calculate how much we need to compress the cards to fit
      const availableWidth = windowWidth - (windowMarginX * 2);
      const totalNormalWidth = (blockCount * cardWidth) + ((blockCount - 1) * cardMarginX);
      
      if (totalNormalWidth > availableWidth) {
        // Calculate new spacing to fit all cards
        cardSpacing = (availableWidth - cardWidth) / (blockCount - 1);
        overlapAmount = (cardWidth + cardMarginX) - cardSpacing;
      }
    }

    // Render cards in reverse order (right to left) so leftmost appears on top
    for (let i = blockQueue.length - 1; i >= 0; i--) {
      const blockType = blockQueue[i];

      const tier = getTierFromBlockId(blockType.id);
      const color = BLOCK_TIER_COLORS[tier] ?? '#ffffff';

      const cardX = windowX + windowMarginX + i * cardSpacing;
      const cardY = windowY + windowMarginY;

      drawWindow({
        ctx,
        x: cardX,
        y: cardY,
        width: cardWidth,
        height: cardHeight,
        options: {
          alpha: 1.0,
          borderRadius: 12,
          borderColor: brightenColor(color, 0.3),
          backgroundColor: color,
        }
      });

      const previewX = cardX + cardMarginX;
      const previewY = cardY + cardMarginY;
      const alpha = blockCount > 0 ? 1.0 : 0.3;

      this.blockPreviewRenderer.render(
        ctx,
        previewX,
        previewY,
        previewSize,
        previewSize,
        alpha,
        blockType
      );
    }
  }
}