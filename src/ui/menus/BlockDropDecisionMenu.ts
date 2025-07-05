// src/ui/menus/BlockDropDecisionMenu.ts

import type { Menu } from '@/ui/interfaces/Menu';
import type { InputManager } from '@/core/InputManager';
import type { BlockType } from '@/game/interfaces/types/BlockType';
import type { Ship } from '@/game/ship/Ship';
import type { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';

import { DEFAULT_CONFIG } from '@/config/ui';

import { CoachMarkManager } from '@/rendering/coachmarks/CoachMarkManager';
import { createBlockDropDecisionMenuCoachMark } from '@/rendering/coachmarks/helpers/createBlockDropDecisionMenuCoachMark';

import { brightenColor } from '@/shared/colorUtils';
import { BLOCK_TIER_COLORS } from '@/game/blocks/BlockColorSchemes';
import { getTierFromBlockType } from '@/game/blocks/BlockRegistry';
import { getAllBlocksInTier } from '@/game/blocks/BlockRegistry';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { menuOpened, menuClosed } from '@/core/interfaces/events/MenuOpenReporter'; // Deprecated
import { PlayerResources } from '@/game/player/PlayerResources';

import { GlobalEventBus } from '@/core/EventBus';
import { GlobalMenuReporter } from '@/core/GlobalMenuReporter';

import { autoPlaceBlockWithArchetype as autoPlaceBlock } from '@/systems/autoplacement/autoPlaceAdvanced';
import { getArchetypeById } from '@/systems/autoplacement/ShipArchetypeSystem';

import { BlockPreviewRenderer } from '@/ui/components/BlockPreviewRenderer';
import { drawBlockStatsLabels } from '@/ui/menus/helpers/drawBlockStatsLabels';
import { drawWindow } from '@/ui/primitives/WindowBox';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawButton, handleButtonInteraction, type UIButton } from '@/ui/primitives/UIButton';
import { getUniformScaleFactor } from '@/config/view';
import { Camera } from '@/core/Camera';
import { audioManager } from '@/audio/Audio';
import { PlayerExperienceManager } from '@/game/player/PlayerExperienceManager';

type ButtonId = 'refine' | 'autoplace' | 'roll' | 'autoPlaceAll';

type Phase = 'pre-open' | 'sliding-in' | 'settling' | 'open' | 'sliding-out' | null;

export class BlockDropDecisionMenu implements Menu {
  private ship: Ship | null = null;

  private open = false;

  private blockPreviewRenderer: BlockPreviewRenderer | null = null;
  private nextBlockPreviewRenderer: BlockPreviewRenderer | null = null;

  private isAutoPlacingAll = false;

  private animationPhase: Phase = null;
  private slideX = -800;
  private targetX = 0;
  private isAnimating = false;

  private originalZoom: number = 0;

  // === Interaction State Tracking ===
  private hoveredButton: ButtonId | null = null;
  private clickedButton: ButtonId | null = null;

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

  // Coachmark Positions
  private coachMarksVisible: boolean = false;
  private readonly COACHMARK_BASE_X = 122;
  private readonly COACHMARK_BASE_Y = 452;

  private refineButton: UIButton = {} as UIButton;
  private autoplaceButton: UIButton = {} as UIButton;
  private randomRollButton: UIButton = {} as UIButton;
  private autoPlaceAllButton: UIButton = {} as UIButton;

  private shipBuilderEffects: ShipBuilderEffectsSystem;
  private pause: () => void;
  private resume: () => void;

  // Button Locks
  private attachLocked: boolean = false;
  private attachAllLocked: boolean = false;
  private refineLocked: boolean = false;
  private rollLocked: boolean = false;

