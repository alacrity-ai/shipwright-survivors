// src/scenes/ship_selection/components/ShipSelectionGridComponent.ts

import { getUniformScaleFactor } from '@/config/view';
import { ShipBlueprintRegistry } from '@/game/ship/ShipBlueprintRegistry';
import { loadImage } from '@/shared/imageCache';
import { getAssetPath } from '@/shared/assetHelpers';
import { drawShipTile } from '@/ui/primitives/UIShipTile';

import { brightenColor } from '@/shared/colorUtils';
import { audioManager } from '@/audio/Audio';

import type { CollectableShipDefinition } from '@/game/ship/interfaces/CollectableShipDefinition';
import type { InputManager } from '@/core/InputManager';

const GRID_ORIGIN_X = 170;
const GRID_ORIGIN_Y = 140;
const GRID_COLS = 3;
const GRID_ROWS = 5;
const TILE_SIZE = 80;
const TILE_SPACING = 10;

interface ShipTileEntry {
  shipDef: CollectableShipDefinition | null;
  icon: CanvasImageSource | null;
  x: number;
  y: number;
  isHovered: boolean;
  isSelected: boolean;
}

export class ShipSelectionGridComponent {
  private inputManager: InputManager;

  private tiles: ShipTileEntry[] = [];
  private selectedShipDef: CollectableShipDefinition | null = null;

  private gridX: number = 0;
  private gridY: number = 0;
  private tileSize: number;

  private hoveredTileIndex: number | null = null;
  private hoverPulseTime = 0;

  private placeholderSprite: CanvasImageSource;
  private isInitialized = false;

  constructor(inputManager: InputManager) {
    this.inputManager = inputManager;

    const scale = getUniformScaleFactor();
    this.tileSize = TILE_SIZE * scale;
    this.placeholderSprite = this.createPlaceholderSprite();

    this.loadTiles();
  }

  private async loadTiles(): Promise<void> {
    const unlockedShips = ShipBlueprintRegistry.getUnlockedShips();
    const allTiles: ShipTileEntry[] = [];

    const scale = getUniformScaleFactor();

    this.gridX = GRID_ORIGIN_X * scale;
    this.gridY = GRID_ORIGIN_Y * scale;

    for (let i = 0; i < GRID_ROWS * GRID_COLS; i++) {
      const row = Math.floor(i / GRID_COLS);
      const col = i % GRID_COLS;

      const x = this.gridX + col * (this.tileSize + TILE_SPACING * scale);
      const y = this.gridY + row * (this.tileSize + TILE_SPACING * scale);

      const shipDef = unlockedShips[i] ?? null;
      const icon = shipDef ? await loadImage(getAssetPath(shipDef.iconImagePath)) : null;

      allTiles.push({
        shipDef,
        icon,
        x,
        y,
        isHovered: false,
        isSelected: false,
      });

      if (i === 0 && shipDef) {
        this.selectedShipDef = shipDef;
        allTiles[i].isSelected = true;
      }
    }

    this.tiles = allTiles;
    this.isInitialized = true;
  }

  update(dt: number): void {
    if (!this.isInitialized) return;

    this.hoverPulseTime += dt;

    const mouse = this.inputManager.getMousePosition();
    const click = this.inputManager.wasMouseClicked();

    for (const tile of this.tiles) {
      tile.isHovered =
        mouse.x >= tile.x &&
        mouse.x <= tile.x + this.tileSize &&
        mouse.y >= tile.y &&
        mouse.y <= tile.y + this.tileSize;

      if (tile.isHovered && this.hoveredTileIndex !== this.tiles.indexOf(tile)) {
        audioManager.play('assets/sounds/sfx/ui/hover_00.wav', 'sfx', { maxSimultaneous: 4 });
        this.hoveredTileIndex = this.tiles.indexOf(tile);
      }

      if (tile.isHovered && click && tile.shipDef) {
        audioManager.play('assets/sounds/sfx/ui/click_00.wav', 'sfx', { maxSimultaneous: 4 });
        this.selectedShipDef = tile.shipDef;

        for (const other of this.tiles) {
          other.isSelected = false;
        }

        tile.isSelected = true;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.isInitialized) return;

    const pulseAmount = 0 + 0.5 * Math.sin(this.hoverPulseTime * 4); // range: 0.5 → 1.0

    for (const tile of this.tiles) {
      let hoverColorOverride: string | undefined = undefined;

      if (tile.isHovered) {
        hoverColorOverride = brightenColor('#ffffff', pulseAmount);
      }

      drawShipTile(ctx, {
        x: tile.x,
        y: tile.y,
        size: this.tileSize,
        sprite: tile.icon ?? this.placeholderSprite,
        isHovered: tile.isHovered,
        isSelected: tile.isSelected,
        isLocked: !tile.shipDef,
        hoverColorOverride,
      });
    }
  }

  getSelectedShip(): CollectableShipDefinition | null {
    return this.selectedShipDef;
  }

  getGridButtons(): {
    gridX: number;
    gridY: number;
    screenX: number;
    screenY: number;
    isEnabled: boolean;
  }[] {
    if (!this.isInitialized) return [];

    const buttons = [];

    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];
      const row = Math.floor(i / GRID_COLS);
      const col = i % GRID_COLS;

      buttons.push({
        gridX: col,
        gridY: row + 1,
        screenX: tile.x + this.tileSize / 2,
        screenY: tile.y + this.tileSize / 2,
        isEnabled: !!tile.shipDef,
      });
    }

    return buttons;
  }

  private createPlaceholderSprite(): CanvasImageSource {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, 32, 32);
    ctx.strokeStyle = '#444';
    ctx.strokeRect(0, 0, 32, 32);
    return canvas;
  }

  public cycleSelectedShip(direction: 1 | -1): void {
    if (!this.isInitialized || this.tiles.length === 0) return;

    const enabledIndices = this.tiles
      .map((tile, idx) => (tile.shipDef ? idx : null))
      .filter((idx): idx is number => idx !== null);

    if (enabledIndices.length === 0) return;

    const currentIndex = this.tiles.findIndex(t => t.shipDef === this.selectedShipDef);
    const currentEnabledIdx = enabledIndices.indexOf(currentIndex);

    const nextEnabledIdx = (currentEnabledIdx + direction + enabledIndices.length) % enabledIndices.length;
    const nextIndex = enabledIndices[nextEnabledIdx];

    this.tiles.forEach(t => (t.isSelected = false));
    const nextTile = this.tiles[nextIndex];
    nextTile.isSelected = true;
    this.selectedShipDef = nextTile.shipDef;

    audioManager.play('assets/sounds/sfx/ui/click_00.wav', 'sfx', { maxSimultaneous: 4 });
  }
}
