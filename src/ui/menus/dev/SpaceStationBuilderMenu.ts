// src/ui/menus/dev/SpaceStationBuilderMenu.ts

import type { InputManager } from '@/core/InputManager';
import { PlayerTechnologyManager } from '@/game/player/PlayerTechnologyManager';
import { drawWindow } from '@/ui/primitives/WindowBox';
import { drawBlockTile } from '@/ui/primitives/UIBlockTile';
import { drawUtilityButton } from '@/ui/primitives/UIUtilityButton';
import { groupBlocksBySubcategory } from '@/ui/menus/helpers/groupBlocksBySubcategory';
import { ShipBuilderTool } from '@/ui/menus/types/ShipBuilderTool';
import { getRepairCost } from '@/systems/subsystems/utils/BlockRepairUtils';
import { drawLabelLine } from '@/ui/utils/drawLabelLine';
import { audioManager } from '@/audio/Audio';

import { getAllBlockTypes } from '@/game/blocks/BlockRegistry';
import { getBlockSprite } from '@/rendering/cache/BlockSpriteCache';

import type { CursorRenderer } from '@/rendering/CursorRenderer';
import type { BlockCategory } from '@/game/interfaces/types/BlockType';
import type { BlockType } from '@/game/interfaces/types/BlockType';
import type { Menu } from '@/ui/interfaces/Menu';
import type { WindowTab } from '@/ui/primitives/WindowBox';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';

// === Layout Constants ===
const PADDING = 16;
const TILE_SIZE = 40;
const GRID_COLS = 6;
const GRID_ROWS = 6;

const WINDOW_HEADER_HEIGHT = 28;
const BLOCK_INFO_OFFSET = 12;
const INFO_WINDOW_HEIGHT = 200;

const WINDOW_X = 20;
const WINDOW_Y = 40;
const WINDOW_WIDTH = TILE_SIZE * GRID_COLS + PADDING * 2;
const WINDOW_HEIGHT = TILE_SIZE * GRID_ROWS + 60;
const BLOCKINFO_WINDOW_WIDTH = TILE_SIZE * (GRID_COLS - 2) + PADDING * 3;
const UTILITY_WINDOW_WIDTH = TILE_SIZE + PADDING;

const UTILITY_BUTTON_VERTICAL_MARGIN = 14;

// Animation constants
const TOTAL_MENU_WIDTH = WINDOW_WIDTH + BLOCKINFO_WINDOW_WIDTH + UTILITY_WINDOW_WIDTH + PADDING;
const SLIDE_SPEED = 10;
const OVERSHOOT_DISTANCE = 30;
const SETTLE_SPEED = 4;

const IGNORED_KEYS = new Set(['canThrust', 'canFire']);
const CATEGORIES: BlockCategory[] = ['hull', 'engine', 'weapon', 'utility'];

export class SpaceStationBuilderMenu implements Menu {
  private repairAllHandler: (() => void) | null = null;
  private inputManager: InputManager;
  private cursorRenderer: CursorRenderer;

  private activeTab: BlockCategory = 'hull';
  private selectedBlockId: string | null = 'hull1';

  private activeTool: ShipBuilderTool = ShipBuilderTool.PLACE;
  private hoveredShipBlock: BlockInstance | undefined = undefined;
  private hoveredUtilityTool: ShipBuilderTool | null = null;

  private open = false;

  // Animation state
  private slideX = 0;
  private isAnimating = false;
  private animationPhase: 'sliding-in' | 'settling' | 'sliding-out' | null = null;
  private targetX = 0;

  constructor(inputManager: InputManager, cursorRenderer: CursorRenderer) {
    this.inputManager = inputManager;
    this.cursorRenderer = cursorRenderer;
    // Initialize slide position to be completely off-screen
    this.slideX = -(TOTAL_MENU_WIDTH + 50);
  }

