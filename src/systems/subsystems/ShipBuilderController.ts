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

import { getBlockIndexByType, getBlockTypeByIndex } from '@/game/blocks/BlockRegistry';

import { BLOCK_SIZE } from '@/config/view';
import type { InputManager } from '@/core/InputManager';
import { PlayerResources } from '@/game/player/PlayerResources';
import { getHoveredGridCoord, isCoordConnectedToShip } from '@/systems/subsystems/utils/ShipBuildingUtils';
import { getRepairCost } from '@/systems/subsystems/utils/BlockRepairUtils';
import { audioManager } from '@/audio/Audio';
import { missionResultStore } from '@/game/missions/MissionResultStore';

import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { BlockManager } from '@/game/blocks/system/BlockManager';
import type { BlockStore } from '@/game/blocks/system/BlockStore';

import { GlobalSpriteRequestBus } from '@/rendering/unified/bus/SpriteRenderRequestBus';
import { getGL2BlockSprite } from '@/rendering/cache/BlockSpriteCache';
import { DamageLevel } from '@/rendering/cache/BlockSpriteCache';
import { PlayerExperienceManager } from '@/game/player/PlayerExperienceManager';

export class ShipBuilderController {
  private rotation: number = 0;
  private lastBlockId: string | null = null;
  private hoveredShipCoord: GridCoord | null = null;
  private currentGroup: number = 0; // Default group

  private ship: Ship | null = null;
  private store: BlockStore;

  constructor(
    private readonly menu: ShipBuilderMenu,
    private readonly camera: Camera,
    private readonly shipBuilderEffects: ShipBuilderEffectsSystem,
    private readonly inputManager: InputManager
  ) {
    this.store = BlockManager.getInstance().getBlockStore();
  }

  setPlayerShip(ship: Ship): void {
    this.ship = ship;
  }

