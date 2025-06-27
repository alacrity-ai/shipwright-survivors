// src/ui/hud/BlockQueueDisplayManager.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { PlayerResources } from '@/game/player/PlayerResources';
import type { BlockDropDecisionMenu } from '@/ui/menus/BlockDropDecisionMenu';
import type { InputManager } from '@/core/InputManager';

import { setCursor, restoreCursor } from '@/core/interfaces/events/CursorReporter';

import { requestPlaceBlockFromQueue, requestRefineBlockFromQueue } from '@/core/interfaces/events/BlockQueueReporter';
import { reportOverlayInteracting, reportOverlayNotInteracting } from '@/core/interfaces/events/UIOverlayInteractingReporter';
import { drawBlockCard } from '@/ui/primitives/BlockCard';
import { getTierFromBlockId } from '@/systems/pickups/helpers/getTierFromBlockId';
import { brightenColor } from '@/shared/colorUtils';
import { getUniformScaleFactor } from '@/config/view';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawWindow } from '@/ui/primitives/WindowBox';
import { BlockPreviewRenderer } from '@/ui/components/BlockPreviewRenderer';
import { getBlockType } from '@/game/blocks/BlockRegistry';

function getStyleIdFromTier(tier: number): 'gray' | 'green' | 'blue' | 'purple' {
  switch (tier) {
    case 0: return 'gray';
    case 1: return 'gray';
    case 2: return 'green';
    case 3: return 'blue';
    case 4: return 'purple';
    default: return 'gray';
  }
}

export class BlockQueueDisplayManager {
  private readonly blockPreviewRenderer: BlockPreviewRenderer;
  private readonly MINI_BLOCK_SIZE = 16;
  private readonly MINI_BLOCK_SPIN_SPEED = 0.5;
  private readonly BLOCK_CULLING_THRESHOLD = 30;
  private readonly MAXIMUM_CARDS = 25; // TODO : Move this to config

  private readonly floatOffsets: number[] = [];
  private readonly xOffsets: number[] = [];
  private readonly pulseTimers: number[] = [];

  private readonly FLOAT_SPEED = 120;
  private readonly FLOAT_HEIGHT = 10;
  private readonly MOUSE_HOVER_HEIGHT = 72;
  private readonly MOUSE_HOVER_SPEED = 320;
  private readonly X_OFFSET_SPEED = 360;
  private readonly FANOUT_X_OFFSET = 28;
  private readonly PULSE_SPEED = 4;
  private readonly PULSE_SCALE_AMPLITUDE = 0.06;
  private readonly PULSE_BRIGHTNESS_AMPLITUDE = 0.25;

  private cursorRestored = false;

  // Cached layout variables (computed by resize)
  private cardWidth: number = 0;
  private cardHeight: number = 0;
  private cardMarginX: number = 0;
  private cardColumns: number = 12;
  private windowMarginX: number = 0;
  private windowMarginY: number = 0;
  private windowWidth: number = 0;
  private windowX: number = 0;
  private windowY: number = 0;
  private cardSpacing: number = 0;
  private fanBaseX: number = 0;
  private scale: number = 1;

