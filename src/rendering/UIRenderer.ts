// src/rendering/UIRenderer.ts

import { CanvasManager } from '@/core/CanvasManager';
import type { InputManager } from '@/core/InputManager';
import { getCursorSprite } from '@/rendering/cache/CursorSpriteCache';
import type { MenuManager } from '@/ui/MenuManager';

export class UIRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(
    canvasManager: CanvasManager,
    private readonly menuManager: MenuManager,
    private readonly inputManager: InputManager
  ) {
    this.ctx = canvasManager.getContext('ui');
    this.inputManager = inputManager;
  }

  render() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    // Render menu if open
    if (this.menuManager.isMenuOpen()) {
      this.menuManager.render(this.ctx);
    } 

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