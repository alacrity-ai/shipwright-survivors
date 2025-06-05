// src/game/planets/PlanetRenderer.ts

import type { Camera } from '@/core/Camera';
import { getAssetPath } from '@/shared/assetHelpers';
import { drawCRTText } from '@/ui/primitives/CRTText';
import { CRTMonitor } from '@/ui/primitives/CRTMonitor';

export class PlanetRenderer {
  private image: HTMLImageElement | null = null;

  // === Add overlay box ===
  private readonly overlayBox: CRTMonitor;

  constructor(
    private readonly imagePath: string,
    private readonly scale: number,
    private readonly name: string,
  ) {
    this.loadImage();

    // Fixed-size overlay box (in screen-space)
    const width = 360;
    const height = 80;
    const x = (1280 - width) / 2; // Centered for fixed viewport
    const y = 48;

this.overlayBox = new CRTMonitor(x, y, width, height, {
  backgroundColor: '#0a0a0a',           // Deep neutral grey (instead of full black)
  alpha: 0.4,                           // Reduced opacity for subtlety
  glowColor: '#00aa33',                // Muted green glow (less neon)
  borderColor: '#004411',              // Very dark green border
  borderRadius: 4,                     // Slightly tighter corners
  scanlineSpacing: 5                   // Slightly denser lines for better cohesion
});

  }

  private loadImage(): void {
    this.image = new Image();
    this.image.src = getAssetPath(this.imagePath);
  }

  render(
    ctx: CanvasRenderingContext2D,
    overlayCtx: CanvasRenderingContext2D,
    worldX: number,
    worldY: number,
    camera: Camera,
    inInteractionRange: boolean,
    isInteracting: boolean
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

    // === Interaction overlay ===
    if (inInteractionRange && !isInteracting) {
      this.overlayBox.update(performance.now());
      this.overlayBox.draw(overlayCtx);

      const screenCenterX = camera.getViewportWidth() / 2;
      const topOffsetY = 64; // Y = 48 (box top) + 10px padding

      drawCRTText(overlayCtx, screenCenterX, topOffsetY, this.name, {
        font: '24px "Courier New", monospace',
        align: 'center',
        baseline: 'top',
        glow: true,
        chromaticAberration: true
      });

      drawCRTText(overlayCtx, screenCenterX, topOffsetY + 32, 'Open Communications: [C]', {
        font: '16px "Courier New", monospace',
        align: 'center',
        baseline: 'top',
        glow: true,
        chromaticAberration: true
      });
    }
  }
}
