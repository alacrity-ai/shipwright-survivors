// src/ui/menus/ShipBuilderMenu.ts

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
import { Camera } from '@/core/Camera';

import { savePlayerShip } from '@/systems/serialization/savePlayerShip';
import { ShipRegistry } from '@/game/ship/ShipRegistry';

import { getUniformScaleFactor } from '@/config/view';
import { getUIScale } from '@/ui/menus/helpers/getUIScale';
import { getResolutionScaleFactor } from '@/config/view';
import { getUITextScale } from '@/ui/menus/helpers/getUIScale';

import { getAllBlockTypes } from '@/game/blocks/BlockRegistry';
import { getBlockSprite } from '@/rendering/cache/BlockSpriteCache';

import type { CursorRenderer } from '@/rendering/CursorRenderer';
import type { BlockCategory } from '@/game/interfaces/types/BlockType';
import type { BlockType } from '@/game/interfaces/types/BlockType';
import type { Menu } from '@/ui/interfaces/Menu';
import type { WindowTab } from '@/ui/primitives/WindowBox';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';

const IGNORED_KEYS = new Set(['canThrust', 'canFire']);
const CATEGORIES: BlockCategory[] = ['hull', 'engine', 'weapon', 'utility'];

export class ShipBuilderMenu implements Menu {
  private repairAllHandler: (() => void) | null = null;
  private setShipHandlerFromObject: ((json: any) => void) | null = null;

  private inputManager: InputManager;
  private cursorRenderer: CursorRenderer;

  private activeTab: BlockCategory = 'hull';
  private selectedBlockId: string | null = 'hull1';

  private activeTool: ShipBuilderTool = ShipBuilderTool.PLACE;
  private hoveredShipBlock: BlockInstance | undefined = undefined;
  private hoveredUtilityTool: ShipBuilderTool | null = null;

  private open = false;

  private originalZoom: number = 0;

  private PADDING: number = 0;
  private TILE_SIZE: number = 0;
  private GRID_COLS: number = 6;
  private GRID_ROWS: number = 6;
  private WINDOW_HEADER_HEIGHT: number = 0;
  private BLOCK_INFO_OFFSET: number = 0;
  private INFO_WINDOW_HEIGHT: number = 0;
  private WINDOW_X: number = 0;
  private WINDOW_Y: number = 0;
  private WINDOW_WIDTH: number = 0;
  private WINDOW_HEIGHT: number = 0;
  private BLOCKINFO_WINDOW_WIDTH: number = 0;
  private UTILITY_WINDOW_WIDTH: number = 0;
  private UTILITY_BUTTON_VERTICAL_MARGIN: number = 0;
  private UTILITY_BUTTON_SPACING: number = 0;
  private UTILITY_BUTTON_HEIGHT: number = 0;
  private TOTAL_MENU_WIDTH: number = 0;
  private SLIDE_SPEED: number = 0;
  private OVERSHOOT_DISTANCE: number = 0;
  private SETTLE_SPEED: number = 0;

  // Animation state
  private slideX = 0;
  private isAnimating = false;
  private animationPhase: 'sliding-in' | 'settling' | 'sliding-out' | null = null;
  private targetX = 0;

  constructor(inputManager: InputManager, cursorRenderer: CursorRenderer) {
    this.resize();
    this.inputManager = inputManager;
    this.cursorRenderer = cursorRenderer;
    // Initialize slide position to be completely off-screen
    this.slideX = -(this.TOTAL_MENU_WIDTH! + 50);
  }

  public setSetShipHandlerFromObject(handler: (json: any) => void): void {
    this.setShipHandlerFromObject = handler;
  }

