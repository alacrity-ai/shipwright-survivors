// src/rendering/AsteroidRenderer.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { Camera } from '@/core/Camera';
import type { CompositeBlockObjectCullingSystem } from '@/game/entities/systems/CompositeBlockObjectCullingSystem';
import type { InputManager } from '@/core/InputManager';

import { Asteroid } from '@/game/entities/Asteroid';
import { Ship } from '@/game/ship/Ship';
import { BLOCK_SIZE } from '@/config/view';
import { getAsteroidBlockSprite, AsteroidDamageLevel } from '@/rendering/cache/AsteroidSpriteCache';
import { getBlockSprite, getDamageLevel } from '@/rendering/cache/BlockSpriteCache';

export class AsteroidRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(
    canvasManager: CanvasManager,
    private readonly camera: Camera,
    private readonly cullingSystem: CompositeBlockObjectCullingSystem,
    private readonly inputManager: InputManager
  ) {
    this.ctx = canvasManager.getContext('entities');
  }

  render(): void {
    const visibleObjects = this.cullingSystem.getVisibleObjects();

    for (const obj of visibleObjects) {
      if (obj instanceof Ship) continue;
      const transform = obj.getTransform();
      const { position, rotation } = transform;

      const screen = this.camera.worldToScreen(position.x, position.y);

      this.ctx.save();
      this.ctx.translate(screen.x, screen.y);
      this.ctx.scale(this.camera.getZoom(), this.camera.getZoom());
      this.ctx.rotate(rotation);
      
      let sprite = null;
      let damageLevel = null;

      for (const [coord, block] of obj.getAllBlocks()) {
        // Damage level is not actually something we need to be calculating here??
        
        if (obj instanceof Asteroid) {
          damageLevel = this.getAsteroidDamageLevel(block.hp, block.type.armor ?? 1);
          sprite = getAsteroidBlockSprite(block.type.id, damageLevel);
        } else {
          damageLevel = getDamageLevel(block.hp, block.type.armor ?? 1);
          sprite = getBlockSprite(block.type, damageLevel);
        }

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

      this.ctx.restore();
    }
  }

  private getAsteroidDamageLevel(currentHp: number, maxHp: number): AsteroidDamageLevel {
    const ratio = currentHp / maxHp;
    if (ratio < 0.25) return AsteroidDamageLevel.CRUMBLING;
    if (ratio < 0.75) return AsteroidDamageLevel.FRACTURED;
    return AsteroidDamageLevel.NONE;
  }
}
