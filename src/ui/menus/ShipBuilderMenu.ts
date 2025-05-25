import { getMousePosition, wasMouseClicked } from '@/core/Input';
import { drawLabel } from '@/ui/primitives/UILabel';
import { getAllBlockTypes } from '@/game/blocks/BlockRegistry';
import { getBlockSprite } from '@/rendering/cache/BlockSpriteCache';
import type { BlockCategory } from '@/game/interfaces/types/BlockType';
import type { Menu } from '@/ui/interfaces/Menu';
import { drawWindow } from '@/ui/primitives/WindowBox';
import type { WindowTab } from '@/ui/primitives/WindowBox';
import { BLOCK_SIZE } from '@/game/blocks/BlockRegistry';

const PADDING = 16;
const GRID_COLS = 4;
const GRID_ROWS = 5;
const TILE_SIZE = 40;

const CATEGORIES: BlockCategory[] = ['hull', 'engine', 'weapon', 'utility'];

export class ShipBuilderMenu implements Menu {
  private static instanceCounter = 0;
  private instanceId: number;

  private activeTab: BlockCategory = 'hull'; // Default active tab
  private selectedBlockId: string | null = null;

  constructor() {
    this.instanceId = ShipBuilderMenu.instanceCounter++;
  }

  // Called every frame to draw the menu UI
  render(ctx: CanvasRenderingContext2D) {

    const winX = 20;
    const winY = 40;
    const winWidth = TILE_SIZE * GRID_COLS + PADDING * 2;
    const winHeight = TILE_SIZE * GRID_ROWS + 60;

    const mouse = getMousePosition();
    const clicked = wasMouseClicked();  // Ensure this is processed only once per frame

    // Build tab definitions with updated tab click logic
    const tabs: WindowTab[] = CATEGORIES.map(category => ({
      label: category.toUpperCase(),
      isActive: this.activeTab === category, // Set isActive based on ShipBuilderMenu's activeTab
      onClick: () => {
        if (this.activeTab !== category) {  // Avoid unnecessary state changes
          this.activeTab = category;  // Update the active tab
        }
      }
    }));

    // Draw window and check if a tab was clicked
    const tabWasClicked = drawWindow(ctx, winX, winY, winWidth, winHeight, 'Build Menu', tabs, mouse, clicked);

    // Block buttons - only handle clicks if no tab was clicked
    const blocks = getAllBlockTypes().filter(b => b.category === this.activeTab);

    // DEBUG: Log what blocks we're showing

    const startX = winX + PADDING;
    const startY = winY + 28;

    // Iterate through blocks and render them
    for (let i = 0; i < Math.min(blocks.length, GRID_COLS * GRID_ROWS); i++) {
      const block = blocks[i];
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);

      const x = startX + col * TILE_SIZE;
      const y = startY + row * TILE_SIZE;

      const isHovered =
        mouse.x >= x &&
        mouse.x <= x + TILE_SIZE &&
        mouse.y >= y &&
        mouse.y <= y + TILE_SIZE;

      const isSelected = this.selectedBlockId === block.id;

      // Render block tile with hover and selected state
      ctx.fillStyle = isSelected ? '#4f4' : isHovered ? '#888' : '#333';
      ctx.fillRect(x, y, TILE_SIZE - 4, TILE_SIZE - 4);

      // Draw block sprite
      const sprite = getBlockSprite(block.id);
      ctx.drawImage(
        sprite.base,
        x + (TILE_SIZE - BLOCK_SIZE) / 2,
        y + (TILE_SIZE - BLOCK_SIZE) / 2,
        BLOCK_SIZE,
        BLOCK_SIZE
      );

      // Block click logic: only if no tab was clicked
      if (isHovered && clicked && !tabWasClicked) {
        this.selectedBlockId = block.id;
      }
    }

    // === Block Info Panel ===
    const infoWinY = winY + winHeight + 12;
    const infoWinHeight = 240;
    drawWindow(ctx, winX, infoWinY, winWidth, infoWinHeight, 'Block Info');

    const selectedBlock = this.selectedBlockId
      ? getAllBlockTypes().find(b => b.id === this.selectedBlockId)
      : null;

    if (!selectedBlock) return;

    const textX = winX + PADDING;
    let textY = infoWinY + 32;

    const capitalize = (str: string): string =>
      str.charAt(0).toUpperCase() + str.slice(1);

    const formatValue = (val: unknown): string | number => {
      if (val === undefined) return '—';
      if (typeof val === 'boolean') return val ? 'Yes' : 'No';
      if (typeof val === 'number' || typeof val === 'string') return val;
      return String(val);
    };

    const line = (label: string, value: string | number, labelColor = '#888') => {
      drawLabel(ctx, textX, textY, [
        { text: `${label}: `, color: labelColor },
        { text: `${value}`, color: '#fff' }
      ]);
      textY += 16;
    };

    const bullet = (label: string, value: string | number, labelColor = '#999') => {
      drawLabel(ctx, textX, textY, [
        { text: `• ${label}: `, color: labelColor },
        { text: `${value}`, color: '#fff' }
      ]);
      textY += 16;
    };

    // === Base Properties ===
    line('Name', selectedBlock.name, '#6cf');         // cyan
    line('Armor', formatValue(selectedBlock.armor), '#09f');  // blue
    line('Cost', formatValue(selectedBlock.cost), '#6f6');    // green

    // === Behaviors
    const renderBehavior = (key: string, val: unknown) => {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        line(capitalize(key), '', '#fc6'); // header line
        Object.entries(val).forEach(([subKey, subVal]) => {
          bullet(capitalize(subKey), formatValue(subVal));
        });
      } else {
        line(capitalize(key), formatValue(val), '#fc6');
      }
    };

    if (selectedBlock.behavior) {
      Object.entries(selectedBlock.behavior).forEach(([key, val]) => {
        renderBehavior(key, val);
      });
    }
  }

  update(dt: number): void {
    // No-op for now
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

  isOpen(): boolean {
    return true; // TODO: tie to actual toggle
  }
}
