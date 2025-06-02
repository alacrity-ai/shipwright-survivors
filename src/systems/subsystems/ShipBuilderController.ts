import { getBlockSprite } from '@/rendering/cache/BlockSpriteCache';
import { getBlockCost } from '@/game/blocks/BlockRegistry';
import { ShipBuilderTool } from '@/ui/menus/types/ShipBuilderTool';
import { RepairEffectSystem } from '@/systems/fx/RepairEffectSystem';
import type { Ship } from '@/game/ship/Ship';
import type { ShipTransform } from '@/systems/physics/MovementSystem';
import type { Camera } from '@/core/Camera';
import type { ShipBuilderMenu } from '@/ui/menus/ShipBuilderMenu';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import { drawBlockHighlight, drawBlockDeletionHighlight } from '@/rendering/primitives/HighlightUtils';
import { BLOCK_SIZE } from '@/game/blocks/BlockRegistry';
import type { InputManager } from '@/core/InputManager';
import { savePlayerShip } from '@/systems/serialization/savePlayerShip';
import { PlayerResources } from '@/game/player/PlayerResources';
import { getHoveredGridCoord, isCoordConnectedToShip } from '@/systems/subsystems/utils/ShipBuildingUtils';
import { getRepairCost } from '@/systems/subsystems/utils/BlockRepairUtils';
import { audioManager } from '@/audio/Audio';
import { missionResultStore } from '@/game/missions/MissionResultStore';

export class ShipBuilderController {
  private rotation: number = 0;
  private lastBlockId: string | null = null;
  private hasSaved = false;  // Flag to prevent multiple saves
  private hoveredShipCoord: GridCoord | null = null;

  constructor(
    private readonly ship: Ship,
    private readonly menu: ShipBuilderMenu,
    private readonly camera: Camera,
    private readonly repairEffectSystem: RepairEffectSystem,
    private readonly inputManager: InputManager
  ) {}

  update(transform: ShipTransform) {
    if (this.inputManager.wasKeyJustPressed('Space')) {
      this.rotation = (this.rotation + 90) % 360;
    }

    const mouse = this.inputManager.getMousePosition();
    if (this.isCursorOverMenu(mouse)) return;

    const coord = getHoveredGridCoord(mouse, this.camera, transform.position, transform.rotation);

    // REPAIR MODE: Update hovered ship block for repair mode
    // -- handle repair mode BEFORE early return --
    if (this.menu.getActiveTool() === ShipBuilderTool.REPAIR) {
      const hoveredBlock = this.ship.getBlock(coord);
      this.menu.setHoveredShipBlock(hoveredBlock);

      if (hoveredBlock && this.inputManager.wasMouseClicked()) {
        audioManager.play('assets/sounds/sfx/ship/repair_00.wav', 'sfx');
        this.repairBlockAt(coord);
      }

      // No placement logic should run in REPAIR mode
      return;
    }

    // PLACEMENT MODE: Block Placement / Deletion logic
    const blockId = this.menu.getSelectedBlockId();
    if (!blockId) return;

    // Reset rotation when block type changes
    if (blockId !== this.lastBlockId) {
      this.rotation = 0;
      this.lastBlockId = blockId;
    }

    const blockType = getBlockSprite(blockId);
    if (!blockType) return;

    const blockCost = getBlockCost(blockId);
    if (blockCost === undefined) return;

    if (this.inputManager.wasRightClicked()) {
      const block = this.ship.getBlock(coord);
      if (!block) return;

      if (!block.type.id.startsWith('cockpit')) {
        const deletionSafe = this.ship.isDeletionSafe(coord);
        if (!deletionSafe) {
          audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx', { maxSimultaneous: 3 });
          return;
        }

        this.ship.removeBlock(coord);
        audioManager.play('assets/sounds/sfx/ui/click_00.wav', 'sfx', { maxSimultaneous: 3 });
        const refundCost = Math.round(blockCost / 2);
        PlayerResources.getInstance().addCurrency(refundCost);
      }
    }

    // Check if the player has enough currency to place the block
    if (PlayerResources.getInstance().hasEnoughCurrency(blockCost)) {
      if (this.inputManager.wasMouseClicked()) {
        if (!this.ship.hasBlockAt(coord) && isCoordConnectedToShip(this.ship, coord)) {
          this.ship.placeBlockById(coord, blockId, this.rotation);
          audioManager.play('assets/sounds/sfx/ship/attach_00.wav', 'sfx', { maxSimultaneous: 3 }); // Play sound effect when block is placed
          PlayerResources.getInstance().spendCurrency(blockCost); // Deduct the cost from player's currency
          missionResultStore.incrementBlockPlacedCount();
        }
      }
    } 

    // DEBUG SAVING (will be removed when out of development testing).
    // THIS IS NOT the same functionality as ingame ship saving:
    // Check if the "L" key is pressed and save the ship, but only once
    if (this.inputManager.isLPressed() && !this.hasSaved) {
      const filename = 'saved_player_ship.json';
      savePlayerShip(this.ship, this.ship.getGrid(), filename); // Save the current player ship to a file
      this.hasSaved = true;  // Set the flag to prevent further saves
    }
    // Reset the save flag when "L" key is released
    if (!this.inputManager.isLPressed() && this.hasSaved) {
      this.hasSaved = false;  // Allow saving again if the key is released
    }
  }