  render(ctx: CanvasRenderingContext2D): void {
    const mouse = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();

    const tabs = this.buildCategoryTabs();
    const tabWasClicked = drawWindow({
      ctx,
      x: WINDOW_X + this.slideX,
      y: WINDOW_Y,
      width: WINDOW_WIDTH,
      height: WINDOW_HEIGHT,
      title: '',
      tabs,
      mouse,
      clicked,
      options: {
        alpha: 0.5,
        borderRadius: 12,
        borderColor: '#00ff00',
        activeTabColor: '#66ff66',
        backgroundGradient: {
          type: 'linear',
          stops: [
            { offset: 0, color: '#002200' },
            { offset: 1, color: '#001500' }
          ]
        }
      }
    });

    const allBlocks = getAllBlockTypes();
    const blocks = allBlocks.filter(b => b.category === this.activeTab);
    const selectedBlock = allBlocks.find(b => b.id === this.selectedBlockId) ?? null;

    const hoveredBlock = this.renderBlockGrid(
      ctx,
      blocks,
      mouse,
      clicked,
      WINDOW_X + PADDING + this.slideX,
      WINDOW_Y + WINDOW_HEADER_HEIGHT,
      tabWasClicked
    );

    const infoX = WINDOW_X + this.slideX;
    const infoY = WINDOW_Y + WINDOW_HEIGHT + BLOCK_INFO_OFFSET;

    // === Tooltip override: hovered utility tool
    if (this.hoveredUtilityTool) {
      this.renderToolInfo(ctx, this.hoveredUtilityTool, infoX, infoY, BLOCKINFO_WINDOW_WIDTH);
      this.cursorRenderer.setHoveredCursor();
    }
    // === Repair mode
    else if (this.activeTool === ShipBuilderTool.REPAIR) {
      this.renderRepairInfoForBlock(ctx, this.hoveredShipBlock, infoX, infoY, BLOCKINFO_WINDOW_WIDTH);
      this.cursorRenderer.setWrenchCursor();
    }
    // === Block grid or selected block
    else {
      const blockToInspect = hoveredBlock ?? selectedBlock ?? null;
      this.renderBlockInfo(ctx, blockToInspect, infoX, infoY, BLOCKINFO_WINDOW_WIDTH);
      if (hoveredBlock) {
        this.cursorRenderer.setHoveredCursor();
      } else {
        if (this.activeTool === ShipBuilderTool.PLACE && !this.isPointInBounds(mouse.x, mouse.y)) {
          this.cursorRenderer.setSmallCircleCursor();
        } else {
          this.cursorRenderer.setDefaultCursor();
        }
      }
    }

    this.renderUtilityWindow(
      ctx,
      WINDOW_X + BLOCKINFO_WINDOW_WIDTH + PADDING + this.slideX,
      WINDOW_Y + WINDOW_HEIGHT + BLOCK_INFO_OFFSET,
      UTILITY_WINDOW_WIDTH,
      INFO_WINDOW_HEIGHT,
      mouse,
      clicked
    );
  }

  private buildCategoryTabs(): WindowTab[] {
    return CATEGORIES.map(category => ({
      label: category.toUpperCase(),
      isActive: this.activeTab === category,
      onClick: () => {
        if (this.activeTab !== category) {
          this.activeTab = category;
        }
      }
    }));
  }

  private renderBlockGrid(
    ctx: CanvasRenderingContext2D,
    blocks: BlockType[],
    mouse: { x: number; y: number },
    clicked: boolean,
    originX: number,
    originY: number,
    tabWasClicked: boolean
  ): BlockType | null {
    const techManager = PlayerTechnologyManager.getInstance();
    const grouped = groupBlocksBySubcategory(blocks);
    const rowSpacing = TILE_SIZE;
    let currentRow = 0;
    let hoveredBlock: BlockType | null = null;

    for (const [, groupBlocks] of grouped) {
      for (let i = 0; i < groupBlocks.length; i++) {
        const block = groupBlocks[i];
        const col = i % GRID_COLS;
        const row = currentRow;

        const x = originX + col * TILE_SIZE;
        const y = originY + row * rowSpacing;

        const isHovered = mouse.x >= x && mouse.x <= x + TILE_SIZE &&
                          mouse.y >= y && mouse.y <= y + TILE_SIZE;
        const isSelected = this.selectedBlockId === block.id;
        const isUnlocked = techManager.isUnlocked(block.id);

        const sprite = getBlockSprite(block.id);
        drawBlockTile(ctx, {
          x,
          y,
          size: TILE_SIZE,
          sprite: sprite.base,
          overlaySprite: sprite.overlay,
          isHovered,
          isSelected,
          isLocked: !isUnlocked,
          onClick: () => {
            if (!tabWasClicked && isUnlocked) {
              this.selectedBlockId = block.id;
              this.setActiveTool(ShipBuilderTool.PLACE);
            }
          }
        });

        if (isHovered) {
          hoveredBlock = block;
        }

        if (isHovered && clicked && !tabWasClicked && isUnlocked) {
          audioManager.play('assets/sounds/sfx/ui/click_00.wav', 'sfx');
          this.selectedBlockId = block.id;
          this.setActiveTool(ShipBuilderTool.PLACE);
          this.setHoveredShipBlock(undefined);
        }
      }

      currentRow++;
    }

    return hoveredBlock;
  }

