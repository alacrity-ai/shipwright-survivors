import type { CanvasManager } from '@/core/CanvasManager';
import type { Camera } from '@/core/Camera';
import type { ShipCullingSystem } from '@/game/ship/systems/ShipCullingSystem';
import type { InputManager } from '@/core/InputManager';
import { BLOCK_SIZE } from '@/game/blocks/BlockRegistry';
import { getBlockSprite, getDamageLevel } from '@/rendering/cache/BlockSpriteCache';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';

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
    const lightingEnabled = PlayerSettingsManager.getInstance().isLightingEnabled();

    for (const ship of visibleShips) {
      const transform = ship.getTransform();
      const { position, rotation } = transform;

      // === Update light aura position if lighting is enabled ===
      if (lightingEnabled) {
        const auraId = ship.getLightAuraId?.();
        if (auraId) {
          try {
            LightingOrchestrator.getInstance().updateLight(auraId, {
              x: position.x,
              y: position.y,
            });
            console.log('Updating ship light for ship: ', ship.id);
          } catch (e) {
            console.warn(`[MultiShipRenderer] Failed to update aura light for ship ${ship.id}:`, e);
          }
        }
      }

      // === Render ship ===
      const screen = this.camera.worldToScreen(position.x, position.y);

      this.ctx.save();
      this.ctx.translate(screen.x, screen.y);
      this.ctx.scale(this.camera.getZoom(), this.camera.getZoom());
      this.ctx.rotate(rotation);

      for (const [coord, block] of ship.getAllBlocks()) {
        if (block.hidden) continue;

        const maxHp = block.type.armor ?? 1;
        const damageLevel = getDamageLevel(block.hp, maxHp);
        const sprite = getBlockSprite(block.type.id, damageLevel);

        const localX = coord.x * BLOCK_SIZE;
        const localY = coord.y * BLOCK_SIZE;
        const blockRotation = (block.rotation ?? 0) * (Math.PI / 180);

        // === Base layer ===
        this.ctx.save();
        this.ctx.translate(localX, localY);
        this.ctx.rotate(blockRotation);
        this.ctx.drawImage(
          sprite.base,
          -BLOCK_SIZE / 2,
          -BLOCK_SIZE / 2,
          BLOCK_SIZE,
          BLOCK_SIZE
        );
        this.ctx.restore();

        // === Overlay (e.g., turret heads) ===
        if (sprite.overlay) {
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
      }

      this.ctx.restore();
    }
  }
}