  render(ctx: CanvasRenderingContext2D, transform: ShipTransform): void {
    const mouse = this.inputManager.getMousePosition();
    if (this.isCursorOverMenu(mouse)) return;

    const coord = getHoveredGridCoord(mouse, this.camera, transform.position, transform.rotation);

    // Convert grid coord → world space
    const localX = coord.x * BLOCK_SIZE;
    const localY = coord.y * BLOCK_SIZE;

    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);

    const rotatedX = localX * cos - localY * sin;
    const rotatedY = localX * sin + localY * cos;

    const worldX = transform.position.x + rotatedX;
    const worldY = transform.position.y + rotatedY;

    const screen = this.camera.worldToScreen(worldX, worldY);

    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.rotate(transform.rotation);

    const tool = this.menu.getActiveTool();

    if (tool === ShipBuilderTool.REPAIR) {
      const hoveredBlock = this.ship.getBlock(coord);
      if (hoveredBlock) {
        drawBlockHighlight(ctx, 'rgba(0,255,0,0.3)');
      }
    } else if (tool === ShipBuilderTool.PLACE) {
      const blockId = this.menu.getSelectedBlockId();
      if (!blockId) {
        ctx.restore();
        return;
      }

      const existingBlock = this.ship.getBlock(coord);

      if (existingBlock) {
        const isSafe = this.ship.isDeletionSafe(coord);
        drawBlockDeletionHighlight(ctx, isSafe);
      } else {
        const sprite = getBlockSprite(blockId);
        ctx.save();
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.globalAlpha = 0.6;
        ctx.drawImage(
          sprite.base,
          -BLOCK_SIZE / 2,
          -BLOCK_SIZE / 2,
          BLOCK_SIZE,
          BLOCK_SIZE
        );
        ctx.restore();
      }
    }

    ctx.restore();
  }

  private isCursorOverMenu(mouse: { x: number; y: number }): boolean {
    return this.menu.isPointInBounds(mouse.x, mouse.y);
  }

  repairBlockAt(coord: { x: number; y: number }): void {
    const block = this.ship.getBlock(coord);
    if (!block) return;

    const missingHp = block.type.armor - block.hp;
    if (missingHp <= 0) return;

    const repairCost = getRepairCost(block);
    const playerResources = PlayerResources.getInstance();

    if (playerResources.hasEnoughCurrency(repairCost)) {
      playerResources.spendCurrency(repairCost);
      block.hp = block.type.armor;
      this.repairEffectSystem.createRepairEffect(block.position!);
    }
  }

  repairAllBlocks(): void {
    const playerResources = PlayerResources.getInstance();

    // Get all damaged blocks
    const damagedBlocks = this.ship.getAllBlocks()
      .filter(([, block]) => block.hp < block.type.armor)
      .map(([coord, block]) => ({ coord, block }))
      .sort((a, b) => {
        const missingA = a.block.type.armor - a.block.hp;
        const missingB = b.block.type.armor - b.block.hp;
        if (missingA !== missingB) {
          return missingB - missingA; // Repair most damaged first
        }
        const costA = getRepairCost(a.block);
        const costB = getRepairCost(b.block);
        return costA - costB; // Then cheaper to repair first
      });

    for (const { coord, block } of damagedBlocks) {
      const repairCost = getRepairCost(block);
      if (playerResources.hasEnoughCurrency(repairCost)) {
        audioManager.play('assets/sounds/sfx/ship/repair_00.wav', 'sfx');
        this.repairBlockAt(coord);
      } else {
        console.log("Stopped repair: insufficient funds.");
        break;
      }
    }
  }

  getHoveredShipBlock(): BlockInstance | undefined {
    return this.hoveredShipCoord ? this.ship.getBlock(this.hoveredShipCoord) : undefined;
  }
}
