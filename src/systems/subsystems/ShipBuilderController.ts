import { getBlockSprite } from '@/rendering/cache/BlockSpriteCache';
import { getBlockCost } from '@/game/blocks/BlockRegistry';
import { getBlockType } from '@/game/blocks/BlockRegistry';
import { ShipBuilderTool } from '@/ui/menus/types/ShipBuilderTool';
import { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';
import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { Camera } from '@/core/Camera';
import type { ShipBuilderMenu } from '@/ui/menus/ShipBuilderMenu';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';

// These should be replaced with GL2 textures, and then drawn in place of the damage placeholders below in render
import { drawBlockHighlight, drawBlockDeletionHighlight } from '@/rendering/primitives/HighlightUtils'; // Get this in GL

import { BLOCK_SIZE } from '@/config/view';
import type { InputManager } from '@/core/InputManager';
import { PlayerResources } from '@/game/player/PlayerResources';
import { getHoveredGridCoord, isCoordConnectedToShip } from '@/systems/subsystems/utils/ShipBuildingUtils';
import { getRepairCost } from '@/systems/subsystems/utils/BlockRepairUtils';
import { audioManager } from '@/audio/Audio';
import { missionResultStore } from '@/game/missions/MissionResultStore';

import { ShipRegistry } from '@/game/ship/ShipRegistry';

import { GlobalSpriteRequestBus } from '@/rendering/unified/bus/SpriteRenderRequestBus';
import { getGL2BlockSprite } from '@/rendering/cache/BlockSpriteCache';
import { DamageLevel } from '@/rendering/cache/BlockSpriteCache';
import { PlayerExperienceManager } from '@/game/player/PlayerExperienceManager';

export class ShipBuilderController {
  private rotation: number = 0;
  private lastBlockId: string | null = null;
  private hoveredShipCoord: GridCoord | null = null;

  private ship: Ship | null = null;

  constructor(
    private readonly menu: ShipBuilderMenu,
    private readonly camera: Camera,
    private readonly shipBuilderEffects: ShipBuilderEffectsSystem,
    private readonly inputManager: InputManager
  ) {}

  setPlayerShip(ship: Ship): void {
    this.ship = ship;
  }

  update(transform: BlockEntityTransform) {
    if (!this.ship) return;

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

    // == Handles deleting the Block (right click)
    if (this.inputManager.wasRightClicked()) {
      const block = this.ship.getBlock(coord);
      if (!block) return;

      if (!block.type.metatags?.includes('cockpit')) {
        const deletionSafe = this.ship.isDeletionSafe(coord);
        if (!deletionSafe) {
          audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx', { maxSimultaneous: 3 });
          return;
        }
        this.shipBuilderEffects.createSellEffect(block.position!);
        this.ship.removeBlock(coord);
        audioManager.play('assets/sounds/sfx/ui/click_00.wav', 'sfx', { maxSimultaneous: 3 });
        const refundCost = Math.round(blockCost / 2);
        PlayerExperienceManager.getInstance().addEntropium(refundCost);
      }
    }

    // == Handles placing the block (left click)
    if (this.inputManager.wasMouseClicked()) {
      if (!this.ship.hasBlockAt(coord) && isCoordConnectedToShip(this.ship, coord)) {
        this.ship.placeBlockById(coord, blockId, this.rotation);
        const placedBlock = this.ship.getBlock(coord);
        if (placedBlock?.position) {
          // Repair effect here is a misnomer, it's just a visual effect to show block placement
          this.shipBuilderEffects.createRepairEffect(placedBlock.position);
        }
        const placementSound = getBlockType(blockId)?.placementSound ?? 'assets/sounds/sfx/ship/gather_00.wav';
        audioManager.play(placementSound, 'sfx', { maxSimultaneous: 3 });
        missionResultStore.incrementBlockPlacedCount();
      }
    }
  }

  render(_: unknown, transform: BlockEntityTransform): void {
    if (!this.ship) return;

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

    const tool = this.menu.getActiveTool();

    const SPRITE_ROTATION_CORRECTION = Math.PI;
    const FIN_ROTATION_CORRECTION = Math.PI * 1.5;

    function getCorrectedRotation(baseRotation: number, typeId: string): number {
      const needsFinCorrection = typeId.startsWith('fin');
      return baseRotation + SPRITE_ROTATION_CORRECTION + (needsFinCorrection ? FIN_ROTATION_CORRECTION : 0);
    }

    // These are placeholders until the drawBlockHighlight and drawBlockDeletionHighlight are in GL2
    // Repair is deprecated, but we'll keep it here, would be green ordinarily
    if (tool === ShipBuilderTool.REPAIR) {
      const hoveredBlock = this.ship.getBlock(coord);
      if (hoveredBlock) {
        const sprite = getGL2BlockSprite(hoveredBlock.type.id, DamageLevel.NONE);
        GlobalSpriteRequestBus.add({
          texture: sprite.base,
          worldX,
          worldY,
          widthPx: BLOCK_SIZE,
          heightPx: BLOCK_SIZE,
          alpha: 0.4,
          rotation: getCorrectedRotation(transform.rotation, hoveredBlock.type.id),
        });
      }
    } else if (tool === ShipBuilderTool.PLACE) {
      const blockId = this.menu.getSelectedBlockId();
      if (!blockId) return;

      const existingBlock = this.ship.getBlock(coord);

      // Highlight red if deleteable
      if (existingBlock) {
        const isSafe = this.ship.isDeletionSafe(coord);
        const overlayColor = isSafe ? DamageLevel.NONE : DamageLevel.HEAVY;
        const sprite = getGL2BlockSprite(existingBlock.type.id, overlayColor);

        GlobalSpriteRequestBus.add({
          texture: sprite.base,
          worldX,
          worldY,
          widthPx: BLOCK_SIZE,
          heightPx: BLOCK_SIZE,
          alpha: 0.6,
          rotation: getCorrectedRotation(transform.rotation, existingBlock.type.id),
        });
      } else {
        // Show the block we're placing itself as a preview over the cursor
        const sprite = getGL2BlockSprite(blockId, DamageLevel.NONE);

        GlobalSpriteRequestBus.add({
          texture: sprite.base,
          worldX,
          worldY,
          widthPx: BLOCK_SIZE,
          heightPx: BLOCK_SIZE,
          alpha: 0.6,
          rotation: getCorrectedRotation(
            transform.rotation + this.rotation * Math.PI / 180,
            blockId
          ),
        });
      }
    }
  }

  private isCursorOverMenu(mouse: { x: number; y: number }): boolean {
    return this.menu.isPointInBounds(mouse.x, mouse.y);
  }

  repairBlockAt(coord: { x: number; y: number }): void {
    if (!this.ship) return;

    const block = this.ship.getBlock(coord);
    if (!block) return;

    const missingHp = block.type.armor - block.hp;
    if (missingHp <= 0) return;

    block.hp = block.type.armor;
    this.shipBuilderEffects.createRepairEffect(block.position!);
  }

  repairAllBlocks(): void {
    if (!this.ship) return;

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
      audioManager.play('assets/sounds/sfx/ship/repair_00.wav', 'sfx');
      this.repairBlockAt(coord);
    }
  }

  getHoveredShipBlock(): BlockInstance | undefined {
    if (!this.ship) return;
    return this.hoveredShipCoord ? this.ship.getBlock(this.hoveredShipCoord) : undefined;
  }
}
