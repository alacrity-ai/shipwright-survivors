// src/rendering/BackgroundRenderer.ts

import { CanvasManager } from '@/core/CanvasManager';
import { Camera } from '@/core/Camera';

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

  constructor(private canvasManager: CanvasManager, camera: Camera) {
    const { width, height } = canvasManager.getDimensions();
    this.width = width;
    this.height = height;
    this.ctx = canvasManager.getContext('background');
    this.camera = camera;

    this.layers.push(this.createLayer(20, '#444444', 0.1));
    this.layers.push(this.createLayer(40, '#666666', 0.3));
    this.layers.push(this.createLayer(70, '#aaaaaa', 0.75));
    this.layers.push(this.createLayer(100, '#ffffff', 1.5));
  }

  private createLayer(count: number, color: string, speedMultiplier: number): StarLayer {
    const stars: Star[] = [];

    // Layer coordinate system is "virtual" and very large
    const layerWidth = 5000;
    const layerHeight = 5000;

    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * layerWidth,
        y: Math.random() * layerHeight,
        radius: Math.random() * 1.5 + 0.5,
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
    // no longer needed to update stars manually
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const offset = this.camera.getOffset();

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