  resize(): void {
    // This isn't good enough, for larger resolutions, we need the scale multi to grow
    // E.g. in 1080p, it's 1, in 1440p, it's 1.4, in 4k, it's 1.8
    const scale = Math.max(1, getUIScale() * getResolutionScaleFactor());

    this.PADDING = 16 * scale;
    this.TILE_SIZE = 40 * scale;
  
    this.WINDOW_HEADER_HEIGHT = 28 * scale;
    this.BLOCK_INFO_OFFSET = 12 * scale;
    this.INFO_WINDOW_HEIGHT = 200 * scale;

    this.WINDOW_X = 20 * scale;
    this.WINDOW_Y = 40 * scale;
    this.WINDOW_WIDTH = this.TILE_SIZE * this.GRID_COLS + this.PADDING * 2;

    this.WINDOW_HEIGHT = this.TILE_SIZE * this.GRID_ROWS + (60 * scale);
    this.BLOCKINFO_WINDOW_WIDTH = this.TILE_SIZE * (this.GRID_COLS - 2) + (this.PADDING * 2);
    this.UTILITY_WINDOW_WIDTH = this.TILE_SIZE + (this.PADDING * 2);

    this.UTILITY_BUTTON_VERTICAL_MARGIN = 14 * scale;
    this.UTILITY_BUTTON_SPACING = 8 * scale;
    this.UTILITY_BUTTON_HEIGHT = 32 * scale;

    this.TOTAL_MENU_WIDTH = this.WINDOW_WIDTH + this.BLOCKINFO_WINDOW_WIDTH + this.UTILITY_WINDOW_WIDTH + this.PADDING;
    this.SLIDE_SPEED = 6 * scale;
    this.OVERSHOOT_DISTANCE = 30 * scale;
    this.SETTLE_SPEED = 2 * scale;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const mouse = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();

    const tabs = this.buildCategoryTabs();
    const tabWasClicked = drawWindow({
      ctx,
      x: this.WINDOW_X + this.slideX,
      y: this.WINDOW_Y,
      width: this.WINDOW_WIDTH,
      height: this.WINDOW_HEIGHT,
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
      this.WINDOW_X + this.PADDING + this.slideX,
      this.WINDOW_Y + this.WINDOW_HEADER_HEIGHT,
      tabWasClicked
    );

    const infoX = this.WINDOW_X + this.slideX;
    const infoY = this.WINDOW_Y + this.WINDOW_HEIGHT + this.BLOCK_INFO_OFFSET;

    // === Tooltip override: hovered utility tool
    if (this.hoveredUtilityTool) {
      this.renderToolInfo(ctx, this.hoveredUtilityTool, infoX, infoY, this.BLOCKINFO_WINDOW_WIDTH);
      this.cursorRenderer.setHoveredCursor();
    }
    // === Repair mode
    else if (this.activeTool === ShipBuilderTool.REPAIR) {
      this.renderRepairInfoForBlock(ctx, this.hoveredShipBlock, infoX, infoY, this.BLOCKINFO_WINDOW_WIDTH);
      this.cursorRenderer.setWrenchCursor();
    }
    // === Block grid or selected block
    else {
      const blockToInspect = hoveredBlock ?? selectedBlock ?? null;
      this.renderBlockInfo(ctx, blockToInspect, infoX, infoY, this.BLOCKINFO_WINDOW_WIDTH);
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
      this.WINDOW_X + this.BLOCKINFO_WINDOW_WIDTH + (0.5 * this.PADDING) + this.slideX,
      this.WINDOW_Y + this.WINDOW_HEIGHT + this.BLOCK_INFO_OFFSET,
      this.UTILITY_WINDOW_WIDTH,
      this.INFO_WINDOW_HEIGHT,
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
    const rowSpacing = this.TILE_SIZE;
    let currentRow = 0;
    let hoveredBlock: BlockType | null = null;

    for (const [, groupBlocks] of grouped) {
      for (let i = 0; i < groupBlocks.length; i++) {
        const block = groupBlocks[i];
        const col = i % this.GRID_COLS;
        const row = currentRow;

        const x = originX + col * this.TILE_SIZE;
        const y = originY + row * rowSpacing;

        const isHovered = mouse.x >= x && mouse.x <= x + this.TILE_SIZE &&
                          mouse.y >= y && mouse.y <= y + this.TILE_SIZE;
        const isSelected = this.selectedBlockId === block.id;
        const isUnlocked = techManager.isUnlocked(block.id);

        const sprite = getBlockSprite(block);
        drawBlockTile(ctx, {
          x,
          y,
          size: this.TILE_SIZE,
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
      height: this.INFO_WINDOW_HEIGHT,
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

    const textX = x + this.PADDING;
    let textY = y + 32;
    const wrapWidth = width;

    const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
    const formatValue = (val: unknown): string | number =>
      val === undefined ? '—' :
      typeof val === 'boolean' ? (val ? 'Yes' : 'No') :
      typeof val === 'number' || typeof val === 'string' ? val :
      String(val);

    if (!block) return;

    const textScale = Math.max(0.75, getUITextScale(getUIScale()));

    textY = drawLabelLine(ctx, textX, textY, 'Name', block.name, '#6cf', wrapWidth, textScale);
    textY = drawLabelLine(ctx, textX, textY, 'Armor', formatValue(block.armor), '#09f', wrapWidth, textScale);
    textY = drawLabelLine(ctx, textX, textY, 'Mass', formatValue(block.mass), '#999', wrapWidth, textScale);
    textY = drawLabelLine(ctx, textX, textY, 'Cost', formatValue(block.cost), '#6f6', wrapWidth, textScale);

    if (block.behavior) {
      Object.entries(block.behavior).forEach(([key, val]) => {
        if (IGNORED_KEYS.has(key)) return;
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          textY = drawLabelLine(ctx, textX, textY, capitalize(key), '', '#fc6', wrapWidth, textScale);
          Object.entries(val).forEach(([subKey, subVal]) => {
            const label = `• ${capitalize(subKey)}`;
            textY = drawLabelLine(ctx, textX, textY, label, formatValue(subVal), '#999', wrapWidth, textScale);
          });
        } else {
          textY = drawLabelLine(ctx, textX, textY, capitalize(key), formatValue(val), '#fc6', wrapWidth, textScale);
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
      height: this.INFO_WINDOW_HEIGHT,
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

    const textX = x + this.PADDING;
    let textY = y + 32;
    const wrapWidth = width;

    const textScale = Math.max(0.75, getUITextScale(getUIScale()));

    if (!block) {
      textY = drawLabelLine(ctx, textX, textY, 'Hover block', 'to inspect', '#888', wrapWidth, textScale);
      textY = drawLabelLine(ctx, textX, textY, 'Repair', 'Left-click', '#888', wrapWidth, textScale);
      return;
    }

    const { type, hp } = block;
    const missingHp = type.armor - hp;

    textY = drawLabelLine(ctx, textX, textY, 'Name', type.name, '#6cf', wrapWidth, textScale);
    textY = drawLabelLine(ctx, textX, textY, 'Armor', `${hp} / ${type.armor}`, '#09f', wrapWidth, textScale);
    textY = drawLabelLine(ctx, textX, textY, 'Damage', missingHp > 0 ? missingHp : 'None', '#f66', wrapWidth, textScale);
    textY = drawLabelLine(ctx, textX, textY, 'Repair Cost', missingHp > 0 ? getRepairCost(block) : '—', '#6f6', wrapWidth, textScale);
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

    const spacing = this.UTILITY_BUTTON_SPACING;
    const buttonHeight = this.UTILITY_BUTTON_HEIGHT;
    const buttonWidth = width - this.PADDING * 2;
    const startX = x + this.PADDING;
    let currentY = y + this.WINDOW_HEADER_HEIGHT + spacing - this.UTILITY_BUTTON_VERTICAL_MARGIN;

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

          const ship = ShipRegistry.getInstance().getPlayerShip();
          if (!ship) return;

          const defaultName = 'saved_player_ship.json';
          const input = prompt('Enter a filename to save your ship:', defaultName);

          if (input && input.trim() !== '') {
            const filename = input.trim().endsWith('.json') ? input.trim() : `${input.trim()}.json`;
            savePlayerShip(ship, ship.getGrid(), filename);
          }
        }
      },
      {
        label: '📂', // Load Ship
        tool: ShipBuilderTool.LOAD,
        action: () => {
          audioManager.play('assets/sounds/sfx/ui/click_00.wav', 'sfx');

          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.accept = '.json';

          fileInput.onchange = () => {
            const file = fileInput.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
              try {
                const jsonContent = event.target?.result;
                if (typeof jsonContent !== 'string') return;

                const parsedJson = JSON.parse(jsonContent);
                console.log('[ShipBuilderMenu] Loaded ship JSON:', parsedJson);
                this.setShipHandlerFromObject?.(parsedJson); // ← updated handler to accept raw object
                
                this.closeMenu();
              } catch (e) {
                console.error('[ShipBuilderMenu] Failed to load ship JSON:', e);
              }
            };

            reader.readAsText(file);
          };

          fileInput.click();
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
      height: this.INFO_WINDOW_HEIGHT,
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

    const textX = x + this.PADDING;
    let textY = y + 32;
    const wrapWidth = width - this.PADDING;
    const textScale = Math.max(0.75, getUITextScale(getUIScale()));

    if (tool === ShipBuilderTool.REPAIR) {
      textY = drawLabelLine(ctx, textX, textY, 'Repair Mode', 'Individual block repair', '#888', wrapWidth, textScale);
      textY = drawLabelLine(ctx, textX, textY, 'Cost', 'Based on damage', '#888', wrapWidth, textScale);
    }

    if (tool === ShipBuilderTool.REPAIR_ALL) {
      textY = drawLabelLine(ctx, textX, textY, 'Repair All', 'Repairs all damaged blocks', '#888', wrapWidth, textScale);
      textY = drawLabelLine(ctx, textX, textY, 'Cost', 'As much as you can afford', '#888', wrapWidth, textScale);
      textY = drawLabelLine(ctx, textX, textY, 'Order', 'Repairs most damaged blocks first', '#888', wrapWidth, textScale);
    }
  }

  update(): void {
    const cam = Camera.getInstance();

    // === WASD input panning ===
    const moveSpeed = 20 / cam.getZoom(); // scaled to zoom
    const { x, y } = cam.getTarget();

    let nextX = x;
    let nextY = y;

    if (this.inputManager.isKeyPressed('KeyA')) {
      nextX -= moveSpeed;
    }
    if (this.inputManager.isKeyPressed('KeyD')) {
      nextX += moveSpeed;
    }
    if (this.inputManager.isKeyPressed('KeyW')) {
      nextY -= moveSpeed;
    }
    if (this.inputManager.isKeyPressed('KeyS')) {
      nextY += moveSpeed;
    }

    cam.setTarget(nextX, nextY);

    // === Animate menu slide ===
    if (this.isAnimating) {
      if (this.animationPhase === 'sliding-in') {
        this.slideX += this.SLIDE_SPEED;
        if (this.slideX >= this.targetX + this.OVERSHOOT_DISTANCE) {
          this.animationPhase = 'settling';
        }
      } else if (this.animationPhase === 'settling') {
        this.slideX -= this.SETTLE_SPEED;
        if (this.slideX <= this.targetX) {
          this.slideX = this.targetX;
          this.isAnimating = false;
          this.animationPhase = null;
        }
      } else if (this.animationPhase === 'sliding-out') {
        this.slideX -= this.SLIDE_SPEED;
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
    this.resize();
    
    const playerShip = ShipRegistry.getInstance().getPlayerShip();
    const transform = playerShip?.getTransform();

    if (transform) {
      transform.rotation = 0;
    }

    audioManager.play('assets/sounds/sfx/ui/activate_01.wav', 'sfx');
    this.open = true;

    const cam = Camera.getInstance();
    this.originalZoom = cam.getZoom();
    cam.animateZoomTo(this.getMenuTargetZoom());

    this.slideX = -(this.TOTAL_MENU_WIDTH + 50);
    this.targetX = 0;
    this.isAnimating = true;
    this.animationPhase = 'sliding-in';
  }

  closeMenu(): void {
    this.targetX = -(this.TOTAL_MENU_WIDTH + 50);
    this.animationPhase = 'sliding-out';
    this.isAnimating = true;

    Camera.getInstance().animateZoomTo(this.originalZoom);
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
    const mainWindowRight = this.WINDOW_X + this.WINDOW_WIDTH + this.slideX;
    const mainWindowBottom = this.WINDOW_Y + this.WINDOW_HEIGHT;

    const blockInfoRight = this.WINDOW_X + this.BLOCKINFO_WINDOW_WIDTH + this.slideX;
    const blockInfoBottom = this.WINDOW_Y + this.WINDOW_HEIGHT + this.BLOCK_INFO_OFFSET + this.INFO_WINDOW_HEIGHT;

    const utilityWindowLeft = this.WINDOW_X + this.BLOCKINFO_WINDOW_WIDTH + this.PADDING + this.slideX;
    const utilityWindowRight = utilityWindowLeft + this.UTILITY_WINDOW_WIDTH;
    const utilityWindowTop = this.WINDOW_Y + this.WINDOW_HEIGHT + this.BLOCK_INFO_OFFSET;
    const utilityWindowBottom = utilityWindowTop + this.INFO_WINDOW_HEIGHT;

    const tabHeight = 30;

    const withinMainWindow =
      x >= this.WINDOW_X + this.slideX && x <= mainWindowRight &&
      y >= this.WINDOW_Y - (tabHeight * getUniformScaleFactor()) && y <= mainWindowBottom;

    const withinBlockInfoWindow =
      x >= this.WINDOW_X + this.slideX && x <= blockInfoRight &&
      y >= this.WINDOW_Y + this.WINDOW_HEIGHT + this.BLOCK_INFO_OFFSET &&
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

  private getMenuTargetZoom(): number {
    // Empirically tuned constant * uniform scale
    return 0.5 * getUniformScaleFactor();
  }
}