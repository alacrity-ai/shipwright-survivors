// src/core/CanvasManager.ts

import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '@/config/view';

export type CanvasLayer = 'background' | 'entities' | 'fx' | 'particles' | 'ui' | 'overlay';

const LAYER_IDS: Record<CanvasLayer, string> = {
  background: 'background-canvas',
  entities: 'entity-canvas',
  fx: 'fx-canvas',
  particles: 'particles-canvas',
  ui: 'ui-canvas',
  overlay: 'overlay-canvas',
};

export class CanvasManager {
  private canvases: Record<CanvasLayer, HTMLCanvasElement> = {} as any;
  private contexts: Record<CanvasLayer, CanvasRenderingContext2D> = {} as any;
  private readonly width = VIEWPORT_WIDTH;
  private readonly height = VIEWPORT_HEIGHT;

  constructor() {
    this.initializeCanvases();
    this.setFixedSize();
  }

  private initializeCanvases() {
    for (const layer of Object.keys(LAYER_IDS) as CanvasLayer[]) {
      const id = LAYER_IDS[layer];
      const canvas = document.getElementById(id) as HTMLCanvasElement | null;

      if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        throw new Error(
          `CanvasManager error: element with ID "${id}" not found. Ensure canvases are in the DOM before sceneManager.setScene(...)`
        );
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error(`2D context not supported for "${id}"`);

      canvas.style.zIndex = this.getZIndexForLayer(layer).toString();
      canvas.style.pointerEvents = layer === 'ui' ? 'auto' : 'none';
      canvas.style.position = 'absolute';

      this.canvases[layer] = canvas;
      this.contexts[layer] = ctx;
    }
  }

  private setFixedSize() {
    for (const canvas of Object.values(this.canvases)) {
      canvas.width = this.width;
      canvas.height = this.height;
      canvas.style.width = `${this.width}px`;
      canvas.style.height = `${this.height}px`;
    }
  }

  private getZIndexForLayer(layer: CanvasLayer): number {
    switch (layer) {
      case 'background': return 0;
      case 'entities': return 1;
      case 'fx': return 2;
      case 'particles': return 3;
      case 'ui': return 4;
      case 'overlay': return 5;
    }
  }

  getCanvas(layer: CanvasLayer): HTMLCanvasElement {
    return this.canvases[layer];
  }

  getContext(layer: CanvasLayer): CanvasRenderingContext2D {
    return this.contexts[layer];
  }

  clearLayer(layer: CanvasLayer) {
    const ctx = this.getContext(layer);
    ctx.clearRect(0, 0, this.width, this.height);
  }

  clearAll() {
    for (const layer of Object.keys(this.contexts) as CanvasLayer[]) {
      this.clearLayer(layer);
    }
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}

