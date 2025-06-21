// src/ui/components/BlockPreviewRenderer.ts

import type { BlockType } from '@/game/interfaces/types/BlockType';

import { BLOCK_SIZE } from '@/config/view';
import { getBlockSprite } from '@/rendering/cache/BlockSpriteCache';


export class BlockPreviewRenderer {
  private baseAngle = 0;
  private overlayAngle = 0;

  // private readonly baseSpinSpeed;     // radians/ms (slow rotation)
  // private readonly overlaySpinSpeed;   // radians/ms (faster for overlays)

  private readonly size = BLOCK_SIZE; // Will be scaled by view scale

  constructor(
    private readonly blockType: BlockType, 
    private readonly baseSpinSpeed: number = 1, 
    private readonly overlaySpinSpeed: number = 2) {}

  update(dt: number): void {
    this.baseAngle += this.baseSpinSpeed * dt;
    this.overlayAngle += this.overlaySpinSpeed * dt;

    if (this.baseAngle > Math.PI * 2) this.baseAngle -= Math.PI * 2;
    if (this.overlayAngle > Math.PI * 2) this.overlayAngle -= Math.PI * 2;
  }

  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    alpha: number = 1.0,
    BlockOverride: BlockType | null = null,
  ): void {
    const block = BlockOverride ?? this.blockType;
    const sprite = getBlockSprite(block.id);

    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // === Draw base sprite with idle spin ===
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.globalAlpha *= alpha;
    ctx.rotate(this.baseAngle);
    ctx.drawImage(
      sprite.base,
      -width / 2,
      -height / 2,
      width,
      height
    );
    ctx.restore();

    // === Draw overlay sprite with faster spin (if exists) ===
    if (sprite.overlay) {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.globalAlpha *= alpha;
      ctx.rotate(this.overlayAngle);
      ctx.drawImage(
        sprite.overlay,
        -width / 2,
        -height / 2,
        width,
        height
      );
      ctx.restore();
    }
  }
}
