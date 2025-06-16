// src/ui/hud/BlockQueueDisplayManager.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { PlayerResources } from '@/game/player/PlayerResources';
import type { BlockDropDecisionMenu } from '@/ui/menus/BlockDropDecisionMenu';

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
  
  // For floating active card animations
  private readonly floatOffsets: number[] = [];  // per-block animated vertical offsets
  private readonly FLOAT_SPEED = 80;             // pixels per second
  private readonly FLOAT_HEIGHT = 10;            // max Y offset upward
  private readonly xOffsets: number[] = [];
  private readonly X_OFFSET_SPEED = 360; // pixels per second
  private readonly FANOUT_X_OFFSET = 28; // fixed pixel shift per card in roll fan-out

  // For pulsing active card animations
  private readonly pulseTimers: number[] = [];
  private readonly PULSE_SPEED = 4; // radians per second
  private readonly PULSE_SCALE_AMPLITUDE = 0.06; // ~6% enlargement
  private readonly PULSE_BRIGHTNESS_AMPLITUDE = 0.25; // added to brightenColor factor

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly playerResources: PlayerResources,
    private readonly blockDropDecisionMenu: BlockDropDecisionMenu // Added this
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

    const blockQueue = this.playerResources.getBlockQueue();
    const hovered = this.blockDropDecisionMenu.getHoveredButton();

    // Resize floatOffsets array to match queue size
    while (this.floatOffsets.length < blockQueue.length) {
      this.floatOffsets.push(0);
    }
    while (this.floatOffsets.length > blockQueue.length) {
      this.floatOffsets.pop();
    }

    // Resize pulseTimers array to match queue size
    while (this.pulseTimers.length < blockQueue.length) {
      this.pulseTimers.push(0);
    }
    while (this.pulseTimers.length > blockQueue.length) {
      this.pulseTimers.pop();
    }

    // Determine which blocks should be raised
    const shouldRaise = new Set<number>();

    if (hovered === 'refine' || hovered === 'autoplace') {
      if (blockQueue.length > 0) {
        shouldRaise.add(0);
      }
    } else if (hovered === 'roll') {
      for (let i = 0; i < 3 && i < blockQueue.length; i++) {
        shouldRaise.add(i);
      }
    } else if (hovered === 'autoPlaceAll') {
      for (let i = 0; i < blockQueue.length; i++) {
        shouldRaise.add(i);
      }
    }

    // Interpolate each offset
    for (let i = 0; i < blockQueue.length; i++) {
      const target = shouldRaise.has(i) ? this.FLOAT_HEIGHT : 0;
      const current = this.floatOffsets[i];
      const delta = target - current;

      const maxStep = this.FLOAT_SPEED * dt;
      const step = Math.sign(delta) * Math.min(Math.abs(delta), maxStep);
      this.floatOffsets[i] += step;
    }

    // Update pulse timers
    for (let i = 0; i < blockQueue.length; i++) {
      this.pulseTimers[i] += dt * this.PULSE_SPEED;
    }
  
    // Resize xOffsets to match block queue
    while (this.xOffsets.length < blockQueue.length) {
      this.xOffsets.push(0);
    }
    while (this.xOffsets.length > blockQueue.length) {
      this.xOffsets.pop();
    }

    const FANOUT_X_OFFSET = this.FANOUT_X_OFFSET * getUniformScaleFactor();

    // Compute target X offset per card
    for (let i = 0; i < blockQueue.length; i++) {
      let targetX = 0;

      if (hovered === 'roll' && i >= 0 && i <= 2) {
        targetX = FANOUT_X_OFFSET * i; // match render logic
      }

      const current = this.xOffsets[i];
      const delta = targetX - current;
      const maxStep = this.X_OFFSET_SPEED * dt;
      const step = Math.sign(delta) * Math.min(Math.abs(delta), maxStep);
      this.xOffsets[i] += step;
    }
  }

  render(): void {
    const ctx = this.canvasManager.getContext('ui');
    const canvas = ctx.canvas;
    const scale = getUniformScaleFactor();

    const blockQueue = this.playerResources.getBlockQueue();
    const blockCount = blockQueue.length;

    const distanceFromBottom = Math.floor(80 * scale);
    const centerScreenX = Math.floor(canvas.width / 2);

    // Base dimensions
    const cardWidth = Math.floor(32 * scale);
    const cardHeight = Math.floor(32 * scale);
    const cardMarginX = Math.floor(8 * scale);
    const cardMarginY = Math.floor(8 * scale);
    const cardColumns = 6;

    // Encompassing window
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

    // Preview base size
    const previewSize = Math.floor(this.MINI_BLOCK_SIZE * scale);

    // Compute spacing
    let cardSpacing = cardWidth + cardMarginX;
    let overlapAmount = 0;

    if (blockCount > cardColumns) {
      const availableWidth = windowWidth - (windowMarginX * 2);
      const totalNormalWidth = (blockCount * cardWidth) + ((blockCount - 1) * cardMarginX);

      if (totalNormalWidth > availableWidth) {
        cardSpacing = (availableWidth - cardWidth) / (blockCount - 1);
        overlapAmount = (cardWidth + cardMarginX) - cardSpacing;
      }
    }

    const isRollHovered = this.blockDropDecisionMenu.getHoveredButton() === 'roll';
    const FANOUT_X_OFFSET = this.FANOUT_X_OFFSET * scale;
    const fanBaseX = windowX + windowMarginX;

    // === Render each block ===
    for (let i = blockQueue.length - 1; i >= 0; i--) {
      const blockType = blockQueue[i];
      const tier = getTierFromBlockId(blockType.id);
      const baseColor = BLOCK_TIER_COLORS[tier] ?? '#ffffff';

      const floatOffset = this.floatOffsets[i] ?? 0;
      const pulseTime = this.pulseTimers[i] ?? 0;
      const fanOffsetX = this.xOffsets[i] ?? 0;

      let scaleMod = 1.0;
      let color = baseColor;

      if (floatOffset > 0.5) {
        const pulse = (Math.sin(pulseTime) + 1) / 2;
        const scalePulse = 1 + pulse * this.PULSE_SCALE_AMPLITUDE;
        const brightnessPulse = pulse * this.PULSE_BRIGHTNESS_AMPLITUDE;

        scaleMod = scalePulse;
        color = brightenColor(baseColor, brightnessPulse);
      }

      const scaledCardWidth = Math.floor(cardWidth * scaleMod);
      const scaledCardHeight = Math.floor(cardHeight * scaleMod);
      const scaledPreviewSize = Math.floor(previewSize * scaleMod);

      let cardX: number;

      if (isRollHovered && i >= 0 && i <= 2) {
        // Fan-out position with smoothly interpolated offset
        cardX = fanBaseX + fanOffsetX + (cardWidth - scaledCardWidth) / 2;
      } else {
        // Standard compressed layout
        const baseX = windowX + windowMarginX + i * cardSpacing;
        cardX = baseX + (cardWidth - scaledCardWidth) / 2;
      }

      const cardY = windowY + windowMarginY - floatOffset + (cardHeight - scaledCardHeight) / 2;

      drawWindow({
        ctx,
        x: cardX,
        y: cardY,
        width: scaledCardWidth,
        height: scaledCardHeight,
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
        scaledPreviewSize,
        scaledPreviewSize,
        alpha,
        blockType
      );
    }
  }
}