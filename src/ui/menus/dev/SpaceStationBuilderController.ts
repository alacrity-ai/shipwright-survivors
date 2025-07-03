import { getBlockSprite } from '@/rendering/cache/BlockSpriteCache';
import { getBlockCost } from '@/game/blocks/BlockRegistry';
import { ShipBuilderTool } from '@/ui/menus/types/ShipBuilderTool';
import { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';
import type { SpaceStation } from '@/game/entities/SpaceStation';
// import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { Camera } from '@/core/Camera';
import type { SpaceStationBuilderMenu } from '@/ui/menus/dev/SpaceStationBuilderMenu';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import { drawBlockHighlight, drawBlockDeletionHighlight } from '@/rendering/primitives/HighlightUtils';
import { BLOCK_SIZE } from '@/config/view';
import type { InputManager } from '@/core/InputManager';
// import { savePlayerShip } from '@/systems/serialization/savePlayerShip';
import { PlayerResources } from '@/game/player/PlayerResources';
import { getHoveredGridCoord, isCoordConnectedToShip } from '@/systems/subsystems/utils/ShipBuildingUtils';
import { getRepairCost } from '@/systems/subsystems/utils/BlockRepairUtils';
import { audioManager } from '@/audio/Audio';
import { getBlockType } from '@/game/blocks/BlockRegistry';

export class SpaceStationBuilderController {
  private rotation: number = 0;
  private lastBlockId: string | null = null;
  private hasSaved = false;  // Flag to prevent multiple saves
  private hoveredShipCoord: GridCoord | null = null;

  constructor(
    private readonly spaceStation: SpaceStation,
    private readonly menu: SpaceStationBuilderMenu,
    private readonly camera: Camera,
    private readonly shipBuilderEffects: ShipBuilderEffectsSystem,
    private readonly inputManager: InputManager
  ) {}

  update(transform: BlockEntityTransform) {
    if (this.inputManager.wasKeyJustPressed('Space')) {
      this.rotation = (this.rotation + 90) % 360;
    }

    const mouse = this.inputManager.getMousePosition();
    if (this.isCursorOverMenu(mouse)) return;

    const coord = getHoveredGridCoord(mouse, this.camera, transform.position, transform.rotation);

    // REPAIR MODE: Update hovered ship block for repair mode
    // -- handle repair mode BEFORE early return --
    if (this.menu.getActiveTool() === ShipBuilderTool.REPAIR) {
      const hoveredBlock = this.spaceStation.getBlock(coord);
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

    const blockCost = getBlockCost(blockId);
    if (blockCost === undefined) return;

    if (this.inputManager.wasRightClicked()) {
      const block = this.spaceStation.getBlock(coord);
      if (!block) return;

      if (!block.type.metatags?.includes('cockpit')) {
        // const deletionSafe = this.spaceStation.isDeletionSafe(coord);
        // if (!deletionSafe) {
        //   audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx', { maxSimultaneous: 3 });
        //   return;
        // }

        this.spaceStation.removeBlock(coord);
        audioManager.play('assets/sounds/sfx/ui/click_00.wav', 'sfx', { maxSimultaneous: 3 });
      }
    }

    // Check if the player has enough currency to place the block
    // TODO: Remove currency checks here
    // if (PlayerResources.getInstance().hasEnoughCurrency(blockCost)) {
      if (this.inputManager.wasMouseClicked()) {
        // if (!this.spaceStation.hasBlockAt(coord) && isCoordConnectedToShip(this.ship, coord)) {
          this.spaceStation.placeBlockById(coord, blockId, this.rotation);
          audioManager.play('assets/sounds/sfx/ship/attach_00.wav', 'sfx', { maxSimultaneous: 3 }); // Play sound effect when block is placed
        // }
      // }
    } 

    // DEBUG SAVING (will be removed when out of development testing).
    // THIS IS NOT the same functionality as ingame ship saving:
    // Check if the "L" key is pressed and save the ship, but only once
    if (this.inputManager.isLPressed() && !this.hasSaved) {
      const filename = 'saved_player_ship.json';
      // TODO : Make a saveSpaceStation
      // savePlayerShip(this.spaceStation, this.spaceStation.getGrid(), filename); // Save the current player ship to a file
      this.hasSaved = true;  // Set the flag to prevent further saves
    }
    // Reset the save flag when "L" key is released
    if (!this.inputManager.isLPressed() && this.hasSaved) {
      this.hasSaved = false;  // Allow saving again if the key is released
    }
  }

  render(ctx: CanvasRenderingContext2D, transform: BlockEntityTransform): void {
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
    ctx.scale(this.camera.getZoom(), this.camera.getZoom());
    ctx.rotate(transform.rotation);

    const tool = this.menu.getActiveTool();

    if (tool === ShipBuilderTool.REPAIR) {
      const hoveredBlock = this.spaceStation.getBlock(coord);
      if (hoveredBlock) {
        drawBlockHighlight(ctx, 'rgba(0,255,0,0.3)');
      }
    } else if (tool === ShipBuilderTool.PLACE) {
      const blockId = this.menu.getSelectedBlockId();
      if (!blockId) {
        ctx.restore();
        return;
      }

      const existingBlock = this.spaceStation.getBlock(coord);

      if (existingBlock) {
        const isSafe = this.spaceStation.isDeletionSafe(coord);
        drawBlockDeletionHighlight(ctx, isSafe);
      } else {
        const blockType = getBlockType(blockId);
        if (!blockType) return;

        const sprite = getBlockSprite(blockType);
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
    const block = this.spaceStation.getBlock(coord);
    if (!block) return;

    const missingHp = block.type.armor - block.hp;
    if (missingHp <= 0) return;

    block.hp = block.type.armor;
    this.shipBuilderEffects.createRepairEffect(block.position!);
  }

  repairAllBlocks(): void {
    const playerResources = PlayerResources.getInstance();

    // Get all damaged blocks
    const damagedBlocks = this.spaceStation.getAllBlocks()
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
      audioManager.play('assets/sounds/sfx/ship/repair_00.wav', 'sfx');
      this.repairBlockAt(coord);
    }
  }

  getHoveredShipBlock(): BlockInstance | undefined {
    return this.hoveredShipCoord ? this.spaceStation.getBlock(this.hoveredShipCoord) : undefined;
  }
}
