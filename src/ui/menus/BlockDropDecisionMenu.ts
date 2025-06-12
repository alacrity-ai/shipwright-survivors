// src/ui/menus/BlockDropDecisionMenu.ts

import type { Menu } from '@/ui/interfaces/Menu';
import type { InputManager } from '@/core/InputManager';
import type { BlockType } from '@/game/interfaces/types/BlockType';
import type { Ship } from '@/game/ship/Ship';
import type { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';

import { missionResultStore } from '@/game/missions/MissionResultStore';
import { menuOpened, menuClosed } from '@/ui/menus/events/MenuOpenReporter';
import { PlayerResources } from '@/game/player/PlayerResources';
import { autoPlaceBlock } from '@/ui/menus/helpers/autoPlaceBlock';
import { BlockPreviewRenderer } from '@/ui/components/BlockPreviewRenderer';
import { drawBlockStatsLabels } from '@/ui/menus/helpers/drawBlockStatsLabels';
import { drawWindow } from '@/ui/primitives/WindowBox';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawButton, type UIButton } from '@/ui/primitives/UIButton';
import { isMouseOverRect } from '@/ui/menus/helpers/isMouseOverRect';
import { getUniformScaleFactor } from '@/config/view';
import { Camera } from '@/core/Camera';
import { audioManager } from '@/audio/Audio';

interface BlockPickupEntry {
  blockType: BlockType;
}

type Phase = 'pre-open' | 'sliding-in' | 'settling' | 'open' | 'sliding-out' | null;

export class BlockDropDecisionMenu implements Menu {
  private open = false;
  private queue: BlockPickupEntry[] = [];
  private currentBlockType: BlockType | null = null;

  private blockPreviewRenderer: BlockPreviewRenderer | null = null;
  private nextBlockPreviewRenderer: BlockPreviewRenderer | null = null;

  private animationPhase: Phase = null;
  private slideX = -800;
  private targetX = 0;
  private isAnimating = false;

  private originalZoom: number = 0;

  private readonly SLIDE_SPEED = 1280; // pixels per second
  private readonly SETTLE_SPEED = 320; // pixels per second
  private readonly OVERSHOOT_DISTANCE = 40;

  private preOpenTimer = 0;
  private readonly PRE_OPEN_DURATION = 300;

  // Dimensions and layout
  private readonly LABEL_FONT_SIZE = 14;

  private readonly BASE_WINDOW_X = 20;
  private readonly BASE_WINDOW_Y = 20;
  private readonly BASE_WINDOW_WIDTH = 330;
  private readonly BASE_WINDOW_HEIGHT = 500;

  private readonly BASE_BUTTON_WIDTH = 120;
  private readonly BASE_BUTTON_HEIGHT = 40;

  private readonly BASE_BLOCK_PREVIEW_HEIGHT = 82;
  private readonly BASE_BLOCK_PREVIEW_WIDTH = 82;
  private readonly BASE_BLOCK_SPIN_SPEED = 1;

  // Mini preview dimensions for "Next:" block
  private readonly BASE_MINI_PREVIEW_HEIGHT = 32;
  private readonly BASE_MINI_PREVIEW_WIDTH = 32;

  private refineButton: UIButton = {} as UIButton;
  private autoplaceButton: UIButton = {} as UIButton;

  private shipBuilderEffects: ShipBuilderEffectsSystem;
  private pause: () => void;
  private resume: () => void;

  constructor(
    private readonly ship: Ship,
    private readonly inputManager: InputManager,
    shipBuilderEffects: ShipBuilderEffectsSystem,
    pause: () => void,
    resume: () => void
  ) {
    this.shipBuilderEffects = shipBuilderEffects;
    this.pause = pause;
    this.resume = resume;
    this.initialize();
  }

  private initialize(): void {
    const scaled = getUniformScaleFactor();
    const buttonSpacing = 32 * scaled;

    const totalButtonWidth = (this.BASE_BUTTON_WIDTH * 2 + buttonSpacing);
    const buttonRowX = this.BASE_WINDOW_X + (this.BASE_WINDOW_WIDTH - totalButtonWidth) / 2;

    const baseY = this.BASE_WINDOW_Y + this.BASE_WINDOW_HEIGHT - (this.BASE_BUTTON_HEIGHT + 32) * scaled;

    this.refineButton = {
      x: buttonRowX + this.slideX * scaled,
      y: baseY,
      width: this.BASE_BUTTON_WIDTH,
      height: this.BASE_BUTTON_HEIGHT,
      label: 'Refine',
      onClick: () => this.handleRefine(),
      style: {
        borderRadius: 8,
        alpha: 0.9,
        borderColor: '#009999',
        backgroundGradient: {
          type: 'linear',
          stops: [
            { offset: 0, color: '#003333' },
            { offset: 1, color: '#001f1f' }
          ]
        }
      }
    };

    this.autoplaceButton = {
      x: buttonRowX + this.BASE_BUTTON_WIDTH + buttonSpacing + this.slideX * scaled,
      y: baseY,
      width: this.BASE_BUTTON_WIDTH,
      height: this.BASE_BUTTON_HEIGHT,
      label: 'Autoplace',
      onClick: () => this.handleAutoplace(),
      style: {
        borderRadius: 8,
        alpha: 0.9,
        borderColor: '#336600',
        backgroundGradient: {
          type: 'linear',
          stops: [
            { offset: 0, color: '#224400' },
            { offset: 1, color: '#112200' }
          ]
        }
      }
    };
  }

