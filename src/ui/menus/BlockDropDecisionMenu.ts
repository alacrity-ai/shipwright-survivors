// src/ui/menus/BlockDropDecisionMenu.ts

import type { Menu } from '@/ui/interfaces/Menu';
import type { InputManager } from '@/core/InputManager';
import type { BlockType } from '@/game/interfaces/types/BlockType';
import type { Ship } from '@/game/ship/Ship';
import type { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';

// TODO : Replace this with procedural ergonomic labels on buttons
// import { AnimatedSpriteOrchestrator } from '@/rendering/sprites/AnimatedSpriteOrchestrator';
// import { blockDropDecisionMenuSpritesDefinition } from '@/rendering/sprites/definitions/spriteDefinitions';
// import { CanvasManager } from '@/core/CanvasManager';

import { brightenColor } from '@/shared/colorUtils';
import { BLOCK_TIER_COLORS } from '@/game/blocks/BlockColorSchemes';
import { getTierFromBlockType } from '@/game/blocks/BlockRegistry';
import { getAllBlocksInTier } from '@/game/blocks/BlockRegistry';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { menuOpened, menuClosed } from '@/core/interfaces/events/MenuOpenReporter';
import { PlayerResources } from '@/game/player/PlayerResources';

// import { autoPlaceBlock } from '@/ui/menus/helpers/autoPlaceBlock'; // OLD METHOD
import { autoPlaceBlockWithArchetype as autoPlaceBlock } from '@/systems/autoplacement/autoPlaceAdvanced';
import { getArchetypeById } from '@/systems/autoplacement/ShipArchetypeSystem';

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

  private isAutoPlacingAll = false;

  private animationPhase: Phase = null;
  private slideX = -800;
  private targetX = 0;
  private isAnimating = false;

  private originalZoom: number = 0;

  // === Interaction State Tracking ===
  private hoveredButton: 'refine' | 'autoplace' | 'roll' | 'autoPlaceAll' | null = null;
  private clickedButton: 'refine' | 'autoplace' | 'roll' | 'autoPlaceAll' | null = null;
  private didAdvance: boolean = false;

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
  private readonly BASE_BUTTON_VERTICAL_GAP = 10;

  private readonly BASE_BLOCK_PREVIEW_HEIGHT = 82;
  private readonly BASE_BLOCK_PREVIEW_WIDTH = 82;
  private readonly BASE_BLOCK_SPIN_SPEED = 1;

  // Mini preview dimensions for "Next:" block
  private readonly BASE_MINI_PREVIEW_HEIGHT = 32;
  private readonly BASE_MINI_PREVIEW_WIDTH = 32;

  private refineButton: UIButton = {} as UIButton;
  private autoplaceButton: UIButton = {} as UIButton;
  private randomRollButton: UIButton = {} as UIButton;
  private autoPlaceAllButton: UIButton = {} as UIButton;

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
        borderColor: '#ffcc00',
        backgroundGradient: {
          type: 'linear',
          stops: [
            { offset: 0, color: '#332800' },
            { offset: 1, color: '#1f1800' }
          ]
        },
        textColor: '#ffffaa',
      }
    };

    this.randomRollButton = {
      x: buttonRowX + this.slideX * scaled,
      y: baseY - this.BASE_BUTTON_VERTICAL_GAP * scaled,
      width: this.BASE_BUTTON_WIDTH,
      height: this.BASE_BUTTON_HEIGHT,
      label: 'Reroll',
      onClick: () => this.handleRoll(),
      style: {
        borderRadius: 8,
        alpha: 0.95,
        borderColor: '#cc66ff',
        backgroundGradient: {
          type: 'linear',
          stops: [
            { offset: 0, color: '#330033' },
            { offset: 1, color: '#1a0022' }
          ]
        },
        textColor: '#ffccff',
      }
    };

    this.autoplaceButton = {
      x: buttonRowX + this.BASE_BUTTON_WIDTH + buttonSpacing + this.slideX * scaled,
      y: baseY,
      width: this.BASE_BUTTON_WIDTH,
      height: this.BASE_BUTTON_HEIGHT,
      label: 'Attach',
      onClick: () => this.handleAutoplace(),
      style: {
        borderRadius: 8,
        alpha: 0.95,
        borderColor: '#00ccff',
        backgroundGradient: {
          type: 'linear',
          stops: [
            { offset: 0, color: '#003344' },
            { offset: 1, color: '#001a22' }
          ]
        },
        textColor: '#aaffff',
      }
    };

    this.autoPlaceAllButton = {
      x: buttonRowX + this.BASE_BUTTON_WIDTH + buttonSpacing + this.slideX * scaled,
      y: baseY - this.BASE_BUTTON_VERTICAL_GAP * scaled,
      width: this.BASE_BUTTON_WIDTH,
      height: this.BASE_BUTTON_HEIGHT,
      label: 'Attach All',
      onClick: () => this.autoPlaceAll(),
      style: {
        borderRadius: 8,
        alpha: 0.95,
        borderColor: '#66ff66',
        backgroundGradient: {
          type: 'linear',
          stops: [
            { offset: 0, color: '#003300' },
            { offset: 1, color: '#001a00' }
          ]
        },
        textColor: '#ccffcc',
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

    menuOpened('blockDropDecisionMenu');
  }

  enqueueBlock(blockType: BlockType): void {
    this.queue.push({ blockType });
    PlayerResources.getInstance().enqueueBlock(blockType);
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
      
      this.preOpenTimer -= dt * 1000;
      if (this.preOpenTimer <= 0) {
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
          this.animationPhase = 'settling';
          this.slideX = this.targetX + this.OVERSHOOT_DISTANCE; // Clamp to exact overshoot
        }
      } else if (this.animationPhase === 'settling') {
        // FIX: Use dt to make animation frame-rate independent
        this.slideX -= this.SETTLE_SPEED * dt;
        if (this.slideX <= this.targetX) {
          this.slideX = this.targetX;
          this.animationPhase = 'open';
          this.isAnimating = false;
        }
      } else if (this.animationPhase === 'sliding-out') {
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
          this.hoveredButton = null;
          this.clickedButton = null;
          this.didAdvance = false;
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

        // Auto Place All button (above autoplace)
        this.autoPlaceAllButton.x = buttonRowX + scaledButtonWidth + buttonSpacing;
        this.autoPlaceAllButton.y = buttonRowY - scaledButtonHeight - (this.BASE_BUTTON_VERTICAL_GAP * scale);

        // Update random roll button (above refine and autoplace)
        this.randomRollButton.x = buttonRowX;
        this.randomRollButton.y = buttonRowY - scaledButtonHeight - (this.BASE_BUTTON_VERTICAL_GAP * scale);

        return; // Don't process mouse input during animation
    }

    // === Open phase: handle interaction ===
    this.hoveredButton = null;
    if (!mouse) return;
    const { x, y } = mouse;

    // == Return if autoplacing all
    if (this.isAutoPlacingAll) return;

    // == Refine Button:
    const rect = {
      x: this.refineButton.x,
      y: this.refineButton.y,
      width: this.refineButton.width,
      height: this.refineButton.height
    };

    this.refineButton.isHovered = isMouseOverRect(x, y, rect, scale);
    if (this.refineButton.isHovered) this.hoveredButton = 'refine';

    if (clicked && this.refineButton.isHovered) {
      this.refineButton.onClick();
    }

    // == Autoplace Button:
    const autoRect = {
      x: this.autoplaceButton.x,
      y: this.autoplaceButton.y,
      width: this.autoplaceButton.width,
      height: this.autoplaceButton.height
    };

    this.autoplaceButton.isHovered = isMouseOverRect(x, y, autoRect, scale);
    if (this.autoplaceButton.isHovered) this.hoveredButton = 'autoplace';

    if (clicked && this.autoplaceButton.isHovered) {
      this.autoplaceButton.onClick();
    }

    // == Auto Place All Button:
    const allRect = {
      x: this.autoPlaceAllButton.x,
      y: this.autoPlaceAllButton.y,
      width: this.autoPlaceAllButton.width,
      height: this.autoPlaceAllButton.height
    };

    this.autoPlaceAllButton.isHovered = isMouseOverRect(x, y, allRect, scale);
    if (this.autoPlaceAllButton.isHovered) this.hoveredButton = 'autoPlaceAll';

    if (clicked && this.autoPlaceAllButton.isHovered) {
      this.autoPlaceAllButton.onClick();
    }

    // == Random Roll Button:
    const rollRect = {
      x: this.randomRollButton.x,
      y: this.randomRollButton.y,
      width: this.randomRollButton.width,
      height: this.randomRollButton.height
    };

    this.randomRollButton.isHovered = isMouseOverRect(x, y, rollRect, scale);
    if (this.randomRollButton.isHovered) this.hoveredButton = 'roll';

    if (clicked && this.randomRollButton.isHovered) {
      this.randomRollButton.onClick();
    }

    // Gamepad Support
    if (this.inputManager.wasActionJustPressed('cancel')) {
      this.refineButton.onClick();
    }
    if (this.inputManager.wasActionJustPressed('select')) {
      this.autoplaceButton.onClick();
    }

    // === Reset one-frame state
    this.clickedButton = null;
    this.didAdvance = false;
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

  // Grey out all buttons
  disableButton(button: UIButton): void {
    button.disabled = true;
  }

  private restoreButtons(): void {
    this.isAutoPlacingAll = false;

    // Re-enable interaction
    this.refineButton.disabled = false;
    this.autoplaceButton.disabled = false;
    this.randomRollButton.disabled = false;
    this.autoPlaceAllButton.disabled = false;

    // Restore handlers (if they were nulled)
    this.refineButton.onClick = () => this.handleRefine();
    this.autoplaceButton.onClick = () => this.handleAutoplace();
    this.randomRollButton.onClick = () => this.handleRoll();
    this.autoPlaceAllButton.onClick = () => this.autoPlaceAll();
  }

  private handleRefine(): void {
    // Give player currency (Entropium) equal to the block cost
    PlayerResources.getInstance().addCurrency(this.currentBlockType?.cost ?? 0);
    PlayerResources.getInstance().dequeueBlock();
    audioManager.play('assets/sounds/sfx/ship/repair_00.wav', 'sfx');
    missionResultStore.incrementBlockRefinedCount();
    this.advanceQueueOrClose();
    this.clickedButton = 'refine';
  }

  private handleAutoplace(): void {
    if (!this.currentBlockType) return;

    const archetype = getArchetypeById('interceptor'); // TODO: Get from player prefs
    
    const success = autoPlaceBlock(this.ship, this.currentBlockType, this.shipBuilderEffects, archetype ?? undefined);
    if (!success) {
      audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx');
      return;
    }

    PlayerResources.getInstance().dequeueBlock();
    missionResultStore.incrementBlockPlacedCount();
    this.advanceQueueOrClose();
    this.clickedButton = 'autoplace';
  }

  public async autoPlaceAll(): Promise<void> {
    if (this.isAutoPlacingAll) return; // Prevent re-entry

    this.isAutoPlacingAll = true;

    // Disable all button interaction
    this.refineButton.onClick = () => {};
    this.autoplaceButton.onClick = () => {};
    this.randomRollButton.onClick = () => {};
    this.autoPlaceAllButton.onClick = () => {};

    this.disableButton(this.refineButton);
    this.disableButton(this.autoplaceButton);
    this.disableButton(this.randomRollButton);
    this.disableButton(this.autoPlaceAllButton);

    // Execute placement loop
    const archetype = getArchetypeById('interceptor');
    const delayBase = 300;
    const delayMin = 50;
    const decayRate = 0.85;

    let delay = delayBase;

    while (this.currentBlockType && this.queue.length >= 0) {
      const success = autoPlaceBlock(this.ship, this.currentBlockType, this.shipBuilderEffects, archetype ?? undefined);
      if (!success) {
        audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx');
        this.restoreButtons(); // ← critical
        return;
      }

      PlayerResources.getInstance().dequeueBlock();
      missionResultStore.incrementBlockPlacedCount();

      this.advanceQueueOrClose();

      if (!this.currentBlockType) break;

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.max(delay * decayRate, delayMin);
    }

    if (this.currentBlockType) {
      this.restoreButtons();
    }

    this.clickedButton = 'autoPlaceAll';
  }

  private handleRoll(): void {
    // Must have at least 3 total: currentBlockType + 2 in queue
    if (this.queue.length + 1 < 3 || !this.currentBlockType) {
      audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx');
      return;
    }

    // === Compute averaged base tier from 3 blocks ===
    const sacrificeBlocks: BlockType[] = [
      this.currentBlockType,
      ...this.queue.slice(0, 2).map(entry => entry.blockType),
    ];

    const baseTier = Math.floor(
      sacrificeBlocks.reduce((sum, blockType) => sum + getTierFromBlockType(blockType), 0) / sacrificeBlocks.length
    );

    // === Determine reward tier with probabilities ===
    let finalTier = baseTier;
    const roll = Math.random();
    if (roll < 0.02) {
      finalTier = Math.min(baseTier + 2, 4);
    } else if (roll < 0.15) {
      finalTier = Math.min(baseTier + 1, 4);
    }

    const tierDelta = finalTier - baseTier;

    const candidates = getAllBlocksInTier(finalTier);
    if (!candidates.length) {
      console.warn(`[handleRoll] No blocks found for tier ${finalTier}`);
      return;
    }

    const rewardBlock = candidates[Math.floor(Math.random() * candidates.length)];

    // Dequeue current block (currentBlockType)
    PlayerResources.getInstance().dequeueBlock();

    // Dequeue next 2 from queue
    for (let i = 0; i < 2; i++) {
      if (this.queue.length > 0) {
        this.queue.shift();
        PlayerResources.getInstance().dequeueBlock();
      }
    }

    // Enqueue reward block to front
    this.queue.unshift({ blockType: rewardBlock });
    PlayerResources.getInstance().enqueueBlockToFront(rewardBlock);

    // === Tier-specific Audio Feedback ===
    const soundMap: Record<number, string> = {
      0: 'assets/sounds/sfx/ui/gamblewin_00.wav',
      1: 'assets/sounds/sfx/ui/gamblewin_01.wav',
      2: 'assets/sounds/sfx/ui/gamblewin_02.wav',
    };

    const soundPath = soundMap[tierDelta] ?? soundMap[0];

    audioManager.play(soundPath, 'sfx', { maxSimultaneous: 5 });

    this.advanceQueueOrClose();
    this.clickedButton = 'roll';
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
      this.isAutoPlacingAll = false;
      menuClosed('blockDropDecisionMenu');
    } else {
      this.didAdvance = true;
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
    const blockTier = this.currentBlockType ? getTierFromBlockType(this.currentBlockType) : 1;
    const tierColor = BLOCK_TIER_COLORS[blockTier] ?? '#ffffff';

    drawLabel(
      ctx,
      scaledWindowX + scaledSlideX + (scaledWindowWidth / 2),
      scaledWindowY + (42 * scale),
      this.currentBlockType?.name ?? '',
      {
        font: `${scaledLabelFontSize}px monospace`,
        align: 'center',
        // glow: true,
        color: brightenColor(tierColor, 0.5),
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
      const statsY = scaledWindowY + (128 * scale) + scaledBlockPreviewHeight + (32 * scale);
      const statsWidth = scaledWindowWidth - (64 * scale);
      drawBlockStatsLabels(ctx, this.currentBlockType, statsX, statsY, statsWidth, scale);
    }

    if (this.animationPhase === 'open' || this.currentBlockType) {
      drawButton(ctx, this.refineButton, scale);
      drawButton(ctx, this.autoplaceButton, scale);
      drawButton(ctx, this.randomRollButton, scale);
      drawButton(ctx, this.autoPlaceAllButton, scale);
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
    menuClosed('blockDropDecisionMenu');
  }

  isBlocking(): boolean {
    return this.open;
  }

  isPointInBounds(x: number, y: number): boolean {
    const scale = getUniformScaleFactor();
    const left = this.BASE_WINDOW_X + this.slideX * scale;
    const right = left + this.BASE_WINDOW_WIDTH * scale;
    const bottom = this.BASE_WINDOW_Y + this.BASE_WINDOW_HEIGHT * scale;
    return x >= left && x <= right && y >= this.BASE_WINDOW_Y && y <= bottom;
  }

  hasBlocksInQueue(): boolean {
    return this.queue.length > 0;
  }

  private getMenuTargetZoom(): number {
    // Empirically tuned constant * uniform scale
    return 0.5 * getUniformScaleFactor();
  }

  public getHoveredButton(): 'refine' | 'autoplace' | 'roll' | 'autoPlaceAll' | null {
    return this.hoveredButton;
  }

  public getClickedButton(): 'refine' | 'autoplace' | 'roll' | 'autoPlaceAll' | null {
    return this.clickedButton;
  }

  public didAdvanceQueue(): boolean {
    return this.didAdvance;
  }

  destroy(): void {
    this.pause = () => {};
    this.resume = () => {};
    this.nextBlockPreviewRenderer = null;
  }
}