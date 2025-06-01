// src/rendering/CursorRenderer.ts

import { CanvasManager } from '@/core/CanvasManager';
import type { InputManager } from '@/core/InputManager';
import { 
  getCrosshairCursorSprite, 
  getHoveredCursorSprite, 
  getArrowCursorSprite, 
  getWrenchCursorSprite,
  getSmallCircleCursorSprite,
  getTargetCrosshairSprite,
 } from '@/rendering/cache/CursorSpriteCache';

export class CursorRenderer {
  private ctx: CanvasRenderingContext2D;
  private cursorSprite: HTMLCanvasElement | null

  constructor(
    canvasManager: CanvasManager,
    private readonly inputManager: InputManager
  ) {
    this.cursorSprite = getCrosshairCursorSprite();
    this.ctx = canvasManager.getContext('overlay');
    this.inputManager = inputManager;
  }

  render(): void {
    if (!this.cursorSprite) return;
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height); // If I don't comment this out, I can't see my other UI windows when they open

    // Always draw cursor
    const mouse = this.inputManager.getMousePosition();

    this.ctx.drawImage(
      this.cursorSprite,
      mouse.x - this.cursorSprite.width / 2,
      mouse.y - this.cursorSprite.height / 2
    );
  }

  // Public API
  setCursorSprite(sprite: HTMLCanvasElement) {
    this.cursorSprite = sprite;
  }

  setDefaultCursor() {
    this.setCursorSprite(getCrosshairCursorSprite());
  }

  setCrosshairCursor() {
    this.setCursorSprite(getCrosshairCursorSprite());
  }

  setTargetCrosshairCursor() {
    this.setCursorSprite(getTargetCrosshairSprite());
  }

  setHoveredCursor() {
    this.setCursorSprite(getHoveredCursorSprite());
  }

  setWrenchCursor() {
    this.setCursorSprite(getWrenchCursorSprite());
  }

  setArrowCursor(direction: 'up' | 'right' | 'down' | 'left') {
    this.setCursorSprite(getArrowCursorSprite(direction));
  }

  setUpCursor() {
    this.setArrowCursor('up');
  }

  setRightCursor() {
    this.setArrowCursor('right');
  }

  setDownCursor() {
    this.setArrowCursor('down');
  }

  setLeftCursor() {
    this.setArrowCursor('left');
  }

  setSmallCircleCursor() {
    this.setCursorSprite(getSmallCircleCursorSprite());
  }
}