  constructor(
    private readonly inputManager: InputManager,
    shipBuilderEffects: ShipBuilderEffectsSystem,
    pause: () => void,
    resume: () => void
  ) {
    this.shipBuilderEffects = shipBuilderEffects;
    this.pause = pause;
    this.resume = resume;
    this.initialize();

    GlobalEventBus.on('blockdropdecision:attach:lock', this.handleLockAttach);
    GlobalEventBus.on('blockdropdecision:attach:unlock', this.handleUnlockAttach);
    GlobalEventBus.on('blockdropdecision:attach-all:lock', this.handleLockAttachAll);
    GlobalEventBus.on('blockdropdecision:attach-all:unlock', this.handleUnlockAttachAll);
    GlobalEventBus.on('blockdropdecision:refine:lock', this.handleLockRefine);
    GlobalEventBus.on('blockdropdecision:refine:unlock', this.handleUnlockRefine);
    GlobalEventBus.on('blockdropdecision:roll:lock', this.handleLockRoll);
    GlobalEventBus.on('blockdropdecision:roll:unlock', this.handleUnlockRoll);
    GlobalEventBus.on('blockdropdecision:lock-all', this.handleLockAll);
    GlobalEventBus.on('blockdropdecision:unlock-all', this.handleUnlockAll);

    GlobalEventBus.on('blockqueue:request-place', this.handleBlockQueueRequest);
    GlobalEventBus.on('blockqueue:request-refine', this.handleBlockQueueRefineRequest);
    GlobalEventBus.on('blockqueue:request-placeall', this.handleBlockQueuePlaceAllRequest);
  }

  setPlayerShip(ship: Ship): void {
    this.ship = ship;
  }

  private handleLockAll = (): void => {
    this.attachAllLocked = true;
    this.attachLocked = true;
    this.refineLocked = true;
    this.rollLocked = true;
  };

  private handleUnlockAll = (): void => {
    this.attachAllLocked = false;
    this.attachLocked = false;
    this.refineLocked = false;
    this.rollLocked = false;
  };

  private handleLockAttach = (): void => {
    this.attachLocked = true;
  };

  private handleUnlockAttach = (): void => {
    this.attachLocked = false;
  };

  private handleLockAttachAll = (): void => {
    this.attachAllLocked = true;
  };

  private handleUnlockAttachAll = (): void => {
    this.attachAllLocked = false;
  };

  private handleLockRefine = (): void => {
    this.refineLocked = true;
  };

  private handleUnlockRefine = (): void => {
    this.refineLocked = false;
  };

  private handleLockRoll = (): void => {
    this.rollLocked = true;
  };

  private handleUnlockRoll = (): void => {
    this.rollLocked = false;
  };

