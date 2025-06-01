// src/rendering/CursorRenderer.ts

import { CanvasManager } from '@/core/CanvasManager';
import type { InputManager } from '@/core/InputManager';
import { getCursorSprite } from '@/rendering/cache/CursorSpriteCache';

export class CursorRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(
    canvasManager: CanvasManager,
    private readonly inputManager: InputManager
  ) {
    this.ctx = canvasManager.getContext('overlay');
    this.inputManager = inputManager;
  }

  render(): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height); // If I don't comment this out, I can't see my other UI windows when they open

    // Always draw cursor
    const mouse = this.inputManager.getMousePosition();
    const cursor = getCursorSprite();

    this.ctx.drawImage(
      cursor,
      mouse.x - cursor.width / 2,
      mouse.y - cursor.height / 2
    );
  }
}