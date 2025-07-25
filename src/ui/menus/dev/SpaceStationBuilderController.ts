import { BlockManager } from '@/game/blocks/system/BlockManager';
import type { BlockStore } from '@/game/blocks/system/BlockStore';
import { getBlockSprite } from '@/rendering/cache/BlockSpriteCache';
import { getBlockCost, getBlockTypeByIndex, getBlockType } from '@/game/blocks/BlockRegistry';
import { ShipBuilderTool } from '@/ui/menus/types/ShipBuilderTool';
import { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';
import type { SpaceStation } from '@/game/entities/SpaceStation';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { Camera } from '@/core/Camera';
import type { SpaceStationBuilderMenu } from '@/ui/menus/dev/SpaceStationBuilderMenu';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import { drawBlockHighlight, drawBlockDeletionHighlight } from '@/rendering/primitives/HighlightUtils';
import { BLOCK_SIZE } from '@/config/view';
import type { InputManager } from '@/core/InputManager';
import { getHoveredGridCoord } from '@/systems/subsystems/utils/ShipBuildingUtils';
import { getRepairCost } from '@/systems/subsystems/utils/BlockRepairUtils';
import { audioManager } from '@/audio/Audio';

export class SpaceStationBuilderController {
  private rotation: number = 0;
  private lastBlockId: string | null = null;
  private hasSaved = false;
  private hoveredShipCoord: GridCoord | null = null;

  private store: BlockStore;

  constructor(
    private readonly spaceStation: SpaceStation,
    private readonly menu: SpaceStationBuilderMenu,
    private readonly camera: Camera,
    private readonly shipBuilderEffects: ShipBuilderEffectsSystem,
    private readonly inputManager: InputManager
  ) {
    this.store = BlockManager.getInstance().getBlockStore();
  }

  update(transform: BlockEntityTransform) {
    if (this.inputManager.wasKeyJustPressed('Space')) {
      this.rotation = (this.rotation + 90) % 360;
    }

    const mouse = this.inputManager.getMousePosition();
    if (this.isCursorOverMenu(mouse)) return;

    const coord = getHoveredGridCoord(mouse, this.camera, transform.position, transform.rotation);

    // === REPAIR MODE ===
    if (this.menu.getActiveTool() === ShipBuilderTool.REPAIR) {
      const idx = this.spaceStation.getBlockIndex(coord);
      this.menu.setHoveredShipBlock(idx !== undefined ? idx : undefined);

      if (idx !== undefined && this.inputManager.wasMouseClicked()) {
        audioManager.play('assets/sounds/sfx/ship/repair_00.wav', 'sfx');
        this.repairBlockAt(idx);
      }
      return; // Skip placement
    }

    // === PLACEMENT MODE ===
    const blockId = this.menu.getSelectedBlockId();
    if (!blockId) return;

    if (blockId !== this.lastBlockId) {
      this.rotation = 0;
      this.lastBlockId = blockId;
    }

    const blockCost = getBlockCost(blockId);
    if (blockCost === undefined) return;

    // Handle deletion (right-click)
    if (this.inputManager.wasRightClicked()) {
      const idx = this.spaceStation.getBlockIndex(coord);
      if (idx !== undefined) {
        const type = getBlockTypeByIndex(this.store.typeIndex[idx]);
        if (type && !type.metatags?.includes('cockpit')) {
          this.spaceStation.removeBlock(coord);
          audioManager.play('assets/sounds/sfx/ui/click_00.wav', 'sfx', { maxSimultaneous: 3 });
        }
      }
    }

    // Handle placement (left-click)
    if (this.inputManager.wasMouseClicked()) {
      this.spaceStation.placeBlockById(coord, blockId, this.rotation);
      audioManager.play('assets/sounds/sfx/ship/attach_00.wav', 'sfx', { maxSimultaneous: 3 });
    }

    // Save behavior (unchanged)
    if (this.inputManager.isLPressed() && !this.hasSaved) {
      const filename = 'saved_player_ship.json';
      this.hasSaved = true;
    }
    if (!this.inputManager.isLPressed() && this.hasSaved) {
      this.hasSaved = false;
    }
  }

  render(ctx: CanvasRenderingContext2D, transform: BlockEntityTransform): void {
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

    const screen = this.camera.worldToScreen(worldX, worldY);
    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.scale(this.camera.getZoom(), this.camera.getZoom());
    ctx.rotate(transform.rotation);

    const tool = this.menu.getActiveTool();

    if (tool === ShipBuilderTool.REPAIR) {
      const idx = this.spaceStation.getBlockIndex(coord);
      if (idx !== undefined) {
        drawBlockHighlight(ctx, 'rgba(0,255,0,0.3)');
      }
    } else if (tool === ShipBuilderTool.PLACE) {
      const blockId = this.menu.getSelectedBlockId();
      if (!blockId) {
        ctx.restore();
        return;
      }

      const idx = this.spaceStation.getBlockIndex(coord);
      if (idx !== undefined) {
        const isSafe = this.spaceStation.isDeletionSafeSOA(coord);
        drawBlockDeletionHighlight(ctx, isSafe);
      } else {
        const blockType = getBlockType(blockId);
        if (!blockType) return;

        const sprite = getBlockSprite(blockType);
        ctx.save();
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.globalAlpha = 0.6;
        ctx.drawImage(sprite.base, -BLOCK_SIZE / 2, -BLOCK_SIZE / 2, BLOCK_SIZE, BLOCK_SIZE);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  private isCursorOverMenu(mouse: { x: number; y: number }): boolean {
    return this.menu.isPointInBounds(mouse.x, mouse.y);
  }

  private repairBlockAt(idx: number): void {
    const typeIdx = this.store.typeIndex[idx];
    const blockType = getBlockTypeByIndex(typeIdx);
    if (!blockType) return;

    const maxHp = blockType.armor ?? 0;
    const currentHp = this.store.hp[idx];
    const missingHp = maxHp - currentHp;
    if (missingHp <= 0) return;

    this.store.hp[idx] = maxHp;

    this.shipBuilderEffects.createRepairEffect({
      x: this.store.worldX[idx],
      y: this.store.worldY[idx],
    });
  }

  repairAllBlocks(): void {
    const damagedIndices: number[] = [];
    const allBlocks = this.spaceStation.getAllBlockIndices();

    for (const idx of allBlocks) {
      const typeIdx = this.store.typeIndex[idx];
      const blockType = getBlockTypeByIndex(typeIdx);
      if (!blockType) continue;

      if (this.store.hp[idx] < (blockType.armor ?? 0)) {
        damagedIndices.push(idx);
      }
    }

    // Sort by damage severity, then by cost
    damagedIndices.sort((a, b) => {
      const typeA = getBlockTypeByIndex(this.store.typeIndex[a])!;
      const typeB = getBlockTypeByIndex(this.store.typeIndex[b])!;
      const missingA = (typeA.armor ?? 0) - this.store.hp[a];
      const missingB = (typeB.armor ?? 0) - this.store.hp[b];
      if (missingA !== missingB) return missingB - missingA;

      const costA = getRepairCost(a);
      const costB = getRepairCost(b);
      return costA - costB;
    });

    for (const idx of damagedIndices) {
      audioManager.play('assets/sounds/sfx/ship/repair_00.wav', 'sfx');
      this.repairBlockAt(idx);
    }
  }

  getHoveredShipBlockIndex(): number | undefined {
    return this.hoveredShipCoord ? this.spaceStation.getBlockIndex(this.hoveredShipCoord) : undefined;
  }
}