  private initialize(): void {
    this.inputManager.setGamepadCursorOverrideEnabled(false);

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
    const globalQueue = PlayerResources.getInstance().getBlockQueue();
    if (!globalQueue.length) {
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

    GlobalMenuReporter.getInstance().setMenuOpen('blockDropDecisionMenu');
    menuOpened('blockDropDecisionMenu'); // Deprecated
  }

  enqueueBlock(blockType: BlockType): void {
    PlayerResources.getInstance().enqueueBlock(blockType);
    if (this.open) {
      this.rebuildInternalQueueFromGlobal();
    }
  }

  private rebuildInternalQueueFromGlobal(): void {
    const current = this.getCurrentBlockType();

    // If no blocks remain, close the menu
    if (!current) {
      this.coachMarksVisible = false;
      CoachMarkManager.getInstance().clear();
      this.isAnimating = true;
      this.animationPhase = 'sliding-out';
      Camera.getInstance().animateZoomTo(this.originalZoom);
      this.isAutoPlacingAll = false;
      menuClosed('blockDropDecisionMenu'); // Deprecated
      return;
    }

    // Otherwise just update the preview for next block
    this.updateNextBlockPreview();
  }

  private updateNextBlockPreview(): void {
    const queue = PlayerResources.getInstance().getBlockQueue();
    const nextBlock = queue.length > 1 ? queue[1] : null;

    this.nextBlockPreviewRenderer = nextBlock
      ? new BlockPreviewRenderer(nextBlock, 0, 0)
      : null;
  }

  update(dt: number): void {
    if (!this.open) return;
    if (!this.ship) return;

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
        this.pause();
        Camera.getInstance().animateZoomTo(this.getMenuTargetZoom());
        this.slideX += this.SLIDE_SPEED * dt;
        if (this.slideX >= this.targetX + this.OVERSHOOT_DISTANCE) {
          this.animationPhase = 'settling';
          this.slideX = this.targetX + this.OVERSHOOT_DISTANCE;
        }
      } else if (this.animationPhase === 'settling') {
        this.slideX -= this.SETTLE_SPEED * dt;
        if (this.slideX <= this.targetX) {
          this.slideX = this.targetX;
          this.animationPhase = 'open';
          this.isAnimating = false;
          createBlockDropDecisionMenuCoachMark(CoachMarkManager.getInstance(), this.COACHMARK_BASE_X, this.COACHMARK_BASE_Y);
          this.coachMarksVisible = true;
        }
      } else if (this.animationPhase === 'sliding-out') {
        this.slideX -= this.SLIDE_SPEED * dt;
        if (this.slideX <= -this.BASE_WINDOW_WIDTH - 200) {
          const totalMass = this.ship.getTotalMass();
          missionResultStore.incrementMassAchieved(totalMass);
          
          this.slideX = -this.BASE_WINDOW_WIDTH - 320;
          this.animationPhase = null;
          this.isAnimating = false;
          this.open = false;
          GlobalMenuReporter.getInstance().setMenuClosed('blockDropDecisionMenu');
          this.blockPreviewRenderer = null;
          this.nextBlockPreviewRenderer = null;
          this.hoveredButton = null;
          this.clickedButton = null;
          this.didAdvance = false;
          this.inputManager.setGamepadCursorOverrideEnabled(true);
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

      const totalButtonWidth = scaledButtonWidth * 2 + buttonSpacing;
      const buttonRowX = scaledWindowX + scaledSlideX + (scaledWindowWidth - totalButtonWidth) / 2;
      const buttonRowY = scaledWindowY + scaledWindowHeight - (scaledButtonHeight + 32);

      this.refineButton.x = buttonRowX;
      this.refineButton.y = buttonRowY;

      this.autoplaceButton.x = buttonRowX + scaledButtonWidth + buttonSpacing;
      this.autoplaceButton.y = buttonRowY;

      this.autoPlaceAllButton.x = buttonRowX + scaledButtonWidth + buttonSpacing;
      this.autoPlaceAllButton.y = buttonRowY - scaledButtonHeight - (this.BASE_BUTTON_VERTICAL_GAP * scale);

      this.randomRollButton.x = buttonRowX;
      this.randomRollButton.y = buttonRowY - scaledButtonHeight - (this.BASE_BUTTON_VERTICAL_GAP * scale);

      return;
    }

    // === Open phase: handle interaction ===
    if (!mouse) return;
    const { x, y } = mouse;

    if (this.isAutoPlacingAll) return;

    this.hoveredButton = null;
    this.clickedButton = null;
    this.didAdvance = false;

    // === Interaction loop for buttons ===
    const buttonMap: [UIButton, ButtonId, () => void][] = [
      [this.refineButton, 'refine', () => { this.clickedButton = 'refine'; }],
      [this.autoplaceButton, 'autoplace', () => { this.clickedButton = 'autoplace'; }],
      [this.randomRollButton, 'roll', () => { this.clickedButton = 'roll'; }],
      [this.autoPlaceAllButton, 'autoPlaceAll', () => { this.clickedButton = 'autoPlaceAll'; }],
    ];

    for (const [button, id, onClickSet] of buttonMap) {
      const wasClicked = handleButtonInteraction(button, x, y, clicked, scale);
      if (button.isHovered) this.hoveredButton = id;
      if (wasClicked) onClickSet();
    }

    // === Gamepad support ===
    if (this.inputManager.wasActionJustPressed('switchFiringMode') || this.inputManager.wasKeyJustPressed('KeyA')) {
      this.refineButton.onClick();
      this.clickedButton = 'refine';
    }

    if (this.inputManager.wasActionJustPressed('select') || this.inputManager.wasKeyJustPressed('KeyS')) {
      this.autoplaceButton.onClick();
      this.clickedButton = 'autoplace';
    }

    if (this.inputManager.wasActionJustPressed('openShipBuilder') || this.inputManager.wasKeyJustPressed('KeyW')) {
      this.randomRollButton.onClick();
      this.clickedButton = 'roll';
    }

    if (this.inputManager.wasActionJustPressed('cancel') || this.inputManager.wasKeyJustPressed('KeyD')) {
      this.autoPlaceAllButton.onClick();
      this.clickedButton = 'autoPlaceAll';
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

    // Preview the first block in the queue (no dequeue!)
    const current = this.getCurrentBlockType();
    this.blockPreviewRenderer = current
      ? new BlockPreviewRenderer(current)
      : null;

    // No need to set this.queue anymore
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
    if (this.refineLocked) return;

    const current = this.getCurrentBlockType();
    if (!current) return;

    // Refund currency based on block cost
    PlayerExperienceManager.getInstance().addEntropium(current.cost ?? 0);
    PlayerResources.getInstance().dequeueBlock();

    audioManager.play('assets/sounds/sfx/ui/coin_00.wav', 'sfx', { maxSimultaneous: 4 });
    missionResultStore.incrementBlockRefinedCount();

    this.advanceQueueOrClose();
    this.clickedButton = 'refine';
  }

  private handleAutoplace(): void {
    if (this.attachLocked) return;

    const current = this.getCurrentBlockType();
    if (!current || !this.ship) return;

    const archetype = getArchetypeById('interceptor'); // TODO: Get from player prefs

    const success = autoPlaceBlock(this.ship, current, this.shipBuilderEffects, archetype ?? undefined);
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
    if (this.attachAllLocked) return;

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

    const archetype = getArchetypeById('interceptor');
    const delayBase = 300;
    const delayMin = 10;
    const decayRate = 0.9;

    let delay = delayBase;

    while (this.getCurrentBlockType() && PlayerResources.getInstance().getBlockQueue().length > 0) {
      if (!this.ship) return;

      const current = this.getCurrentBlockType();
      if (!current) break;

      const success = autoPlaceBlock(this.ship, current, this.shipBuilderEffects, archetype ?? undefined);
      if (!success) {
        audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx');
        this.restoreButtons();
        return;
      }

      PlayerResources.getInstance().dequeueBlock();
      missionResultStore.incrementBlockPlacedCount();

      this.advanceQueueOrClose();

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.max(delay * decayRate, delayMin);
    }

    this.restoreButtons();
    this.clickedButton = 'autoPlaceAll';
  }

  public async externalAutoPlaceAll(): Promise<void> {
    const archetype = getArchetypeById('interceptor');
    const delayBase = 300;
    const delayMin = 10;
    const decayRate = 0.9;

    let delay = delayBase;

    while (PlayerResources.getInstance().getBlockQueue().length > 0) {
      if (!this.ship) return;

      const current = this.getCurrentBlockType();
      if (!current) break;

      const success = autoPlaceBlock(this.ship, current, this.shipBuilderEffects, archetype ?? undefined);
      if (!success) {
        audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx');
        this.restoreButtons();
        return;
      }

      PlayerResources.getInstance().dequeueBlock();
      missionResultStore.incrementBlockPlacedCount();

      // this.advanceQueueOrClose();

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.max(delay * decayRate, delayMin);
    }
  }

  private handleRoll(): void {
    if (this.rollLocked) return;

    const queue = PlayerResources.getInstance().getBlockQueue();
    const current = this.getCurrentBlockType();

    // Must have at least 3 total: current block + 2 in queue
    if (!current || queue.length < 3) {
      audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx');
      return;
    }

    // === Compute averaged base tier from 3 blocks ===
    const sacrificeBlocks: BlockType[] = [
      current,
      queue[1],
      queue[2],
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

    // Dequeue current block and next 2
    PlayerResources.getInstance().dequeueBlock(); // current
    PlayerResources.getInstance().dequeueBlock(); // 1st in queue
    PlayerResources.getInstance().dequeueBlock(); // 2nd in queue

    // Enqueue reward block to front
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
    const current = this.getCurrentBlockType();

    // Rebuild the main block preview if we still have a block
    this.blockPreviewRenderer = current
      ? new BlockPreviewRenderer(current, this.BASE_BLOCK_SPIN_SPEED, this.BASE_BLOCK_SPIN_SPEED * 2)
      : null;

    this.updateNextBlockPreview();

    if (!current) {
      this.coachMarksVisible = false;
      CoachMarkManager.getInstance().clear();
      this.isAnimating = true;
      this.animationPhase = 'sliding-out';
      Camera.getInstance().animateZoomTo(this.originalZoom);
      this.isAutoPlacingAll = false;
      menuClosed('blockDropDecisionMenu'); // Deprecated
    } else {
      this.didAdvance = true;
    }
  }

  // I NEED HELP HERE <---
  private handleBlockQueuePlaceAllRequest = (): void => {
    this.externalAutoPlaceAll();
  };

  private handleBlockQueueRequest = ({ blockTypeId, index }: { blockTypeId: string; index: number }): void => {
    if (!this.ship) return;

    const fullQueue = PlayerResources.getInstance().getBlockQueue();

    if (index < 0 || index >= fullQueue.length) {
      console.warn(`[BlockDropDecisionMenu] Invalid index ${index} for block queue`);
      return;
    }

    const block = fullQueue[index];
    if (block.id !== blockTypeId) {
      console.warn(`[BlockDropDecisionMenu] Block mismatch: index ${index} has id ${block.id}, expected ${blockTypeId}`);
      return;
    }

    const archetype = getArchetypeById('interceptor');
    const success = autoPlaceBlock(this.ship, block, this.shipBuilderEffects, archetype ?? undefined);

    if (!success) {
      audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx');
      return;
    }

    PlayerResources.getInstance().removeBlockAt(index);
    missionResultStore.incrementBlockPlacedCount();
    audioManager.play('assets/sounds/sfx/ship/attach_00.wav', 'sfx');

    if (this.open) this.rebuildInternalQueueFromGlobal();
  };


  private handleBlockQueueRefineRequest = ({ blockTypeId, index }: { blockTypeId: string; index: number }): void => {
    if (!this.ship) return;

    const fullQueue = PlayerResources.getInstance().getBlockQueue();

    if (index < 0 || index >= fullQueue.length) {
      console.warn(`[BlockDropDecisionMenu] Invalid index ${index} for block queue`);
      return;
    }

    const block = fullQueue[index];
    if (block.id !== blockTypeId) {
      console.warn(`[BlockDropDecisionMenu] Block mismatch: index ${index} has id ${block.id}, expected ${blockTypeId}`);
      return;
    }

    PlayerExperienceManager.getInstance().addEntropium(block.cost ?? 0);
    PlayerResources.getInstance().removeBlockAt(index);
    audioManager.play('assets/sounds/sfx/ui/coin_00.wav', 'sfx', { maxSimultaneous: 4 });
    missionResultStore.incrementBlockRefinedCount();

    if (this.open) this.rebuildInternalQueueFromGlobal();
  };

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
      options: DEFAULT_CONFIG.window.options,
    });

    // === Retrieve current and queue directly from global ===
    const current = this.getCurrentBlockType();
    const queue = PlayerResources.getInstance().getBlockQueue();
    const blockTier = current ? getTierFromBlockType(current) : 1;
    const tierColor = BLOCK_TIER_COLORS[blockTier] ?? '#ffffff';

    // Label: current block name
    drawLabel(
      ctx,
      scaledWindowX + scaledSlideX + (scaledWindowWidth / 2),
      scaledWindowY + (42 * scale),
      current?.name ?? '',
      {
        font: `${scaledLabelFontSize}px monospace`,
        align: 'center',
        color: brightenColor(tierColor, 0.5),
      },
    );

    // Large preview
    if (this.blockPreviewRenderer) {
      const previewX = scaledWindowX + scaledSlideX + (scaledWindowWidth / 2) - (scaledBlockPreviewWidth / 2);
      const previewY = scaledWindowY + (128 * scale);
      this.blockPreviewRenderer.render(ctx, previewX, previewY, scaledBlockPreviewWidth, scaledBlockPreviewHeight);
    }

    // Queue count (top left)
    if (queue.length > 1) {
      drawLabel(
        ctx,
        scaledWindowX + scaledSlideX + (16 * scale),
        scaledWindowY + (16 * scale),
        `+${queue.length - 1} more`,
        {
          font: `${scaledLabelFontSize}px monospace`,
          align: 'left',
          glow: false,
        },
      );
    }

    // "Next:" label and mini preview (top right)
    if (queue.length > 1 && this.nextBlockPreviewRenderer) {
      const nextLabelText = 'Next:';
      const nextLabelX = scaledWindowX + scaledSlideX + scaledWindowWidth - (16 * scale) - scaledMiniPreviewWidth - (8 * scale);
      const nextLabelY = scaledWindowY + (16 * scale);

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

      const miniPreviewX = scaledWindowX + scaledSlideX + scaledWindowWidth - (16 * scale) - scaledMiniPreviewWidth;
      const miniPreviewY = scaledWindowY + (8 * scale);
      this.nextBlockPreviewRenderer.render(ctx, miniPreviewX, miniPreviewY, scaledMiniPreviewWidth, scaledMiniPreviewHeight);
    }

    // Block stats
    if (current) {
      const statsX = scaledWindowX + scaledSlideX + (32 * scale);
      const statsY = scaledWindowY + (128 * scale) + scaledBlockPreviewHeight + (32 * scale);
      const statsWidth = scaledWindowWidth - (64 * scale);
      drawBlockStatsLabels(ctx, current, statsX, statsY, statsWidth, scale);
    }

    // Buttons only if active
    if (this.animationPhase === 'open' || current) {
      drawButton(ctx, { ...this.refineButton, disabled: this.refineLocked }, scale);
      drawButton(ctx, { ...this.autoplaceButton, disabled: this.attachLocked }, scale);
      drawButton(ctx, { ...this.randomRollButton, disabled: this.rollLocked }, scale);
      drawButton(ctx, { ...this.autoPlaceAllButton, disabled: this.attachAllLocked }, scale);
    }
  }

