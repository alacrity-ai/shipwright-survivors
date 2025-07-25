import { getBlockTypeByIndex } from '@/game/blocks/BlockRegistry';
import { BlockManager } from '@/game/blocks/system/BlockManager';
import type { BlockStore } from '@/game/blocks/system/BlockStore';
import { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';
import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { Camera } from '@/core/Camera';
import type { BlockDropDecisionMenu } from '@/ui/menus/BlockDropDecisionMenu';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import { BLOCK_SIZE } from '@/config/view';
import type { InputManager } from '@/core/InputManager';
import { getHoveredGridCoord, isCoordConnectedToShip } from '@/systems/subsystems/utils/ShipBuildingUtils';
import { audioManager } from '@/audio/Audio';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { PlayerResources } from '@/game/player/PlayerResources';

import { GlobalSpriteRequestBus } from '@/rendering/unified/bus/SpriteRenderRequestBus';
import { getGL2BlockSprite, DamageLevel } from '@/rendering/cache/BlockSpriteCache';
import { PlayerExperienceManager } from '@/game/player/PlayerExperienceManager';

const SPRITE_ROTATION_CORRECTION = Math.PI;
const FIN_ROTATION_CORRECTION = Math.PI / 2;

export class BlockPlacementController {
  private ship: Ship | null = null;

  private rotation: number = 0;
  private lastBlockId: string | null = null;
  private hoveredShipCoord: GridCoord | null = null;
  private store: BlockStore;

  constructor(
    private readonly menu: BlockDropDecisionMenu,
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

    if (this.inputManager.wasKeyJustPressed('Space')) {
      this.rotation = (this.rotation + 90) % 360;
    }

    const mouse = this.inputManager.getMousePosition();
    if (this.isCursorOverMenu(mouse)) return;

    const coord = getHoveredGridCoord(mouse, this.camera, transform.position, transform.rotation);
    this.hoveredShipCoord = coord;

    const blockType = this.menu.getCurrentBlockType();
    const blockId = blockType?.id ?? null;
    if (!blockId || !blockType) return;

    // === RIGHT CLICK SELL BLOCK ===
    if (this.inputManager.wasRightClicked() && this.hoveredShipCoord) {
      const blockIdx = this.ship.getBlockIndex(this.hoveredShipCoord);
      if (blockIdx === undefined) return;

      const type = getBlockTypeByIndex(this.store.typeIndex[blockIdx]);
      if (!type) return;

      if (!type.metatags?.includes('cockpit')) {
        const deletionSafe = this.ship.isDeletionSafe(this.hoveredShipCoord);
        if (!deletionSafe) {
          audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx', { maxSimultaneous: 3 });
          return;
        }

        const blockCost = type.cost ?? 0;
        const refundAmount = Math.round(blockCost / 2);

        this.shipBuilderEffects.createSellEffect({
          x: this.store.worldX[blockIdx],
          y: this.store.worldY[blockIdx]
        });

        this.ship.removeBlock(this.hoveredShipCoord);
        audioManager.play('assets/sounds/sfx/ui/click_00.wav', 'sfx', { maxSimultaneous: 3 });

        PlayerExperienceManager.getInstance().addEntropium(refundAmount);
      }
    }

    if (blockId !== this.lastBlockId) {
      this.rotation = 0;
      this.lastBlockId = blockId;
    }

    if (this.inputManager.wasMouseClicked()) {
      if (!this.ship.hasBlockAt(coord) && isCoordConnectedToShip(this.ship, coord)) {
        this.ship.placeBlockById(coord, blockId, this.rotation);
        const placedIdx = this.ship.getBlockIndex(coord);
        if (placedIdx !== undefined) {
          this.shipBuilderEffects.createRepairEffect({
            x: this.store.worldX[placedIdx],
            y: this.store.worldY[placedIdx]
          });
        }
        const placementSound = blockType.placementSound ?? 'assets/sounds/sfx/ship/gather_00.wav';
        audioManager.play(placementSound, 'sfx', { maxSimultaneous: 3 });
        missionResultStore.incrementBlockPlacedCount();
        PlayerResources.getInstance().dequeueBlock();
        this.menu.advanceQueueOrClose();
      }
    }
  }

  private getCorrectedRotation(base: number, typeId: string): number {
    const needsFinCorrection = typeId.startsWith('fin');
    return base + SPRITE_ROTATION_CORRECTION + (needsFinCorrection ? FIN_ROTATION_CORRECTION : 0);
  }

  render(_: unknown, transform: BlockEntityTransform): void {
    if (!this.ship) return;

    const mouse = this.inputManager.getMousePosition();
    if (this.isCursorOverMenu(mouse)) return;

    const coord = getHoveredGridCoord(mouse, this.camera, transform.position, transform.rotation);
    const localX = coord.x * BLOCK_SIZE;
    const localY = coord.y * BLOCK_SIZE;

    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);
    const rotatedX = localX * cos - localY * sin;
    const rotatedY = localX * sin + localY * cos;
    const worldX = transform.position.x + rotatedX;
    const worldY = transform.position.y + rotatedY;

    const blockType = this.menu.getCurrentBlockType();
    const blockId = blockType?.id ?? null;
    if (!blockId) return;

    const existingIdx = this.ship.getBlockIndex(coord);

    if (existingIdx !== undefined) {
      const type = getBlockTypeByIndex(this.store.typeIndex[existingIdx]);
      if (!type) return;
      const sprite = getGL2BlockSprite(type, DamageLevel.NONE);
      GlobalSpriteRequestBus.add({
        texture: sprite.base,
        worldX,
        worldY,
        widthPx: BLOCK_SIZE,
        heightPx: BLOCK_SIZE,
        alpha: 0.4,
        rotation: this.getCorrectedRotation(transform.rotation, type.id),
      });
    } else {
      if (!blockType) return;
      const sprite = getGL2BlockSprite(blockType, DamageLevel.NONE);
      GlobalSpriteRequestBus.add({
        texture: sprite.base,
        worldX,
        worldY,
        widthPx: BLOCK_SIZE,
        heightPx: BLOCK_SIZE,
        alpha: 0.6,
        rotation: this.getCorrectedRotation(
          transform.rotation + this.rotation * Math.PI / 180,
          blockId
        ),
      });
    }
  }

  private isCursorOverMenu(mouse: { x: number; y: number }): boolean {
    return this.menu.isPointInBounds(mouse.x, mouse.y);
  }

  getHoveredShipBlockIndex(): number | undefined {
    if (!this.ship || !this.hoveredShipCoord) return undefined;
    return this.ship.getBlockIndex(this.hoveredShipCoord);
  }
}
