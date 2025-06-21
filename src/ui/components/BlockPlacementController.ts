import { getBlockSprite } from '@/rendering/cache/BlockSpriteCache';
import { getBlockType } from '@/game/blocks/BlockRegistry';
import { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';
import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { Camera } from '@/core/Camera';
import type { BlockDropDecisionMenu } from '@/ui/menus/BlockDropDecisionMenu';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import { drawBlockDeletionHighlight } from '@/rendering/primitives/HighlightUtils';
import { BLOCK_SIZE } from '@/config/view';
import type { InputManager } from '@/core/InputManager';
import { getHoveredGridCoord, isCoordConnectedToShip } from '@/systems/subsystems/utils/ShipBuildingUtils';
import { audioManager } from '@/audio/Audio';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { PlayerResources } from '@/game/player/PlayerResources';

export class BlockPlacementController {
  private rotation: number = 0;
  private lastBlockId: string | null = null;
  private hoveredShipCoord: GridCoord | null = null;

  constructor(
    private readonly ship: Ship,
    private readonly menu: BlockDropDecisionMenu,
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
    this.hoveredShipCoord = coord;

    // PLACEMENT MODE: Block Placement Logic
    const blockType = this.menu.getCurrentBlockType();
    const blockId = blockType?.id ?? null;
    if (!blockId || !blockType) return;

    // === RIGHT CLICK SELL BLOCK ===
    if (this.inputManager.wasRightClicked() && this.hoveredShipCoord) {
      const block = this.ship.getBlock(this.hoveredShipCoord);
      if (!block) return;

      // Disallow selling cockpit blocks
      if (!block.type.id.startsWith('cockpit')) {
        const deletionSafe = this.ship.isDeletionSafe(this.hoveredShipCoord);
        if (!deletionSafe) {
          audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx', { maxSimultaneous: 3 });
          return;
        }

        const blockCost = getBlockType(block.type.id)?.cost ?? 0;
        const refundAmount = Math.round(blockCost / 2);

        this.shipBuilderEffects.createSellEffect(block.position!);
        this.ship.removeBlock(this.hoveredShipCoord);
        audioManager.play('assets/sounds/sfx/ui/click_00.wav', 'sfx', { maxSimultaneous: 3 });

        PlayerResources.getInstance().addCurrency(refundAmount);
      }
    }

    // Reset rotation when block type changes
    if (blockId !== this.lastBlockId) {
      this.rotation = 0;
      this.lastBlockId = blockId;
    }

    if (this.inputManager.wasMouseClicked()) {
      if (!this.ship.hasBlockAt(coord) && isCoordConnectedToShip(this.ship, coord)) {
        this.ship.placeBlockById(coord, blockId, this.rotation);
        const placedBlock = this.ship.getBlock(coord);
        if (placedBlock?.position) {
          this.shipBuilderEffects.createRepairEffect(placedBlock.position);
        }
        const placementSound = getBlockType(blockId)?.placementSound ?? 'assets/sounds/sfx/ship/gather_00.wav';
        audioManager.play(placementSound, 'sfx', { maxSimultaneous: 3 });
        missionResultStore.incrementBlockPlacedCount();
        PlayerResources.getInstance().dequeueBlock();
        this.menu.advanceQueueOrClose();
      }
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

    const blockType = this.menu.getCurrentBlockType();
    const blockId = blockType?.id ?? null;
    if (!blockId) {
      ctx.restore();
      return;
    }

    const existingBlock = this.ship.getBlock(coord);

    if (existingBlock) {
      const isSafe = this.ship.isDeletionSafe(coord);
      drawBlockDeletionHighlight(ctx, isSafe); // Misnomer, it's just a red highlight showing we can't place there
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
    ctx.restore();
  }

  private isCursorOverMenu(mouse: { x: number; y: number }): boolean {
    return this.menu.isPointInBounds(mouse.x, mouse.y);
  }

  getHoveredShipBlock(): BlockInstance | undefined {
    return this.hoveredShipCoord ? this.ship.getBlock(this.hoveredShipCoord) : undefined;
  }
}
