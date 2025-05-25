// src/rendering/UIRenderer.ts

import { CanvasManager } from '@/core/CanvasManager';
import { getMousePosition } from '@/core/Input';
import { getCursorSprite } from '@/rendering/cache/CursorSpriteCache';
import type { MenuManager } from '@/ui/MenuManager';

export class UIRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(
    canvasManager: CanvasManager,
    private readonly menuManager: MenuManager
  ) {
    this.ctx = canvasManager.getContext('ui');
  }

  render() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    // Render menu if open
    if (this.menuManager.isMenuOpen()) {
      this.menuManager.render(this.ctx);
    } 

    // Always draw cursor
    const mouse = getMousePosition();
    const cursor = getCursorSprite();

    this.ctx.drawImage(
      cursor,
      mouse.x - cursor.width / 2,
      mouse.y - cursor.height / 2
    );
  }
}