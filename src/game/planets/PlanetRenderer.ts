// src/game/planets/PlanetRenderer.ts

import type { Camera } from '@/core/Camera';
import { getAssetPath } from '@/shared/assetHelpers';

export class PlanetRenderer {
  private image: HTMLImageElement | null = null;

  constructor(
    private readonly imagePath: string,
    private readonly scale: number,
    private readonly name: string
  ) {
    this.loadImage();
  }

  private loadImage(): void {
    this.image = new Image();
    this.image.src = getAssetPath(this.imagePath);
  }

  render(
    ctx: CanvasRenderingContext2D,
    worldX: number,
    worldY: number,
    camera: Camera
  ): void {
    if (!this.image) return;

    const { x: screenX, y: screenY } = camera.worldToScreen(worldX, worldY);
    const drawWidth = this.image.width * this.scale * camera.zoom;
    const drawHeight = this.image.height * this.scale * camera.zoom;

    // === Draw planet image ===
    ctx.drawImage(
      this.image,
      screenX - drawWidth / 2,
      screenY - drawHeight / 2,
      drawWidth,
      drawHeight
    );

    // // === Draw nameplate ===
    // ctx.font = '20px monospace';
    // ctx.fillStyle = 'white';
    // ctx.textAlign = 'center';
    // ctx.fillText(this.name, screenX, screenY - drawHeight / 2 - 12);
  }
}
