import { getMousePosition, wasMouseClicked, wasRightClicked, wasSpacePressed } from '@/core/Input';
import { getBlockSprite } from '@/rendering/cache/BlockSpriteCache';
import { getBlockCost } from '@/game/blocks/BlockRegistry';
import type { Ship } from '@/game/ship/Ship';
import type { ShipTransform } from '@/systems/physics/MovementSystem';
import type { Camera } from '@/core/Camera';
import type { ShipBuilderMenu } from '@/ui/menus/ShipBuilderMenu';
import { BLOCK_SIZE } from '@/game/blocks/BlockRegistry';
import { isLPressed } from '@/core/Input';
import { savePlayerShip } from '@/systems/serialization/savePlayerShip'; // Import the savePlayerShip function
import { PlayerResources } from '@/game/player/PlayerResources'; // Import the PlayerResources singleton
import { getHoveredGridCoord, isCoordConnectedToShip } from './utils/ShipBuildingUtils';

export class ShipBuilderController {
  private rotation: number = 0;
  private lastBlockId: string | null = null;
  private hasSaved = false;  // Flag to prevent multiple saves

  constructor(
    private readonly ship: Ship,
    private readonly menu: ShipBuilderMenu,
    private readonly camera: Camera
  ) {}

  update(transform: ShipTransform) {
    const blockId = this.menu.getSelectedBlockId();
    if (!blockId) return;

    // Optional: reset rotation when block type changes
    if (blockId !== this.lastBlockId) {
      this.rotation = 0;
      this.lastBlockId = blockId;
    }

    if (wasSpacePressed()) {
      this.rotation = (this.rotation + 90) % 360;
    }

    const mouse = getMousePosition();
    if (this.isCursorOverMenu(mouse)) return;

    const coord = getHoveredGridCoord(mouse, this.camera, transform.position, transform.rotation);

    const blockType = getBlockSprite(blockId);
    if (!blockType) return;

    const blockCost = getBlockCost(blockId);
    if (blockCost === undefined) return;

    if (wasRightClicked()) {
      const block = this.ship.getBlock(coord);
      if (block && block.type.id !== 'cockpit') {
        this.ship.removeBlock(coord);
        const refundCost = Math.round(blockCost / 2);
        PlayerResources.getInstance().addCurrency(refundCost);
      }
    }
    // Check if the player has enough currency to place the block
    if (PlayerResources.getInstance().hasEnoughCurrency(blockCost)) {
      if (wasMouseClicked()) {
        if (!this.ship.hasBlockAt(coord) && isCoordConnectedToShip(this.ship, coord)) {
          this.ship.placeBlockById(coord, blockId, this.rotation);
          PlayerResources.getInstance().spendCurrency(blockCost); // Deduct the cost from player's currency
        }
      }
    } else {
      console.log("Not enough currency to place this block.");
    }

    // Check if the "L" key is pressed and save the ship, but only once
    if (isLPressed() && !this.hasSaved) {
      const filename = 'saved_player_ship.json';
      savePlayerShip(this.ship, this.ship.getGrid(), filename); // Save the current player ship to a file
      this.hasSaved = true;  // Set the flag to prevent further saves
    }

    // Reset the save flag when "L" key is released
    if (!isLPressed() && this.hasSaved) {
      this.hasSaved = false;  // Allow saving again if the key is released
    }
  }

  render(ctx: CanvasRenderingContext2D, transform: ShipTransform): void {
    const blockId = this.menu.getSelectedBlockId();
    if (!blockId) return;

    const mouse = getMousePosition();
    if (this.isCursorOverMenu(mouse)) return;

    const coord = getHoveredGridCoord(mouse, this.camera, transform.position, transform.rotation);
    const sprite = getBlockSprite(blockId);

    // === Convert grid coord → world space
    const localX = coord.x * BLOCK_SIZE;
    const localY = coord.y * BLOCK_SIZE;

    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);

    const rotatedX = localX * cos - localY * sin;
    const rotatedY = localX * sin + localY * cos;

    const worldX = transform.position.x + rotatedX;
    const worldY = transform.position.y + rotatedY;

    // === Convert world → screen
    const screen = this.camera.worldToScreen(worldX, worldY);

    // === Apply zoom just like ShipRenderer does
    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.rotate((transform.rotation + this.rotation * Math.PI / 180));
    ctx.globalAlpha = 0.6;
    ctx.drawImage(
      sprite.base,
      -BLOCK_SIZE / 2,
      -BLOCK_SIZE / 2,
      BLOCK_SIZE,
      BLOCK_SIZE
    );
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  private isCursorOverMenu(mouse: { x: number; y: number }): boolean {
    const menuX = 20;
    const menuWidth = BLOCK_SIZE * 4 + 16 * 2;
    return mouse.x < menuX + menuWidth;
  }
}