  openMenu(): void {
    if (!this.queue.length) {
      audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx');
      return;
    }

    if (this.open || this.animationPhase !== null) {
      return;
    }

    audioManager.play('assets/sounds/sfx/ui/activate_01.wav', 'sfx');
    this.slideX = -this.BASE_WINDOW_WIDTH - 320; // Extra starting offscreen buffer
    this.animationPhase = 'pre-open';
    this.preOpenTimer = this.PRE_OPEN_DURATION;
    this.open = true;

    menuOpened({ id: 'blockDropDecisionMenu' });
  }

  enqueueBlock(blockType: BlockType): void {
    this.queue.push({ blockType });
    PlayerResources.getInstance().incrementBlockCount(1);
    PlayerResources.getInstance().setLastGatheredBlock(blockType);
    console.log('[BlockDropDecisionMenu] Enqueued block', blockType.name);
    this.updateNextBlockPreview();
  }

  private updateNextBlockPreview(): void {
    // Update the next block preview renderer based on queue state
    const nextBlock = this.queue.length > 0 ? this.queue[0]?.blockType : null;
    this.nextBlockPreviewRenderer = nextBlock
      ? new BlockPreviewRenderer(nextBlock, 0, 0)
      : null;
  }

  update(dt: number): void {
    if (!this.open) return;

    const mouse = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();
    const scale = getUniformScaleFactor();
    
    // === Animate block preview ===
    this.blockPreviewRenderer?.update(dt);
    this.nextBlockPreviewRenderer?.update(dt);

    // === Pre-open buffering ===
    if (this.animationPhase === 'pre-open') {
      
      console.log('[BlockDropDecisionMenu] Pre-opening timer: ', this.preOpenTimer);
      this.preOpenTimer -= dt * 1000;
      if (this.preOpenTimer <= 0) {
        console.log('[BlockDropDecisionMenu] Pre-open timer expired, starting slide-in');
        this.beginSlideIn();
      }
      return;
    }

    // === Handle slide animations ===
    if (this.isAnimating) {
      if (this.animationPhase === 'sliding-in') {
        // Pause game
        this.pause();

        // Zoom in camera for ease of block placement
        const cam = Camera.getInstance();
        cam.animateZoomTo(this.getMenuTargetZoom());

        this.slideX += this.SLIDE_SPEED * dt;
        if (this.slideX >= this.targetX + this.OVERSHOOT_DISTANCE) {
          console.log('[BlockDropDecisionMenu] Slide-in overshoot, settling');
          this.animationPhase = 'settling';
          this.slideX = this.targetX + this.OVERSHOOT_DISTANCE; // Clamp to exact overshoot
        }
      } else if (this.animationPhase === 'settling') {
        // FIX: Use dt to make animation frame-rate independent
        this.slideX -= this.SETTLE_SPEED * dt;
        if (this.slideX <= this.targetX) {
          console.log('[BlockDropDecisionMenu] Settled, opening');
          this.slideX = this.targetX;
          this.animationPhase = 'open';
          this.isAnimating = false;
        }
      } else if (this.animationPhase === 'sliding-out') {
        console.log('[BlockDropDecisionMenu] Sliding out');
        // FIX: Use dt to make animation frame-rate independent
        this.slideX -= this.SLIDE_SPEED * dt;
        if (this.slideX <= -this.BASE_WINDOW_WIDTH - 200) {
          this.slideX = -this.BASE_WINDOW_WIDTH - 320;
          this.animationPhase = null;
          this.isAnimating = false;
          this.open = false;
          this.currentBlockType = null;
          this.blockPreviewRenderer = null;
          this.nextBlockPreviewRenderer = null;
          this.resume();
        }
      }
        const scaledSlideX = this.slideX * scale;
        const scaledWindowX = this.BASE_WINDOW_X * scale;
        const scaledWindowY = this.BASE_WINDOW_Y * scale;
        const scaledWindowWidth = this.BASE_WINDOW_WIDTH * scale;
        const scaledWindowHeight = this.BASE_WINDOW_HEIGHT * scale;
        const scaledButtonWidth = this.BASE_BUTTON_WIDTH * scale;
        const scaledButtonHeight = this.BASE_BUTTON_HEIGHT * scale;
        const buttonSpacing = 32 * scale;

        // Compute button row starting X (centered pair)
        const totalButtonWidth = scaledButtonWidth * 2 + buttonSpacing;
        const buttonRowX = scaledWindowX + scaledSlideX + (scaledWindowWidth - totalButtonWidth) / 2;
        const buttonRowY = scaledWindowY + scaledWindowHeight - (scaledButtonHeight + 32);

        // Update refine button
        this.refineButton.x = buttonRowX;
        this.refineButton.y = buttonRowY;

        // Update autoplace button (to the right of refine)
        this.autoplaceButton.x = buttonRowX + scaledButtonWidth + buttonSpacing;
        this.autoplaceButton.y = buttonRowY;

        return; // Don't process mouse input during animation
    }

    // === Open phase: handle interaction ===
    if (!mouse) return;
    const { x, y } = mouse;

    // Hover logic
    const rect = {
      x: this.refineButton.x,
      y: this.refineButton.y,
      width: this.refineButton.width,
      height: this.refineButton.height
    };

    this.refineButton.isHovered = isMouseOverRect(x, y, rect, scale);

    // Click logic
    if (clicked && this.refineButton.isHovered) {
      this.refineButton.onClick();
    }

    const autoRect = {
      x: this.autoplaceButton.x,
      y: this.autoplaceButton.y,
      width: this.autoplaceButton.width,
      height: this.autoplaceButton.height
    };

    this.autoplaceButton.isHovered = isMouseOverRect(x, y, autoRect, scale);

    if (clicked && this.autoplaceButton.isHovered) {
      this.autoplaceButton.onClick();
    }
  }

