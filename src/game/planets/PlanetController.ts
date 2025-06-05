// src/game/planets/PlanetController.ts

import { PlanetRenderer } from './PlanetRenderer';
import type { PlanetDefinition } from './interfaces/PlanetDefinition';
import type { Ship } from '@/game/ship/Ship';
import type { InputManager } from '@/core/InputManager';
import type { Camera } from '@/core/Camera';

export class PlanetController {
  private readonly renderer: PlanetRenderer;

  constructor(
    private readonly x: number,
    private readonly y: number,
    private readonly playerShip: Ship,
    private readonly inputManager: InputManager,
    private readonly camera: Camera,
    private readonly definition: PlanetDefinition
  ) {
    this.renderer = new PlanetRenderer(definition.imagePath, definition.scale, definition.name);
  }

  update(dt: number): void {
    // Placeholder for proximity interaction and logic
  }

  render(ctx: CanvasRenderingContext2D): void {
    const dx = this.x - this.playerShip.getTransform().position.x;
    const dy = this.y - this.playerShip.getTransform().position.y;
    const distanceSq = dx * dx + dy * dy;
    const VISIBLE_RADIUS = 10000;

    if (distanceSq <= VISIBLE_RADIUS * VISIBLE_RADIUS) {
      this.renderer.render(ctx, this.x, this.y, this.camera);
    }
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
