// src/core/CanvasManager.ts

import { getViewportWidth, getViewportHeight } from '@/config/view';

export type CanvasLayer = 'background' | 'entities' | 'fx' | 'particles' | 'lighting' | 'ui' | 'overlay' | 'dialogue';

const LAYER_IDS: Record<CanvasLayer, string> = {
  background: 'background-canvas',
  entities: 'entity-canvas',
  fx: 'fx-canvas',
  particles: 'particles-canvas',
  lighting: 'lighting-canvas',
  ui: 'ui-canvas',
  overlay: 'overlay-canvas',
  dialogue: 'dialogue-canvas'
};

export class CanvasManager {
  private canvases: Record<CanvasLayer, HTMLCanvasElement> = {} as any;
  private contexts: Record<CanvasLayer, CanvasRenderingContext2D> = {} as any;

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

      if (layer !== 'lighting') {
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error(`2D context not supported for "${id}"`);
        this.contexts[layer] = ctx;
      }

      canvas.style.zIndex = this.getZIndexForLayer(layer).toString();
      canvas.style.pointerEvents = layer === 'ui' ? 'auto' : 'none';
      canvas.style.position = 'absolute';

      this.canvases[layer] = canvas;
    }
  }

  private setFixedSize() {
    for (const canvas of Object.values(this.canvases)) {
      canvas.width = getViewportWidth();
      canvas.height = getViewportHeight();
      canvas.style.width = `${getViewportWidth()}px`;
      canvas.style.height = `${getViewportHeight()}px`;
    }
  }

  private getZIndexForLayer(layer: CanvasLayer): number {
    switch (layer) {
      case 'background': return 0;
      case 'entities': return 1;
      case 'lighting': return 2;
      case 'fx': return 3;
      case 'particles': return 4;
      case 'ui': return 5;
      case 'overlay': return 6;
      case 'dialogue': return 7;
    }
  }

  getCanvas(layer: CanvasLayer): HTMLCanvasElement {
    return this.canvases[layer];
  }

  getContext(layer: CanvasLayer): CanvasRenderingContext2D {
    return this.contexts[layer];
  }

  getWebGLContext(layer: CanvasLayer): WebGLRenderingContext {
    const canvas = this.getCanvas(layer);
    const gl = canvas.getContext('webgl');
    if (!gl) throw new Error(`WebGL context not supported for "${layer}"`);
    return gl;
  }

  clearLayer(layer: CanvasLayer): void {
    if (layer === 'lighting') {
      this.clearWebGLLayer(layer);
    } else {
      const ctx = this.getContext(layer);
      ctx.clearRect(0, 0, getViewportWidth(), getViewportHeight());
    }
  }

  clearWebGLLayer(layer: CanvasLayer, color: [number, number, number, number] = [0, 0, 0, 1]): void {
    const canvas = this.getCanvas(layer);
    const gl = canvas.getContext('webgl');
    if (!gl) {
      throw new Error(`Cannot clear WebGL layer '${layer}': no WebGL context available`);
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(...color); // default: opaque black
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  clearAll() {
    for (const layer of Object.keys(this.contexts) as CanvasLayer[]) {
      this.clearLayer(layer);
    }
  }

  getWidth(): number {
    return getViewportWidth();
  }

  getHeight(): number {
    return getViewportHeight();
  }

  getDimensions(): { width: number; height: number } {
    return { width: getViewportWidth(), height: getViewportHeight() };
  }

  public resize(): void {
    const width = getViewportWidth();
    const height = getViewportHeight();

    for (const canvas of Object.values(this.canvases)) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
  }
}

