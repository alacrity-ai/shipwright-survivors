// src/core/CanvasManager.ts

import { getViewportWidth, getViewportHeight } from '@/config/view';

export type CanvasLayer =
  | 'background'
  | 'entities'
  | 'polygon'
  | 'fx'
  | 'particles'
  | 'ui'
  | 'overlay'
  | 'dialogue'
  | 'unifiedgl2'
  | 'gl2fx';

const LAYER_IDS: Record<CanvasLayer, string> = {
  background: 'background-canvas',
  entities: 'entity-canvas',
  polygon: 'polygon-canvas',
  fx: 'fx-canvas',
  particles: 'particles-canvas',
  ui: 'ui-canvas',
  overlay: 'overlay-canvas',
  dialogue: 'dialogue-canvas',
  unifiedgl2: 'unifiedgl2-canvas',
  gl2fx: 'gl2fx-canvas'
};

export class CanvasManager {
  private static _instance: CanvasManager | null = null;

  private canvases: Record<CanvasLayer, HTMLCanvasElement> = {} as any;
  private contexts: Record<CanvasLayer, CanvasRenderingContext2D> = {} as any;

  private constructor() {
    performance.mark('canvasManager-init-start');
    this.initializeCanvases();
    this.setFixedSize();
    performance.mark('canvasManager-init-end');
    performance.measure('CanvasManager Initialization', 'canvasManager-init-start', 'canvasManager-init-end');
  }

  public static getInstance(): CanvasManager {
    if (!CanvasManager._instance) {
      CanvasManager._instance = new CanvasManager();
    }
    return CanvasManager._instance;
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

      // === 2D Context Initialization ===
      if (!['polygon', 'unifiedgl2', 'gl2fx'].includes(layer)) {
        const ctx = canvas.getContext('2d', { willReadFrequently: false });
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
    const width = getViewportWidth();
    const height = getViewportHeight();

    for (const [layer, canvas] of Object.entries(this.canvases) as [CanvasLayer, HTMLCanvasElement][]) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
  }

  private getZIndexForLayer(layer: CanvasLayer): number {
    switch (layer) {
      case 'background': return 1;
      case 'polygon': return 3;
      case 'entities': return 4;
      case 'unifiedgl2': return 6;
      case 'fx': return 7;
      case 'particles': return 8;
      case 'ui': return 9;
      case 'overlay': return 10;
      case 'dialogue': return 11;
      case 'gl2fx': return 12;
    }
  }

  public getCanvas(layer: CanvasLayer): HTMLCanvasElement {
    return this.canvases[layer];
  }

  public getContext(layer: CanvasLayer): CanvasRenderingContext2D {
    return this.contexts[layer];
  }

  public getWebGLContext(layer: CanvasLayer): WebGLRenderingContext {
    const canvas = this.getCanvas(layer);
    const gl = canvas.getContext('webgl');
    if (!gl) throw new Error(`WebGL context not supported for "${layer}"`);
    return gl;
  }

  public getWebGL2Context(layer: CanvasLayer): WebGL2RenderingContext {
    const canvas = this.getCanvas(layer);
    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error(`WebGL2 context not supported for layer "${layer}"`);
    return gl;
  }

  public clearLayer(layer: CanvasLayer): void {
    if (layer === 'unifiedgl2') {
      this.clearWebGL2Layer(layer);
    } else if (layer === 'polygon') {
      this.clearWebGLLayer(layer);
    } else if (layer === 'gl2fx') {
      this.clearWebGL2Layer(layer);
    } else {
      const ctx = this.getContext(layer);
      ctx.clearRect(0, 0, getViewportWidth(), getViewportHeight());
    }
  }

  public clearWebGLLayer(layer: CanvasLayer, color: [number, number, number, number] = [0, 0, 0, 0]): void {
    const canvas = this.getCanvas(layer);
    const gl = canvas.getContext('webgl');
    if (!gl) {
      throw new Error(`Cannot clear WebGL layer '${layer}': no WebGL context available`);
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(...color);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  public clearWebGL2Layer(layer: CanvasLayer, color: [number, number, number, number] = [0, 0, 0, 0]): void {
    const canvas = this.getCanvas(layer);
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      throw new Error(`Cannot clear WebGL2 layer '${layer}': no WebGL2 context available`);
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(...color);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  public clearAll() {
    for (const layer of Object.keys(this.contexts) as CanvasLayer[]) {
      this.clearLayer(layer);
    }
  }

  public getWidth(): number {
    return getViewportWidth();
  }

  public getHeight(): number {
    return getViewportHeight();
  }

  public getDimensions(): { width: number; height: number } {
    return {
      width: getViewportWidth(),
      height: getViewportHeight()
    };
  }

  public resize(): void {
    performance.mark('canvasManager-resize-start');
    const width = getViewportWidth();
    const height = getViewportHeight();

    for (const [layer, canvas] of Object.entries(this.canvases) as [CanvasLayer, HTMLCanvasElement][]) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    performance.mark('canvasManager-resize-end');
    performance.measure('CanvasManager Resize', 'canvasManager-resize-start', 'canvasManager-resize-end');
  }
}
