// src/lighting/LightingOrchestrator.ts

import type { Camera } from '@/core/Camera';
import type {
  AnyLightInstance,
  PointLightInstance,
} from './lights/types';
import { LightingRenderer } from './LightingRenderer';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';

let nextLightId = 0;
let _instance: LightingOrchestrator | null = null;

/**
 * Central controller for active light instances.
 * Handles registration, lifecycle management, spatial culling, and render delegation.
 */
export class LightingOrchestrator {
  private lights = new Map<string, AnyLightInstance>();
  private readonly renderer: LightingRenderer;
  private readonly camera: Camera;

  private lightPool: PointLightInstance[] = [];

  constructor(renderer: LightingRenderer, camera: Camera) {
    this.renderer = renderer;
    this.camera = camera;
  }

  public static getInstance(renderer?: LightingRenderer, camera?: Camera): LightingOrchestrator {
    if (!_instance) {
      if (!renderer || !camera) {
        throw new Error('[LightingOrchestrator] Must supply renderer and camera on first call to getInstance().');
      }
      _instance = new LightingOrchestrator(renderer, camera);
    }
    return _instance;
  }

  public static hasInstance(): boolean {
    return !!_instance;
  }

  registerLight(light: AnyLightInstance): void {
    if (!light.id) light.id = `light_${nextLightId++}`;
    this.lights.set(light.id, light);
  }

  removeLight(id: string): void {
    const light = this.lights.get(id);
    if (light) this.recycleLight(light);
    this.lights.delete(id);
  }

  public resizeLighting(): void {
    this.renderer.resize();
  }

  clear(): void {
    for (const light of this.lights.values()) {
      this.recycleLight(light);
    }
    this.lights.clear();
  }

  update(dt: number): void {
    for (const [id, light] of this.lights) {
      if (light.life !== undefined && light.maxLife !== undefined) {
        light.life -= dt;
        if (light.expires && light.life <= 0) {
          this.recycleLight(light);
          this.lights.delete(id);
          continue;
        }

        const ratio = Math.max(0, light.life / light.maxLife);

        if (light.fadeMode === 'delayed') {
          const fadeThreshold = 0.10;
          light.animationPhase = ratio >= fadeThreshold
            ? 1.0
            : ratio / fadeThreshold;
        } else {
          light.animationPhase = ratio; // linear
        }
      }

      // Additional per-frame animation logic could go here
    }
  }

  render(): void {
    if (!PlayerSettingsManager.getInstance().isLightingEnabled()) return;

    const visibleLights = this.getVisibleLights();
    this.renderer.render(visibleLights, this.camera);
  }

  private getVisibleLights(): AnyLightInstance[] {
    const bounds = this.camera.getViewportBounds(); // { x, y, width, height }
    const left = bounds.x;
    const right = bounds.x + bounds.width;
    const top = bounds.y;
    const bottom = bounds.y + bounds.height;

    return Array.from(this.lights.values()).filter(light => {
      switch (light.type) {
        case 'directional':
          // Always included — global effect
          return true;

        case 'point':
        case 'spot':
          // Perform axis-aligned bounding circle test
          const { x, y, radius } = light;
          return (
            x + radius > left &&
            x - radius < right &&
            y + radius > top &&
            y - radius < bottom
          );

        default:
          return true; // Fail open
      }
    });
  }

  getLightCount(): number {
    return this.lights.size;
  }

  getActiveLights(): AnyLightInstance[] {
    return Array.from(this.lights.values());
  }

  getLightById(id: string): AnyLightInstance | undefined {
    return this.lights.get(id);
  }

  public getPooledLight(): PointLightInstance {
    const light = this.lightPool.pop() ?? {
      id: '',
      x: 0,
      y: 0,
      radius: 32,
      color: '#ffffff',
      intensity: 1,
      type: 'point',
    };
    return light;
  }

  private recycleLight(light: AnyLightInstance): void {
    if (this.isPoolableLight(light)) {
      light.id = '';
      light.life = undefined;
      light.maxLife = undefined;
      light.animationPhase = undefined;
      this.lightPool.push(light);
    }
  }

  private isPoolableLight(light: AnyLightInstance): light is PointLightInstance {
    return light.type === 'point';
  }

  public updateLight(
    id: string,
    updates: Partial<Omit<PointLightInstance, 'id' | 'type'>>
  ): void {
    const light = this.lights.get(id);
    if (!light || light.type !== 'point') return;

    Object.assign(light, updates);
  }

  /**
   * Sets the ambient light of the scene.
   * Example: this.lightingOrchestrator.setClearColor(0.1, 0.0, 0.2, 0.1);
   * Sets the ambient light to a dark violet.
   */
  public setClearColor(r: number, g: number, b: number, a: number): void {
    this.renderer.setClearColor(r, g, b, a);
  }

  public destroy(): void {
    if (_instance !== this) return;

    this.clear();
    this.lightPool.length = 0;
    this.renderer.destroy();

    _instance = null;
    nextLightId = 0;
  }
}
