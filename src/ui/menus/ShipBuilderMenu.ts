import { getMousePosition, wasMouseClicked } from '@/core/Input';
import { PlayerTechnologyManager } from '@/game/player/PlayerTechnologyManager';
import { drawWindow } from '@/ui/primitives/WindowBox';
import { drawBlockTile } from '@/ui/primitives/UIBlockTile';
import { drawUtilityButton } from '@/ui/primitives/UIUtilityButton';
import { groupBlocksBySubcategory } from '@/ui/menus/helpers/groupBlocksBySubcategory';
import { ShipBuilderTool } from '@/ui/menus/types/ShipBuilderTool';
import { getRepairCost } from '@/systems/subsystems/utils/BlockRepairUtils';
import { drawLabelLine } from '@/ui/utils/drawLabelLine';

import { getAllBlockTypes } from '@/game/blocks/BlockRegistry';
import { getBlockSprite } from '@/rendering/cache/BlockSpriteCache';
import { ShipBuilderController } from '@/systems/subsystems/ShipBuilderController';
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
const INFO_WINDOW_HEIGHT = 240;

const WINDOW_X = 20;
const WINDOW_Y = 40;
const WINDOW_WIDTH = TILE_SIZE * GRID_COLS + PADDING * 2;
const WINDOW_HEIGHT = TILE_SIZE * GRID_ROWS + 60;
const BLOCKINFO_WINDOW_WIDTH = TILE_SIZE * (GRID_COLS - 2) + PADDING * 3;
const UTILITY_WINDOW_WIDTH = TILE_SIZE + PADDING;

const CATEGORIES: BlockCategory[] = ['hull', 'engine', 'weapon', 'utility'];

export class ShipBuilderMenu implements Menu {
  private static instanceCounter = 0;
  private repairAllHandler: (() => void) | null = null;
  instanceId: number;

  private activeTab: BlockCategory = 'hull';
  private selectedBlockId: string | null = 'hull1';

  private activeTool: ShipBuilderTool = ShipBuilderTool.PLACE;
  private hoveredShipBlock: BlockInstance | undefined = undefined;
  private hoveredUtilityTool: ShipBuilderTool | null = null;

  constructor() {
    this.instanceId = ShipBuilderMenu.instanceCounter++;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const mouse = getMousePosition();
    const clicked = wasMouseClicked();

    const tabs = this.buildCategoryTabs();
    const tabWasClicked = drawWindow(
      ctx,
      WINDOW_X,
      WINDOW_Y,
      WINDOW_WIDTH,
      WINDOW_HEIGHT,
      '',
      tabs,
      mouse,
      clicked
    );

    const allBlocks = getAllBlockTypes();
    const blocks = allBlocks.filter(b => b.category === this.activeTab);
    const selectedBlock = allBlocks.find(b => b.id === this.selectedBlockId) ?? null;

    const hoveredBlock = this.renderBlockGrid(
      ctx,
      blocks,
      mouse,
      clicked,
      WINDOW_X + PADDING,
      WINDOW_Y + WINDOW_HEADER_HEIGHT,
      tabWasClicked
    );

    const infoX = WINDOW_X;
    const infoY = WINDOW_Y + WINDOW_HEIGHT + BLOCK_INFO_OFFSET;

    // === Tooltip override: hovered utility tool
    if (this.hoveredUtilityTool) {
      this.renderToolInfo(ctx, this.hoveredUtilityTool, infoX, infoY, BLOCKINFO_WINDOW_WIDTH);
    }
    // === Repair mode
    else if (this.activeTool === ShipBuilderTool.REPAIR) {
      this.renderRepairInfoForBlock(ctx, this.hoveredShipBlock, infoX, infoY, BLOCKINFO_WINDOW_WIDTH);
    }
    // === Block grid or selected block
    else {
      const blockToInspect = hoveredBlock ?? selectedBlock ?? null;
      this.renderBlockInfo(ctx, blockToInspect, infoX, infoY, BLOCKINFO_WINDOW_WIDTH);
    }

    this.renderUtilityWindow(
      ctx,
      WINDOW_X + BLOCKINFO_WINDOW_WIDTH + PADDING,
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

        drawBlockTile(ctx, {
          x,
          y,
          size: TILE_SIZE,
          sprite: getBlockSprite(block.id).base,
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
    drawWindow(ctx, x, y, width, INFO_WINDOW_HEIGHT, 'Info');

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
    textY = drawLabelLine(ctx, textX, textY, 'Cost', formatValue(block.cost), '#6f6', wrapWidth);

    if (block.behavior) {
      Object.entries(block.behavior).forEach(([key, val]) => {
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
    drawWindow(ctx, x, y, width, INFO_WINDOW_HEIGHT, 'Repair Info');

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
    drawWindow(ctx, x, y, width, height, '');

    const buttonHeight = 32;
    const spacing = 8;
    const buttonWidth = width - PADDING * 2;
    const startX = x + PADDING;
    let currentY = y + WINDOW_HEADER_HEIGHT + spacing;

    this.hoveredUtilityTool = null; // ← Reset before loop

    const buttons = [
      {
        label: '🔧', // Repair
        tool: ShipBuilderTool.REPAIR,
        action: () => {
          this.setActiveTool(ShipBuilderTool.REPAIR);
          this.setSelectedBlockId(null);
        }
      },
      {
        label: '🛠️', // Repair All
        tool: ShipBuilderTool.REPAIR_ALL,
        action: () => {
          this.repairAllHandler?.();
        }
      },
      {
        label: '💾', // Save Ship
        tool: ShipBuilderTool.SAVE,
        action: () => {
          // future
        }
      },
      {
        label: '📂', // Load Ship
        tool: ShipBuilderTool.LOAD,
        action: () => {
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
        onClick: action
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
    drawWindow(ctx, x, y, width, INFO_WINDOW_HEIGHT, 'Tool Info');

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
    // No-op
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
    return true; // TODO: make togglable
  }

  // Called from UI buttons (see below)
  setActiveTool(tool: ShipBuilderTool) {
    this.activeTool = tool;
  }

  getActiveTool(): ShipBuilderTool {
    return this.activeTool;
  }

  public isPointInBounds(x: number, y: number): boolean {
    const mainWindowRight = WINDOW_X + WINDOW_WIDTH;
    const mainWindowBottom = WINDOW_Y + WINDOW_HEIGHT;

    const blockInfoRight = WINDOW_X + BLOCKINFO_WINDOW_WIDTH;
    const blockInfoBottom = WINDOW_Y + WINDOW_HEIGHT + BLOCK_INFO_OFFSET + INFO_WINDOW_HEIGHT;

    const utilityWindowLeft = WINDOW_X + BLOCKINFO_WINDOW_WIDTH + PADDING;
    const utilityWindowRight = utilityWindowLeft + UTILITY_WINDOW_WIDTH;
    const utilityWindowTop = WINDOW_Y + WINDOW_HEIGHT + BLOCK_INFO_OFFSET;
    const utilityWindowBottom = utilityWindowTop + INFO_WINDOW_HEIGHT;

    const withinMainWindow =
      x >= WINDOW_X && x <= mainWindowRight &&
      y >= WINDOW_Y && y <= mainWindowBottom;

    const withinBlockInfoWindow =
      x >= WINDOW_X && x <= blockInfoRight &&
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
}