  update(transform: BlockEntityTransform) {
    if (!this.ship) return;

    if (this.inputManager.wasKeyJustPressed('KeyZ')) {
      this.currentGroup = Math.max(0, this.currentGroup - 1);
      console.log('[ShipBuilderController] Group:', this.currentGroup);
    }

    if (this.inputManager.wasKeyJustPressed('KeyX')) {
      this.currentGroup = Math.min(255, this.currentGroup + 1); // 8-bit group cap
      console.log('[ShipBuilderController] Group:', this.currentGroup);
    }

    if (this.inputManager.wasKeyJustPressed('Space')) {
      this.rotation = (this.rotation + 90) % 360;
    }

    const mouse = this.inputManager.getMousePosition();
    if (this.isCursorOverMenu(mouse)) return;

    const coord = getHoveredGridCoord(mouse, this.camera, transform.position, transform.rotation);

    // REPAIR MODE: Update hovered ship block for repair mode
    // -- handle repair mode BEFORE early return --
    if (this.menu.getActiveTool() === ShipBuilderTool.REPAIR) {
      const hoveredBlockIdx = this.ship.getBlockIndex(coord);
      this.menu.setHoveredShipBlock(hoveredBlockIdx);

      if (hoveredBlockIdx !== undefined && this.inputManager.wasMouseClicked()) {
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

    // == Handles deleting the Block (right click)
    if (this.inputManager.wasRightClicked()) {
      const blockIdx = this.ship.getBlockIndex(coord);
      if (blockIdx === undefined) return;

      const blockType = getBlockTypeByIndex(this.store.typeIndex[blockIdx]);
      if (!blockType) return;

      if (!blockType.metatags?.includes('cockpit')) {
        const deletionSafe = this.ship.isDeletionSafe(coord);
        if (!deletionSafe) {
          audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx', { maxSimultaneous: 3 });
          return;
        }
        this.shipBuilderEffects.createSellEffect({ x: this.store.worldX[blockIdx], y: this.store.worldY[blockIdx] });
        this.ship.removeBlock(coord);
        audioManager.play('assets/sounds/sfx/ui/click_00.wav', 'sfx', { maxSimultaneous: 3 });
      }
    }

    // == Handles placing the block (left click)
    if (this.inputManager.wasMouseClicked()) {
      if (!this.ship.hasBlockAt(coord) && isCoordConnectedToShip(this.ship, coord)) {
        this.ship.placeBlockById(coord, blockId, this.rotation, this.currentGroup);
        const placedBlockIdx = this.ship.getBlockIndex(coord);
        if (placedBlockIdx !== undefined) {
          // Repair effect here is a misnomer, it's just a visual effect to show block placement
          this.shipBuilderEffects.createRepairEffect({ x: this.store.worldX[placedBlockIdx], y: this.store.worldY[placedBlockIdx] });
        }
        const placementSound = getBlockType(blockId)?.placementSound ?? 'assets/sounds/sfx/ship/gather_00.wav';
        audioManager.play(placementSound, 'sfx', { maxSimultaneous: 3 });
        missionResultStore.incrementBlockPlacedCount();
      } else {
        console.warn('[ShipBuilderController] Block already exists at coord', coord);
      }
    }
  }

  render(_: unknown, transform: BlockEntityTransform): void {
    if (!this.ship) return;

    const mouse = this.inputManager.getMousePosition();
    if (this.isCursorOverMenu(mouse)) return;

    const coord = getHoveredGridCoord(mouse, this.camera, transform.position, transform.rotation);

    // Convert grid coord → world space for cursor position
    const localX = coord.x * BLOCK_SIZE;
    const localY = coord.y * BLOCK_SIZE;

    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);

    const rotatedX = localX * cos - localY * sin;
    const rotatedY = localX * sin + localY * cos;

    const worldX = transform.position.x + rotatedX;
    const worldY = transform.position.y + rotatedY;

    const tool = this.menu.getActiveTool();
    const store = this.store;

    const SPRITE_ROTATION_CORRECTION = Math.PI;
    const FIN_ROTATION_CORRECTION = Math.PI * 1.5;

    function getCorrectedRotation(baseRotation: number, typeId: string): number {
      const needsFinCorrection = typeId.startsWith('fin');
      return baseRotation + SPRITE_ROTATION_CORRECTION + (needsFinCorrection ? FIN_ROTATION_CORRECTION : 0);
    }

    if (tool === ShipBuilderTool.REPAIR) {
      const hoveredIdx = this.ship.getBlockIndex(coord);
      if (hoveredIdx !== undefined) {
        const typeIdx = store.typeIndex[hoveredIdx];
        const blockType = getBlockTypeByIndex(typeIdx);
        if (!blockType) return;

        const sprite = getGL2BlockSprite(blockType, DamageLevel.NONE);
        GlobalSpriteRequestBus.add({
          texture: sprite.base,
          worldX: store.worldX[hoveredIdx],
          worldY: store.worldY[hoveredIdx],
          widthPx: BLOCK_SIZE,
          heightPx: BLOCK_SIZE,
          alpha: 0.4,
          rotation: getCorrectedRotation(transform.rotation, blockType.id),
        });
      }
    } else if (tool === ShipBuilderTool.PLACE) {
      const blockId = this.menu.getSelectedBlockId();
      if (!blockId) return;

      const existingIdx = this.ship.getBlockIndex(coord);
      if (existingIdx !== undefined) {
        const typeIdx = store.typeIndex[existingIdx];
        const blockType = getBlockTypeByIndex(typeIdx);
        if (!blockType) return;

        const isSafe = this.ship.isDeletionSafe(coord);
        const overlayColor = isSafe ? DamageLevel.NONE : DamageLevel.HEAVY;

        const sprite = getGL2BlockSprite(blockType, overlayColor);
        GlobalSpriteRequestBus.add({
          texture: sprite.base,
          worldX: store.worldX[existingIdx],
          worldY: store.worldY[existingIdx],
          widthPx: BLOCK_SIZE,
          heightPx: BLOCK_SIZE,
          alpha: 0.6,
          rotation: getCorrectedRotation(transform.rotation, blockType.id),
        });
      } else {
        const blockType = getBlockType(blockId);
        if (!blockType) return;

        const sprite = getGL2BlockSprite(blockType, DamageLevel.NONE);
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

    const blockIdx = this.ship.getBlockIndex(coord);
    if (blockIdx === undefined) return;

    const typeIdx = this.store.typeIndex[blockIdx];
    const blockType = getBlockTypeByIndex(typeIdx);
    if (!blockType) return;

    const hp = this.store.hp[blockIdx];
    const missingHp = blockType.armor - hp;
    if (missingHp <= 0) return;

    // Fully repair the block
    this.store.hp[blockIdx] = blockType.armor;

    // Trigger visual effect at the block’s world position
    this.shipBuilderEffects.createRepairEffect({
      x: this.store.worldX[blockIdx],
      y: this.store.worldY[blockIdx],
    });
  }

  repairAllBlocks(): void {
    if (!this.ship) return;

    const playerResources = PlayerResources.getInstance();
    const store = this.store;

    // Gather all damaged block indices
    const damagedBlocks = this.ship.getAllBlockIndices()
      .filter(idx => {
        const type = getBlockTypeByIndex(store.typeIndex[idx]);
        if (!type) return false;
        return store.hp[idx] < type.armor;
      })
      .sort((a, b) => {
        const typeA = getBlockTypeByIndex(store.typeIndex[a])!;
        const typeB = getBlockTypeByIndex(store.typeIndex[b])!;

        const missingA = typeA.armor - store.hp[a];
        const missingB = typeB.armor - store.hp[b];
        if (missingA !== missingB) {
          return missingB - missingA; // Prioritize most damaged first
        }

        const costA = getRepairCost(a);
        const costB = getRepairCost(b);
        return costA - costB; // Then cheapest repair cost first
      });

    for (const idx of damagedBlocks) {
      const repairCost = getRepairCost(idx);
      audioManager.play('assets/sounds/sfx/ship/repair_00.wav', 'sfx');
      // Fully repair via store
      const type = getBlockTypeByIndex(store.typeIndex[idx])!;
      store.hp[idx] = type.armor;

      // Spawn a repair effect at the world position
      this.shipBuilderEffects.createRepairEffect({
        x: store.worldX[idx],
        y: store.worldY[idx],
      });
    }
  }

  getHoveredShipBlockIndex(): number | undefined {
    if (!this.ship || !this.hoveredShipCoord) return undefined;
    return this.ship.getBlockIndex(this.hoveredShipCoord);
  }
}