  private hoveredCardIndex: number | null = null;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly playerResources: PlayerResources,
    private readonly blockDropDecisionMenu: BlockDropDecisionMenu,
    private readonly inputManager: InputManager
  ) {
    const defaultBlockType = getBlockType('hull0')!;
    this.blockPreviewRenderer = new BlockPreviewRenderer(
      defaultBlockType,
      this.MINI_BLOCK_SPIN_SPEED,
      this.MINI_BLOCK_SPIN_SPEED * 1.5
    );
    this.resize(); // Precompute layout
  }

  /** Call this on resolution change or scale change */
  public resize(): void {
    this.scale = getUniformScaleFactor();
    const canvas = this.canvasManager.getContext('ui').canvas;

    this.cardWidth = Math.floor(32 * this.scale);
    this.cardHeight = Math.floor(32 * this.scale);
    this.cardMarginX = Math.floor(8 * this.scale);
    this.windowMarginX = Math.floor(6 * this.scale);
    this.windowMarginY = Math.floor(6 * this.scale);
    const distanceFromBottom = Math.floor(54 * this.scale);

    this.windowWidth = Math.floor(
      (this.cardWidth * this.cardColumns) +
      (this.windowMarginX * 2) +
      (this.cardMarginX * (this.cardColumns - 1))
    );
    this.windowX = Math.floor(canvas.width / 2) - this.windowWidth / 2;
    this.windowY = canvas.height - distanceFromBottom;

    this.cardSpacing = this.cardWidth + this.cardMarginX;
    this.fanBaseX = this.windowX + this.windowMarginX;
  }

  public update(dt: number): void {
    const blockQueue = this.playerResources.getBlockQueue();
    if (blockQueue.length === 0) {
      this.floatOffsets.length = 0;
      this.pulseTimers.length = 0;
      this.xOffsets.length = 0;
      return;
    }

    this.blockPreviewRenderer.update(dt);
    const hovered = this.blockDropDecisionMenu.getHoveredButton();

    while (this.floatOffsets.length < blockQueue.length) this.floatOffsets.push(0);
    while (this.floatOffsets.length > blockQueue.length) this.floatOffsets.pop();
    while (this.pulseTimers.length < blockQueue.length) this.pulseTimers.push(0);
    while (this.pulseTimers.length > blockQueue.length) this.pulseTimers.pop();
    while (this.xOffsets.length < blockQueue.length) this.xOffsets.push(0);
    while (this.xOffsets.length > blockQueue.length) this.xOffsets.pop();

    const { x: mouseX, y: mouseY } = this.inputManager.getMousePosition();
    const isRollHovered = hovered === 'roll';

    // Adjust card spacing for overflow
    if (blockQueue.length > this.cardColumns) {
      const availableWidth = this.windowWidth - (this.windowMarginX * 2);
      this.cardSpacing = (availableWidth - this.cardWidth) / (blockQueue.length - 1);
    } else {
      this.cardSpacing = this.cardWidth + this.cardMarginX;
    }

    // === Mouse Hover Detection (single block) ===
    this.hoveredCardIndex = null;
    for (let i = blockQueue.length - 1; i >= 0; i--) {
      let cardX: number;
      if (isRollHovered && i <= 2) {
        const fanOffsetX = this.xOffsets[i] ?? 0;
        cardX = this.fanBaseX + fanOffsetX;
      } else {
        cardX = this.windowX + this.windowMarginX + i * this.cardSpacing;
      }
      const cardY = this.windowY + this.windowMarginY;

      if (
        mouseX >= cardX &&
        mouseX <= cardX + this.cardWidth &&
        mouseY >= cardY &&
        mouseY <= cardY + this.cardHeight
      ) {
        this.hoveredCardIndex = i;
        break;
      }
    }

    // === UI Hover Sources ===
    const uiHoverIndices = new Set<number>();
    if (hovered === 'refine' || hovered === 'autoplace') {
      if (blockQueue.length > 0) uiHoverIndices.add(0);
    } else if (hovered === 'roll') {
      for (let i = 0; i < 3 && i < blockQueue.length; i++) {
        uiHoverIndices.add(i);
      }
    }

    // === Interpolate Float Offsets ===
    for (let i = 0; i < blockQueue.length; i++) {
      let target = 0;
      let maxStep = this.FLOAT_SPEED * dt;

      if (i === this.hoveredCardIndex) {
        target = this.MOUSE_HOVER_HEIGHT;
        maxStep = this.MOUSE_HOVER_SPEED * dt;
      } else if (uiHoverIndices.has(i)) {
        target = this.FLOAT_HEIGHT;
      }

      const current = this.floatOffsets[i];
      const delta = target - current;
      const step = Math.sign(delta) * Math.min(Math.abs(delta), maxStep);
      this.floatOffsets[i] += step;
    }

    // === Update Pulse Timers ===
    for (let i = 0; i < blockQueue.length; i++) {
      this.pulseTimers[i] += dt * this.PULSE_SPEED;
    }

    // === Animate Fanout X Offsets ===
    const fanout = this.FANOUT_X_OFFSET * this.scale;
    const sortedRaised = Array.from(uiHoverIndices).sort((a, b) => a - b);

    for (let i = 0; i < blockQueue.length; i++) {
      let targetX = 0;

      if (hovered === 'roll' && i <= 2) {
        targetX = fanout * i;
      } else if (uiHoverIndices.has(i) && uiHoverIndices.size <= 3 && hovered !== 'roll') {
        const hoverIndex = sortedRaised.indexOf(i);
        if (hoverIndex !== -1) {
          const centerOffset = Math.floor(sortedRaised.length / 2);
          targetX = fanout * (hoverIndex - centerOffset);
        }
      }

      const current = this.xOffsets[i];
      const delta = targetX - current;
      const maxStep = this.X_OFFSET_SPEED * dt;
      const step = Math.sign(delta) * Math.min(Math.abs(delta), maxStep);
      this.xOffsets[i] += step;
    }
  
    if (this.hoveredCardIndex !== null) {
      if (this.inputManager.wasMouseClicked()) {
        const block = blockQueue[this.hoveredCardIndex];
        if (block) {
          requestPlaceBlockFromQueue(this.hoveredCardIndex, block.id);
        }
      } else if (this.inputManager.wasRightClicked()) {
        const block = blockQueue[this.hoveredCardIndex];
        if (block) {
          requestRefineBlockFromQueue(this.hoveredCardIndex, block.id);
        }
      }
    }
  }

  render(): void {
    const ctx = this.canvasManager.getContext('ui');
    const canvas = ctx.canvas;
    const scale = getUniformScaleFactor();

    const distanceFromBottom = Math.floor(54 * scale);
    const centerScreenX = Math.floor(canvas.width / 2);

    // Base dimensions
    const cardWidth = Math.floor(32 * scale);
    const cardHeight = Math.floor(32 * scale);
    const cardMarginX = Math.floor(8 * scale);
    const cardMarginY = Math.floor(8 * scale);
    const cardColumns = 12;

    // Encompassing window
    const windowMarginX = Math.floor(6 * scale);
    const windowMarginY = Math.floor(6 * scale);
    const windowWidth = Math.floor((cardWidth * cardColumns) + (windowMarginX * 2) + (cardMarginX * (cardColumns - 1)));
    const windowHeight = Math.floor(44 * scale);
    const windowX = centerScreenX - windowWidth / 2;
    const windowY = canvas.height - distanceFromBottom;

    const { x: mouseX, y: mouseY } = this.inputManager.getMousePosition();
    const isMouseOverWindow =
      mouseX >= windowX &&
      mouseX <= windowX + windowWidth &&
      mouseY >= windowY &&
      mouseY <= windowY + windowHeight;

    const hovered = this.blockDropDecisionMenu.getHoveredButton();
    const blockQueue = this.playerResources.getBlockQueue();
    const blockCount = blockQueue.length;

    let borderColor: string;
    let labelText: string;
    let borderAlpha: number;

    if (blockCount >= this.MAXIMUM_CARDS) {
      borderColor = '#ff8800'; // Neon orange
      borderAlpha = 1.0;
      labelText = `Full: ${blockCount}/${this.MAXIMUM_CARDS}`;
    } else {
      borderColor = blockCount > 0 ? '#00ff00' : '#003400';
      borderAlpha = 0.5;
      labelText = `Blocks: ${blockCount}`;
    }

    if (hovered && blockCount > 0) {
      switch (hovered) {
        case 'refine': {
          const blockName = blockQueue[0]?.name ?? 'Block';
          labelText = `Refine "${blockName}"`;
          borderColor = '#ffcc00';
          borderAlpha = 0.85;
          break;
        }
        case 'roll': {
          labelText = '3-1 Reroll';
          borderColor = '#cc66ff';
          borderAlpha = 0.85;
          break;
        }
        case 'autoplace': {
          const blockName = blockQueue[0]?.name ?? 'Block';
          labelText = `Attach "${blockName}"`;
          borderColor = '#00ccff';
          borderAlpha = 0.85;
          break;
        }
        case 'autoPlaceAll': {
          labelText = `Attach ${blockCount} Blocks`;
          borderColor = '#66ff66';
          borderAlpha = 0.85;
          break;
        }
      }
    }

    if (isMouseOverWindow) {
      borderAlpha = Math.min(1.0, borderAlpha + 0.3);
      borderColor = brightenColor(borderColor, 0.2);
      setCursor('hovered');
      reportOverlayInteracting();
      this.cursorRestored = false;
    } else {
      if (!this.cursorRestored) {
        this.cursorRestored = true;
        restoreCursor();
      }
    }

    const borderOptions = {
      alpha: borderAlpha,
      borderRadius: 12,
      borderColor,
      backgroundColor: '#00000000',
    };

    drawWindow({
      ctx,
      x: windowX,
      y: windowY,
      width: windowWidth,
      height: windowHeight,
      options: borderOptions,
    });

    drawLabel(
      ctx,
      windowX,
      windowY - (14 * scale),
      labelText,
      {
        align: 'left',
        color: borderColor,
      },
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

    const isRollHovered = hovered === 'roll';
    const fanBaseX = windowX + windowMarginX;

    // === Render each block ===
    for (let i = blockQueue.length - 1; i >= 0; i--) {
      const blockType = blockQueue[i];
      const tier = getTierFromBlockId(blockType.id);
      const styleId = getStyleIdFromTier(tier); // implement this helper

      const floatOffset = this.floatOffsets[i] ?? 0;
      const pulseTime = this.pulseTimers[i] ?? 0;
      const fanOffsetX = this.xOffsets[i] ?? 0;

      let scaleMod = 1.0;
      let brightenAmount = 0;

      if (floatOffset > 0.5) {
        const pulse = (Math.sin(pulseTime) + 1) / 2;
        scaleMod = 1 + pulse * this.PULSE_SCALE_AMPLITUDE;
        brightenAmount = pulse * this.PULSE_BRIGHTNESS_AMPLITUDE;
      }

      const scaledCardWidth = Math.floor(cardWidth * scaleMod);
      const scaledCardHeight = Math.floor(cardHeight * scaleMod);
      const scaledPreviewSize = Math.floor(previewSize * scaleMod);

      let cardX: number;

      if (isRollHovered && i >= 0 && i <= 2) {
        cardX = fanBaseX + fanOffsetX + (cardWidth - scaledCardWidth) / 2;
      } else {
        const baseX = windowX + windowMarginX + i * cardSpacing;
        cardX = baseX + (cardWidth - scaledCardWidth) / 2;
      }

      const cardY = windowY + windowMarginY - floatOffset + (cardHeight - scaledCardHeight) / 2;

      drawBlockCard({
        ctx,
        x: cardX,
        y: cardY,
        width: scaledCardWidth,
        height: scaledCardHeight,
        borderRadius: 12,
        baseStyleId: styleId,
        alpha: 1.0,
        scale: 1.0, // or keep as scaleMod if you're not using ctx.scale
        brighten: brightenAmount,
      });

      const previewX = cardX + cardMarginX;
      const previewY = cardY + cardMarginY;
      const alpha = blockCount > 0 ? 1.0 : 0.3;
      if (i < this.BLOCK_CULLING_THRESHOLD) {
        this.blockPreviewRenderer.render(
          ctx,
          previewX,
          previewY,
          scaledPreviewSize,
          scaledPreviewSize,
          alpha,
          blockType,
        );
      }
    }
  }

  // Public API
  public getHoveredCardIndex(): number | null {
    return this.hoveredCardIndex;
  }
}