  private beginSlideIn(): void {
    this.initialize();
    this.open = true;
    this.targetX = 0;
    this.isAnimating = true;
    this.animationPhase = 'sliding-in';
    
    const cam = Camera.getInstance();
    this.originalZoom = cam.getZoom();

    this.currentBlockType = this.queue.shift()?.blockType ?? null;
    this.blockPreviewRenderer = this.currentBlockType
      ? new BlockPreviewRenderer(this.currentBlockType)
      : null;
    
    // Update next block preview after shifting current block
    this.updateNextBlockPreview();
  }

  private handleRefine(): void {
    // Give player currency (Entropium) equal to the block cost
    PlayerResources.getInstance().addCurrency(this.currentBlockType?.cost ?? 0);
    PlayerResources.getInstance().incrementBlockCount(-1);
    audioManager.play('assets/sounds/sfx/ship/repair_00.wav', 'sfx');
    missionResultStore.incrementBlockRefinedCount();
    this.advanceQueueOrClose();
  }

  private handleAutoplace(): void {
    if (!this.currentBlockType) return;

    const success = autoPlaceBlock(this.ship, this.currentBlockType, this.shipBuilderEffects);
    if (!success) {
      audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx');
      return;
    }

    PlayerResources.getInstance().incrementBlockCount(-1);
    missionResultStore.incrementBlockPlacedCount();
    this.advanceQueueOrClose();
  }

