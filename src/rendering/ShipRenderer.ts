import { Ship } from '@/game/ship/Ship';
import { getBlockSprite } from '@/rendering/cache/BlockSpriteCache';
import { BLOCK_SIZE } from '@/game/blocks/BlockRegistry';
import { CanvasManager } from '@/core/CanvasManager';
import { Camera } from '@/core/Camera';
import { getMousePosition } from '@/core/Input';

interface RenderOptions {
  worldPosition: { x: number; y: number }; // world coordinates
  rotation?: number;                       // radians (pivot around cockpit)
}

export class ShipRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(
    canvasManager: CanvasManager,
    private readonly camera: Camera
  ) {
    this.ctx = canvasManager.getContext('entities');
  }

  render(ship: Ship, options: RenderOptions) {
    const rotation = options.rotation ?? 0;

    const screen = this.camera.worldToScreen(
      options.worldPosition.x,
      options.worldPosition.y
    );

    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.ctx.save();
    this.ctx.translate(screen.x, screen.y);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.rotate(rotation);

    for (const [coord, block] of ship.getAllBlocks()) {
      const sprite = getBlockSprite(block.type.id);
      const px = coord.x * BLOCK_SIZE;
      const py = coord.y * BLOCK_SIZE;

      const blockRotation = (block.rotation ?? 0) * (Math.PI / 180);

      // === Render base block (rotates with ship and block base rotation)
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

    // === Second pass: overlays (turret barrels)
    const mouseScreen = getMousePosition();
    const mouseWorld = this.camera.screenToWorld(mouseScreen.x, mouseScreen.y);

    for (const [coord, block] of ship.getAllBlocks()) {
      const sprite = getBlockSprite(block.type.id);
      if (!sprite.overlay) continue;

      const localX = coord.x * BLOCK_SIZE;
      const localY = coord.y * BLOCK_SIZE;

      const worldX = options.worldPosition.x + coord.x * BLOCK_SIZE;
      const worldY = options.worldPosition.y + coord.y * BLOCK_SIZE;

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
