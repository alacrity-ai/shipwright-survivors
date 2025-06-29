// src/scenes/ship_selection/components/ShipSelectionGridComponent.ts

import { getUniformScaleFactor } from '@/config/view';
import { ShipBlueprintRegistry } from '@/game/ship/ShipBlueprintRegistry';
import { loadImage } from '@/shared/imageCache';
import { getAssetPath } from '@/shared/assetHelpers';
import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
import { drawShipTile } from '@/ui/primitives/UIShipTile';

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

  private placeholderSprite: CanvasImageSource;
  private isInitialized = false;

  constructor(inputManager: InputManager) {
    this.inputManager = inputManager;

    const scale = getUniformScaleFactor();
    this.tileSize = TILE_SIZE * scale;
    this.placeholderSprite = this.createPlaceholderSprite();

    // Async init
    this.loadTiles();

    // Log discovered and unlocked ships
    const playerShipCollection = PlayerShipCollection.getInstance();
    console.log('[ShipSelectionGridComponent] Discovered ships:', playerShipCollection.getDiscoveredShips());
    console.log('[ShipSelectionGridComponent] Unlocked ships:', playerShipCollection.getUnlockedShips());
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

  update(): void {
    if (!this.isInitialized) return;

    const mouse = this.inputManager.getMousePosition();
    const click = this.inputManager.wasMouseClicked();

    for (const tile of this.tiles) {
      tile.isHovered =
        mouse.x >= tile.x &&
        mouse.x <= tile.x + this.tileSize &&
        mouse.y >= tile.y &&
        mouse.y <= tile.y + this.tileSize;

      if (tile.isHovered && click && tile.shipDef) {
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

    const scale = getUniformScaleFactor();
    
    for (const tile of this.tiles) {
      drawShipTile(
        ctx,
        {
          x: tile.x,
          y: tile.y,
          size: this.tileSize,
          sprite: tile.icon ?? this.placeholderSprite,
          isHovered: tile.isHovered,
          isSelected: tile.isSelected,
          isLocked: !tile.shipDef,
        },
      );
    }
  }

  getSelectedShip(): CollectableShipDefinition | null {
    return this.selectedShipDef;
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
}
