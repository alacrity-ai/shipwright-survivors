// src/lighting/LightingOrchestrator.ts

import type { Camera } from '@/core/Camera';
import type { AnyLightInstance, LightInstance } from './lights/types';
import { LightingRenderer } from './LightingRenderer';

/**
 * Central controller for all active light instances.
 * Handles lifecycle, update and render delegation.
 */
export class LightingOrchestrator {
  private lights = new Map<string, AnyLightInstance>();
  private readonly renderer: LightingRenderer;
  private readonly camera: Camera;

  constructor(renderer: LightingRenderer, camera: Camera) {
    this.renderer = renderer;
    this.camera = camera;
  }

  /**
   * Registers a new light. Replaces any light with the same ID.
   */
  registerLight(light: AnyLightInstance): void {
    this.lights.set(light.id, light);
  }

  /**
   * Removes a light instance by ID, if present.
   */
  removeLight(id: string): void {
    this.lights.delete(id);
  }

  /**
   * Clears all active lights.
   */
  clear(): void {
    this.lights.clear();
  }

  /**
   * Advance per-frame state of lights: decay, flicker, animation phase.
   */
  update(dt: number): void {
    const expired: string[] = [];

    for (const [id, light] of this.lights) {
      // Lifecycle decay
      if (light.life !== undefined && light.maxLife !== undefined) {
        light.life -= dt;
        if (light.expires && light.life <= 0) {
          expired.push(id);
          continue;
        }

        // Normalized animation phase for pulse/shrink/flicker
        light.animationPhase = Math.max(0, light.life / light.maxLife);
      }

      // Future: flicker effects or other per-light animation logic could go here
    }

    for (const id of expired) {
      this.lights.delete(id);
    }
  }

  /**
   * Renders all active lights using WebGL renderer.
   */
  render(): void {
    this.renderer.render([...this.lights.values()], this.camera);
  }

  /**
   * Returns the number of currently active lights.
   */
  getLightCount(): number {
    return this.lights.size;
  }

  /**
   * Returns a copy of the current lights array for external inspection.
   */
  getActiveLights(): AnyLightInstance[] {
    return [...this.lights.values()];
  }

  /**
   * Sets the ambient light of the scene.
   * Example: this.lightingOrchestrator.setClearColor(0.1, 0.0, 0.2, 0.1);
   * Sets the ambient light to a dark violet.
   */
  public setClearColor(r: number, g: number, b: number, a: number): void {
    this.renderer.setClearColor(r, g, b, a);
  }
}