  private renderBlockInfo(
    ctx: CanvasRenderingContext2D,
    block: BlockType | null,
    x: number,
    y: number,
    width: number
  ): void {
    drawWindow({
      ctx,
      x,
      y,
      width,
      height: INFO_WINDOW_HEIGHT,
      title: 'Info',
      options: {
        alpha: 0.5,
        borderRadius: 12,
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

    const textX = x + PADDING;
    let textY = y + 32;
    const wrapWidth = width + 10;

    const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
    const formatValue = (val: unknown): string | number =>
      val === undefined ? '—' :
      typeof val === 'boolean' ? (val ? 'Yes' : 'No') :
      typeof val === 'number' || typeof val === 'string' ? val :
      String(val);

    if (!block) return;

    textY = drawLabelLine(ctx, textX, textY, 'Name', block.name, '#6cf', wrapWidth);
    textY = drawLabelLine(ctx, textX, textY, 'Armor', formatValue(block.armor), '#09f', wrapWidth);
    textY = drawLabelLine(ctx, textX, textY, 'Mass', formatValue(block.mass), '#999', wrapWidth);
    textY = drawLabelLine(ctx, textX, textY, 'Cost', formatValue(block.cost), '#6f6', wrapWidth);

    if (block.behavior) {
      Object.entries(block.behavior).forEach(([key, val]) => {
        if (IGNORED_KEYS.has(key)) return;
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          textY = drawLabelLine(ctx, textX, textY, capitalize(key), '', '#fc6', wrapWidth);
          Object.entries(val).forEach(([subKey, subVal]) => {
            const label = `• ${capitalize(subKey)}`;
            textY = drawLabelLine(ctx, textX, textY, label, formatValue(subVal), '#999', wrapWidth);
          });
        } else {
          textY = drawLabelLine(ctx, textX, textY, capitalize(key), formatValue(val), '#fc6', wrapWidth);
        }
      });
    }
  }

  private renderRepairInfoForBlock(
    ctx: CanvasRenderingContext2D,
    block: BlockInstance | undefined,
    x: number,
    y: number,
    width: number
  ): void {
    drawWindow({
      ctx,
      x,
      y,
      width,
      height: INFO_WINDOW_HEIGHT,
      title: 'Repair Info',
      options: {
        alpha: 0.5,
        borderRadius: 12,
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

    const textX = x + PADDING;
    let textY = y + 32;
    const wrapWidth = width + 10;

    if (!block) {
      textY = drawLabelLine(ctx, textX, textY, 'Hover block', 'to inspect', '#888', wrapWidth);
      textY = drawLabelLine(ctx, textX, textY, 'Repair', 'Left-click', '#888', wrapWidth);
      return;
    }

    const { type, hp } = block;
    const missingHp = type.armor - hp;

    textY = drawLabelLine(ctx, textX, textY, 'Name', type.name, '#6cf', wrapWidth);
    textY = drawLabelLine(ctx, textX, textY, 'Armor', `${hp} / ${type.armor}`, '#09f', wrapWidth);
    textY = drawLabelLine(ctx, textX, textY, 'Damage', missingHp > 0 ? missingHp : 'None', '#f66', wrapWidth);
    textY = drawLabelLine(ctx, textX, textY, 'Repair Cost', missingHp > 0 ? getRepairCost(block) : '—', '#6f6', wrapWidth);
  }

  private renderUtilityWindow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    mouse: { x: number; y: number },
    clicked: boolean
  ): void {
    drawWindow({
      ctx,
      x,
      y,
      width,
      height,
      title: '',
      options: {
        alpha: 0.5,
        borderRadius: 12,
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

    const buttonHeight = 32;
    const spacing = 8;
    const buttonWidth = width - PADDING * 2;
    const startX = x + PADDING;
    let currentY = y + WINDOW_HEADER_HEIGHT + spacing - UTILITY_BUTTON_VERTICAL_MARGIN;

    this.hoveredUtilityTool = null; // ← Reset before loop

    const buttons = [
      {
        label: '🔧', // Repair
        tool: ShipBuilderTool.REPAIR,
        action: () => {
          audioManager.play('assets/sounds/sfx/ui/click_00.wav', 'sfx');
          this.setActiveTool(ShipBuilderTool.REPAIR);
          this.setSelectedBlockId(null);
        }
      },
      {
        label: '🛠️', // Repair All
        tool: ShipBuilderTool.REPAIR_ALL,
        action: () => {
          audioManager.play('assets/sounds/sfx/ui/click_00.wav', 'sfx');
          this.repairAllHandler?.();
        }
      },
      {
        label: '💾', // Save Ship
        tool: ShipBuilderTool.SAVE,
        action: () => {
          audioManager.play('assets/sounds/sfx/ui/click_00.wav', 'sfx');
          // future
        }
      },
      {
        label: '📂', // Load Ship
        tool: ShipBuilderTool.LOAD,
        action: () => {
          audioManager.play('assets/sounds/sfx/ui/click_00.wav', 'sfx');
          // future
        }
      }
    ];

    for (const { label, tool, action } of buttons) {
      const isHovered =
        mouse.x >= startX &&
        mouse.x <= startX + buttonWidth &&
        mouse.y >= currentY &&
        mouse.y <= currentY + buttonHeight;

      const isActive = tool != null && this.getActiveTool() === tool;

      if (isHovered && tool) {
        this.hoveredUtilityTool = tool;
      }

      drawUtilityButton(ctx, {
        x: startX,
        y: currentY,
        width: buttonWidth,
        height: buttonHeight,
        label,
        isHovered,
        isActive,
        onClick: action,
        style: {
          alpha: 0.6,
          borderRadius: 8,
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

      if (isHovered && clicked) {
        action();
      }

      currentY += buttonHeight + spacing;
    }
  }

  private renderToolInfo(
    ctx: CanvasRenderingContext2D,
    tool: ShipBuilderTool,
    x: number,
    y: number,
    width: number
  ): void {
    drawWindow({
      ctx,
      x,
      y,
      width,
      height: INFO_WINDOW_HEIGHT,
      title: 'Tool Info',
      options: {
        alpha: 0.5,
        borderRadius: 12,
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

    const textX = x + PADDING;
    let textY = y + 32;
    const wrapWidth = width + 10;

    if (tool === ShipBuilderTool.REPAIR) {
      textY = drawLabelLine(ctx, textX, textY, 'Repair Mode', 'Individual block repair', '#888', wrapWidth);
      textY = drawLabelLine(ctx, textX, textY, 'Cost', 'Based on damage', '#888', wrapWidth);
    }

    if (tool === ShipBuilderTool.REPAIR_ALL) {
      textY = drawLabelLine(ctx, textX, textY, 'Repair All', 'Repairs all damaged blocks', '#888', wrapWidth);
      textY = drawLabelLine(ctx, textX, textY, 'Cost', 'As much as you can afford', '#888', wrapWidth);
      textY = drawLabelLine(ctx, textX, textY, 'Order', 'Repairs most damaged blocks first', '#888', wrapWidth);
    }
  }

  update(): void {
    if (this.isAnimating) {
      if (this.animationPhase === 'sliding-in') {
        this.slideX += SLIDE_SPEED;
        if (this.slideX >= this.targetX + OVERSHOOT_DISTANCE) {
          this.animationPhase = 'settling';
        }
      } else if (this.animationPhase === 'settling') {
        this.slideX -= SETTLE_SPEED;
        if (this.slideX <= this.targetX) {
          this.slideX = this.targetX;
          this.isAnimating = false;
          this.animationPhase = null;
        }
      } else if (this.animationPhase === 'sliding-out') {
        this.slideX -= SLIDE_SPEED;
        if (this.slideX <= this.targetX) {
          this.slideX = this.targetX;
          this.animationPhase = null;
          this.isAnimating = false;
          this.open = false;
          this.cursorRenderer.setDefaultCursor();
        }
      }
    }
  }

  isBlocking(): boolean {
    return true;
  }

  getSelectedBlockId(): string | null {
    return this.selectedBlockId;
  }

  setSelectedBlockId(id: string | null) {
    this.selectedBlockId = id;
  }

  setHoveredShipBlock(block: BlockInstance | undefined): void {
    this.hoveredShipBlock = block;
  }

  isOpen(): boolean {
    return this.open;
  }

  openMenu(): void {
    audioManager.play('assets/sounds/sfx/ui/activate_01.wav', 'sfx');
    this.open = true;
    
    // Start the slide animation
    this.slideX = -(TOTAL_MENU_WIDTH + 50);
    this.targetX = 0;
    this.isAnimating = true;
    this.animationPhase = 'sliding-in';
  }

  closeMenu(): void {
    // Start the slide-out animation
    this.targetX = -(TOTAL_MENU_WIDTH + 50); // target off-screen
    this.animationPhase = 'sliding-out';
    this.isAnimating = true;

    // Do NOT immediately set open = false or reset slideX
    // That will happen in the update() loop once animation completes
  }

  // Called from UI buttons (see below)
  setActiveTool(tool: ShipBuilderTool) {
    this.activeTool = tool;
  }

  getActiveTool(): ShipBuilderTool {
    return this.activeTool;
  }

  public isPointInBounds(x: number, y: number): boolean {
    // Adjust bounds checking to account for slide offset
    const mainWindowRight = WINDOW_X + WINDOW_WIDTH + this.slideX;
    const mainWindowBottom = WINDOW_Y + WINDOW_HEIGHT;

    const blockInfoRight = WINDOW_X + BLOCKINFO_WINDOW_WIDTH + this.slideX;
    const blockInfoBottom = WINDOW_Y + WINDOW_HEIGHT + BLOCK_INFO_OFFSET + INFO_WINDOW_HEIGHT;

    const utilityWindowLeft = WINDOW_X + BLOCKINFO_WINDOW_WIDTH + PADDING + this.slideX;
    const utilityWindowRight = utilityWindowLeft + UTILITY_WINDOW_WIDTH;
    const utilityWindowTop = WINDOW_Y + WINDOW_HEIGHT + BLOCK_INFO_OFFSET;
    const utilityWindowBottom = utilityWindowTop + INFO_WINDOW_HEIGHT;

    const tabHeight = 30;

    const withinMainWindow =
      x >= WINDOW_X + this.slideX && x <= mainWindowRight &&
      y >= WINDOW_Y - tabHeight && y <= mainWindowBottom;

    const withinBlockInfoWindow =
      x >= WINDOW_X + this.slideX && x <= blockInfoRight &&
      y >= WINDOW_Y + WINDOW_HEIGHT + BLOCK_INFO_OFFSET &&
      y <= blockInfoBottom;

    const withinUtilityWindow =
      x >= utilityWindowLeft && x <= utilityWindowRight &&
      y >= utilityWindowTop && y <= utilityWindowBottom;

    return withinMainWindow || withinBlockInfoWindow || withinUtilityWindow;
  }

  // Call this after instantiation
  public setRepairAllHandler(handler: () => void): void {
    this.repairAllHandler = handler;
  }

  // Get cursor renderer
  public getCursorRenderer() {
    return this.cursorRenderer;
  }
}