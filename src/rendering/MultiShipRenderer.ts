import type { CanvasManager } from '@/core/CanvasManager';
import type { Camera } from '@/core/Camera';
import type { ShipCullingSystem } from '@/game/ship/systems/ShipCullingSystem';
import { getBlockSprite, getDamageLevel } from '@/rendering/cache/BlockSpriteCache';
import type { InputManager } from '@/core/InputManager';
import { BLOCK_SIZE } from '@/game/blocks/BlockRegistry';

export class MultiShipRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(
    canvasManager: CanvasManager,
    private readonly camera: Camera,
    private readonly cullingSystem: ShipCullingSystem,
    private readonly inputManager: InputManager
  ) {
    this.ctx = canvasManager.getContext('entities');
    this.inputManager = inputManager;
  }

  render(): void {
    const visibleShips = this.cullingSystem.getVisibleShips();
    const mouseScreen = this.inputManager.getMousePosition();
    const mouseWorld = this.camera.screenToWorld(mouseScreen.x, mouseScreen.y);

    for (const ship of visibleShips) {
      const transform = ship.getTransform();
      const { position, rotation } = transform;

      const screen = this.camera.worldToScreen(position.x, position.y);

      this.ctx.save();
      this.ctx.translate(screen.x, screen.y);
      this.ctx.scale(this.camera.zoom, this.camera.zoom);
      this.ctx.rotate(rotation);

      // === Base layer: hulls, cockpits, engines with damage variants
      for (const [coord, block] of ship.getAllBlocks()) {
        const maxHp = block.type.armor ?? 1;
        const damageLevel = getDamageLevel(block.hp, maxHp);
        const sprite = getBlockSprite(block.type.id, damageLevel);
        
        const px = coord.x * BLOCK_SIZE;
        const py = coord.y * BLOCK_SIZE;
        const blockRotation = (block.rotation ?? 0) * (Math.PI / 180);

        this.ctx.save();
        this.ctx.translate(px, py);
        this.ctx.rotate(blockRotation);
        this.ctx.drawImage(
          sprite.base,
          -BLOCK_SIZE / 2,
          -BLOCK_SIZE / 2,
          BLOCK_SIZE,
          BLOCK_SIZE
        );
        this.ctx.restore();
      }

      // === Overlay pass: e.g. turret barrels with damage variants
      for (const [coord, block] of ship.getAllBlocks()) {
        const maxHp = block.type.armor ?? 1;
        const damageLevel = getDamageLevel(block.hp, maxHp);
        const sprite = getBlockSprite(block.type.id, damageLevel);
        
        if (!sprite.overlay) continue;

        const localX = coord.x * BLOCK_SIZE;
        const localY = coord.y * BLOCK_SIZE;

        const worldX = position.x + localX;
        const worldY = position.y + localY;

        const dx = mouseWorld.x - worldX;
        const dy = mouseWorld.y - worldY;
        const globalAngle = Math.atan2(dy, dx);
        const localAngle = globalAngle - rotation + Math.PI / 2;

        this.ctx.save();
        this.ctx.translate(localX, localY);
        this.ctx.rotate(localAngle);
        this.ctx.drawImage(
          sprite.overlay,
          -BLOCK_SIZE / 2,
          -BLOCK_SIZE / 2,
          BLOCK_SIZE,
          BLOCK_SIZE
        );
        this.ctx.restore();
      }

      this.ctx.restore();
    }
  }
}