// import { CanvasManager } from '@/core/CanvasManager';
// import { Camera } from '@/core/Camera';
// import { getAssetPath } from '@/shared/assetHelpers';

// const BACKGROUND_IMAGE_ALPHA = 1; // Opacity (0–1)
// const BACKGROUND_PARALLAX_SPEED = 0.1;
// const BACKGROUND_TILE_SIZE = 2420;
// const BACKGROUND_IMAGE_HORIZONTAL_OFFSET = 0;

// export class BackgroundRenderer {
//   private ctx: CanvasRenderingContext2D;
//   private camera: Camera;
//   private backgroundImageId?: string;
//   private backgroundImage: HTMLImageElement | undefined;

//   constructor(canvasManager: CanvasManager, camera: Camera, backgroundImageId?: string) {
//     this.ctx = canvasManager.getContext('background');
//     this.camera = camera;
//     this.backgroundImageId = backgroundImageId;
//   }

//   public async load(): Promise<void> {
//     if (!this.backgroundImageId) return;
//     this.backgroundImage = await this.loadImageAsync(this.backgroundImageId);
//   }

//   private loadImageAsync(id: string): Promise<HTMLImageElement> {
//     return new Promise((resolve, reject) => {
//       const img = new Image();
//       img.src = getAssetPath(`/assets/backgrounds/${id}`);
//       img.onload = () => resolve(img);
//       img.onerror = reject;
//     });
//   }

//   update(): void {
//     // No-op (retained for interface compatibility)
//   }

//   render(): void {
//     const { width, height } = this.ctx.canvas;
//     this.ctx.clearRect(0, 0, width, height);
//     const offset = this.camera.getOffset();

//     // === Tiled image background ===
//     if (this.backgroundImage) {
//       const img = this.backgroundImage;
//       this.ctx.globalAlpha = BACKGROUND_IMAGE_ALPHA;

//       const parallaxOffsetX = offset.x * BACKGROUND_PARALLAX_SPEED;
//       const parallaxOffsetY = offset.y * BACKGROUND_PARALLAX_SPEED;

//       const tileScreenSize = BACKGROUND_TILE_SIZE;
//       const tilesNeededX = Math.ceil(width / tileScreenSize) + 2;
//       const tilesNeededY = Math.ceil(height / tileScreenSize) + 2;

//       const startTileX = Math.floor(parallaxOffsetX / tileScreenSize) - 1;
//       const startTileY = Math.floor(parallaxOffsetY / tileScreenSize) - 1;

//       const startScreenX = startTileX * tileScreenSize - parallaxOffsetX + BACKGROUND_IMAGE_HORIZONTAL_OFFSET;
//       const startScreenY = startTileY * tileScreenSize - parallaxOffsetY;

//       const bleed = 0.3;

//       for (let tileY = 0; tileY < tilesNeededY; tileY++) {
//         for (let tileX = 0; tileX < tilesNeededX; tileX++) {
//           const screenX = startScreenX + tileX * tileScreenSize;
//           const screenY = startScreenY + tileY * tileScreenSize;

//           if (
//             screenX + tileScreenSize >= 0 && screenX <= width &&
//             screenY + tileScreenSize >= 0 && screenY <= height
//           ) {
//             this.ctx.drawImage(
//               img,
//               bleed, bleed,
//               img.width - 2 * bleed,
//               img.height - 2 * bleed,
//               screenX - bleed,
//               screenY - bleed,
//               tileScreenSize + 2 * bleed,
//               tileScreenSize + 2 * bleed
//             );
//           }
//         }
//       }

//       this.ctx.globalAlpha = 1.0;
//     }
//   }
// }
