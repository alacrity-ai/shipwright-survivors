// src/rendering/BackgroundRenderer.ts

import { CanvasManager } from '@/core/CanvasManager';
import { Camera } from '@/core/Camera';
import { getAssetPath } from '@/shared/assetHelpers';

const BACKGROUND_IMAGE_ALPHA = 1; // 🔧 Set desired opacity (0.0–1.0)
const BACKGROUND_PARALLAX_SPEED = 0.1; // 🔧 How fast background moves with camera (0.0 = static, 1.0 = moves with world)
const BACKGROUND_TILE_SIZE = 2420; // 🔧 Size of each background tile in world units
const BACKGROUND_IMAGE_HORIZONTAL_OFFSET = 0; // 🔧 Horizontal offset for tiling

interface Star {
  x: number; // world-relative layer coords
  y: number;
  radius: number;
}

interface StarLayer {
  stars: Star[];
  color: string;
  speedMultiplier: number; // determines parallax intensity
  alpha: number;
}

export class BackgroundRenderer {
  private layers: StarLayer[] = [];
  private width: number;
  private height: number;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;

  private backgroundImage: HTMLImageElement | undefined;
  private backgroundLoaded: boolean = false;

  constructor(canvasManager: CanvasManager, camera: Camera, backgroundImageId: string | undefined) {
    const { width, height } = canvasManager.getDimensions();
    this.width = width;
    this.height = height;
    this.ctx = canvasManager.getContext('background');
    this.camera = camera;

    this.loadBackgroundImage(backgroundImageId);

    this.layers.push(this.createLayer(30, '#444444', 0.01));
    this.layers.push(this.createLayer(60, '#666666', 0.03));
    this.layers.push(this.createLayer(80, '#aaaaaa', 0.05));
    this.layers.push(this.createLayer(110, '#ffffff', 0.09));
  }

  private loadBackgroundImage(filename?: string) {
    if (!filename) {
      this.backgroundLoaded = false;
      this.backgroundImage = undefined;
      return;
    }

    const img = new Image();
    img.src = getAssetPath(`/assets/backgrounds/${filename}`);
    img.onload = () => {
      this.backgroundImage = img;
      this.backgroundLoaded = true;
    };
  }

  private createLayer(count: number, color: string, speedMultiplier: number): StarLayer {
    const stars: Star[] = [];
    const layerWidth = 5000;
    const layerHeight = 5000;

    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * layerWidth,
        y: Math.random() * layerHeight,
        radius: Math.random() * 4 + 1.5,
      });
    }

    return {
      stars,
      color,
      speedMultiplier,
      alpha: Math.min(Math.max(speedMultiplier, 0.1), 1.0),
    };
  }

  update() {
    // Stars are static in this parallax system
  }

  render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    const offset = this.camera.getOffset();

    // === Optional: Render tiled background image with parallax ===
    if (this.backgroundLoaded && this.backgroundImage) {
      const img = this.backgroundImage;
      this.ctx.globalAlpha = BACKGROUND_IMAGE_ALPHA;

      const parallaxOffsetX = offset.x * BACKGROUND_PARALLAX_SPEED;
      const parallaxOffsetY = offset.y * BACKGROUND_PARALLAX_SPEED;

      const tileScreenSize = BACKGROUND_TILE_SIZE;
      const tilesNeededX = Math.ceil(this.width / tileScreenSize) + 2;
      const tilesNeededY = Math.ceil(this.height / tileScreenSize) + 2;

      const startTileX = Math.floor(parallaxOffsetX / BACKGROUND_TILE_SIZE) - 1;
      const startTileY = Math.floor(parallaxOffsetY / BACKGROUND_TILE_SIZE) - 1;

      const startScreenX = startTileX * BACKGROUND_TILE_SIZE - parallaxOffsetX + BACKGROUND_IMAGE_HORIZONTAL_OFFSET;
      const startScreenY = startTileY * BACKGROUND_TILE_SIZE - parallaxOffsetY;

      const bleed = 1; // pixels of overlap to hide seams

      for (let tileY = 0; tileY < tilesNeededY; tileY++) {
        for (let tileX = 0; tileX < tilesNeededX; tileX++) {
          const screenX = startScreenX + tileX * tileScreenSize;
          const screenY = startScreenY + tileY * tileScreenSize;

          if (
            screenX + tileScreenSize >= 0 && screenX <= this.width &&
            screenY + tileScreenSize >= 0 && screenY <= this.height
          ) {
            this.ctx.drawImage(
              img,
              bleed, bleed,               // Source x, y (crop slightly in)
              img.width - 2 * bleed,      // Source width
              img.height - 2 * bleed,     // Source height
              screenX - bleed,            // Destination x (draw slightly earlier)
              screenY - bleed,            // Destination y
              tileScreenSize + 2 * bleed, // Destination width
              tileScreenSize + 2 * bleed  // Destination height
            );
          }
        }
      }

      this.ctx.globalAlpha = 1.0;
    }

    // === Render star parallax layers ===
    for (const layer of this.layers) {
      this.ctx.fillStyle = layer.color;
      this.ctx.globalAlpha = layer.alpha;

      for (const star of layer.stars) {
        const parallaxX = offset.x * layer.speedMultiplier;
        const parallaxY = offset.y * layer.speedMultiplier;

        const sx = (star.x - parallaxX) % this.width;
        const sy = (star.y - parallaxY) % this.height;

        const drawX = sx < 0 ? sx + this.width : sx;
        const drawY = sy < 0 ? sy + this.height : sy;

        const screenRadius = star.radius * this.camera.getZoom();

        this.ctx.beginPath();
        this.ctx.arc(drawX, drawY, screenRadius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    this.ctx.globalAlpha = 1.0;
  }
}