  public advanceQueueOrClose(): void {
    this.currentBlockType = this.queue.shift()?.blockType ?? null;
    this.blockPreviewRenderer = this.currentBlockType
      ? new BlockPreviewRenderer(this.currentBlockType, this.BASE_BLOCK_SPIN_SPEED, this.BASE_BLOCK_SPIN_SPEED * 2)
      : null;

    // Update next block preview after advancing
    this.updateNextBlockPreview();

    if (!this.currentBlockType) {
      this.isAnimating = true;
      this.animationPhase = 'sliding-out';
      const camera = Camera.getInstance();
      camera.animateZoomTo(this.originalZoom);
      menuClosed({ id: 'blockDropDecisionMenu' });
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.animationPhase === null && !this.open) return;

    const scale = getUniformScaleFactor();
    const scaledSlideX = this.slideX * scale;
    const scaledWindowX = this.BASE_WINDOW_X * scale;
    const scaledWindowY = this.BASE_WINDOW_Y * scale;
    const scaledWindowWidth = this.BASE_WINDOW_WIDTH * scale;
    const scaledWindowHeight = this.BASE_WINDOW_HEIGHT * scale;
    const scaledBlockPreviewHeight = this.BASE_BLOCK_PREVIEW_HEIGHT * scale;
    const scaledBlockPreviewWidth = this.BASE_BLOCK_PREVIEW_WIDTH * scale;
    const scaledLabelFontSize = Math.floor(this.LABEL_FONT_SIZE * scale);
    const scaledMiniPreviewHeight = this.BASE_MINI_PREVIEW_HEIGHT * scale;
    const scaledMiniPreviewWidth = this.BASE_MINI_PREVIEW_WIDTH * scale;

    drawWindow({
      ctx,
      x: scaledWindowX + scaledSlideX,
      y: scaledWindowY,
      width: scaledWindowWidth,
      height: scaledWindowHeight,
      options: {
        borderRadius: 12,
        alpha: 0.6,
        borderColor: '#00ff00',
        backgroundGradient: {
          type: 'linear',
          stops: [
            { offset: 0, color: '#002200' },
            { offset: 1, color: '#001500' }
          ]
        }
      }
    });

    // Label centered horizontally, and offset a bit from the top vertically
    drawLabel(
      ctx,
      scaledWindowX + scaledSlideX + (scaledWindowWidth / 2),
      scaledWindowY + (42 * scale),
      this.currentBlockType?.name ?? '',
      {
        font: `${scaledLabelFontSize}px monospace`,
        align: 'center',
        glow: true,
      },
    );

    // Draw animated block preview
    // Centered horizontally, and below the label with some space
    if (this.blockPreviewRenderer) {
      const previewX = scaledWindowX + scaledSlideX + (scaledWindowWidth / 2) - (scaledBlockPreviewWidth / 2);
      const previewY = scaledWindowY + (128 * scale);
      this.blockPreviewRenderer.render(ctx, previewX, previewY, scaledBlockPreviewWidth, scaledBlockPreviewHeight);
    }

    // Queue count label
    // In the top left of the window
    if (this.queue.length > 0) {
      drawLabel(
        ctx,
        scaledWindowX + scaledSlideX + (16 * scale),
        scaledWindowY + (16 * scale),
        `+${this.queue.length} more`,
        {
          font: `${scaledLabelFontSize}px monospace`,
          align: 'left',
          glow: false,
        },
      );
    }

    // "Next:" label and mini preview in top right
    if (this.queue.length > 0 && this.nextBlockPreviewRenderer) {
      const nextLabelText = 'Next:';
      const nextLabelX = scaledWindowX + scaledSlideX + scaledWindowWidth - (16 * scale) - scaledMiniPreviewWidth - (8 * scale);
      const nextLabelY = scaledWindowY + (16 * scale);
      
      // Draw "Next:" label
      drawLabel(
        ctx,
        nextLabelX,
        nextLabelY,
        nextLabelText,
        {
          font: `${scaledLabelFontSize}px monospace`,
          align: 'right',
          glow: false,
        },
      );

      // Draw mini block preview to the right of the label
      const miniPreviewX = scaledWindowX + scaledSlideX + scaledWindowWidth - (16 * scale) - scaledMiniPreviewWidth;
      const miniPreviewY = scaledWindowY + (8 * scale);
      this.nextBlockPreviewRenderer.render(ctx, miniPreviewX, miniPreviewY, scaledMiniPreviewWidth, scaledMiniPreviewHeight);
    }

    if (this.currentBlockType) {
      const statsX = scaledWindowX + scaledSlideX + (32 * scale);
      const statsY = scaledWindowY + (128 * scale) + scaledBlockPreviewHeight + (48 * scale);
      const statsWidth = scaledWindowWidth - (64 * scale);
      drawBlockStatsLabels(ctx, this.currentBlockType, statsX, statsY, statsWidth, scale);
    }

    if (this.animationPhase === 'open' || this.currentBlockType) {
      drawButton(ctx, this.refineButton, scale);
      drawButton(ctx, this.autoplaceButton, scale);
    }
  }

  getCurrentBlockType(): BlockType | null {
    return this.currentBlockType;
  }

  isOpen(): boolean {
    return this.open;
  }

  closeMenu(): void {
    this.open = false;
    this.queue.length = 0;
    this.currentBlockType = null;
    this.nextBlockPreviewRenderer = null;
    menuClosed({ id: 'blockDropDecisionMenu' });
  }

  isBlocking(): boolean {
    return this.open;
  }

  isPointInBounds(x: number, y: number): boolean {
    const left = this.BASE_WINDOW_X + this.slideX;
    const right = left + this.BASE_WINDOW_WIDTH;
    const bottom = this.BASE_WINDOW_Y + this.BASE_WINDOW_HEIGHT;
    return x >= left && x <= right && y >= this.BASE_WINDOW_Y && y <= bottom;
  }

  hasBlocksInQueue(): boolean {
    return this.queue.length > 0;
  }

  private getMenuTargetZoom(): number {
    // Empirically tuned constant * uniform scale
    return 0.5 * getUniformScaleFactor();
  }

  destroy(): void {
    this.pause = () => {};
    this.resume = () => {};
    this.nextBlockPreviewRenderer = null;
  }
}