  getCurrentBlockType(): BlockType | null {
    return PlayerResources.getInstance().getBlockQueue()[0] ?? null;
  }

  getRemainingQueue(): BlockType[] {
    return PlayerResources.getInstance().getBlockQueue().slice(1);
  }

  isOpen(): boolean {
    return this.open;
  }

  // Not called anywhere yet
  closeMenu(): void {
    this.coachMarksVisible = false;
    CoachMarkManager.getInstance().clear();
    this.open = false;
    GlobalMenuReporter.getInstance().setMenuClosed('blockDropDecisionMenu');
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
    return PlayerResources.getInstance().getBlockQueue().length > 0;
  }

  private getMenuTargetZoom(): number {
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
    GlobalEventBus.off('blockqueue:request-place', this.handleBlockQueueRequest);
    GlobalEventBus.off('blockqueue:request-refine', this.handleBlockQueueRefineRequest);
    GlobalEventBus.off('blockqueue:request-placeall', this.handleBlockQueuePlaceAllRequest);
    GlobalEventBus.off('blockdropdecision:attach:lock', this.handleLockAttach);
    GlobalEventBus.off('blockdropdecision:attach:unlock', this.handleUnlockAttach);
    GlobalEventBus.off('blockdropdecision:attach-all:lock', this.handleLockAttachAll);
    GlobalEventBus.off('blockdropdecision:attach-all:unlock', this.handleUnlockAttachAll);
    GlobalEventBus.off('blockdropdecision:refine:lock', this.handleLockRefine);
    GlobalEventBus.off('blockdropdecision:refine:unlock', this.handleUnlockRefine);
    GlobalEventBus.off('blockdropdecision:roll:lock', this.handleLockRoll);
    GlobalEventBus.off('blockdropdecision:roll:unlock', this.handleUnlockRoll);
    GlobalEventBus.off('blockdropdecision:lock-all', this.handleLockAll);
    GlobalEventBus.off('blockdropdecision:unlock-all', this.handleUnlockAll);
  }
}