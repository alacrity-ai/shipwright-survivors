// src/rendering/CursorRenderer.ts

import { CanvasManager } from '@/core/CanvasManager';
import { getUniformScaleFactor } from '@/config/view';
import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';
import type { Ship } from '@/game/ship/Ship';
import { Camera } from '@/core/Camera';
import type { InputManager } from '@/core/InputManager';
import { 
  getCrosshairCursorSprite, 
  getHoveredCursorSprite, 
  getArrowCursorSprite, 
  getWrenchCursorSprite,
  getSmallCircleCursorSprite,
  getTargetCrosshairSprite,
  drawCursor
 } from '@/rendering/cache/CursorSpriteCache';

const AIM_DISTANCE = 800;

export class CursorRenderer {
  private ctx: CanvasRenderingContext2D;
  private cursorSprite: HTMLCanvasElement | null;
  private camera: Camera;

  private cursorWorldPos = { x: 0, y: 0 };
  private hasInitializedCursor = false;

  constructor(
    canvasManager: CanvasManager,
    private readonly inputManager: InputManager,
    private readonly playerShip?: Ship | null,
  ) {
    this.camera = Camera.getInstance();
    this.cursorSprite = getCrosshairCursorSprite();
    this.ctx = canvasManager.getContext('overlay');
  }

  render(): void {
    if (!this.cursorSprite) return;
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    const scale = getUniformScaleFactor();
    const lastUsed = InputDeviceTracker.getInstance().getLastUsed();

    if (lastUsed === 'keyboard' || lastUsed === 'mouse') {
      const mouse = this.inputManager.getMousePosition();
      drawCursor(this.ctx, this.cursorSprite, mouse.x, mouse.y, scale);
      return;
    }

    if (lastUsed === 'gamepad') {
      const inMenu = false; // stub

      if (inMenu || !this.playerShip) return;

      const aim = this.inputManager.getGamepadAimVector();
      const hasAim = aim.x !== 0 || aim.y !== 0;

      const shipTransform = this.playerShip.getTransform();
      const shipPos = shipTransform.position;

      const aimVec = hasAim
        ? aim
        : {
            x: Math.cos(shipTransform.rotation - Math.PI / 2),
            y: Math.sin(shipTransform.rotation - Math.PI / 2),
          };

      const targetWorldX = shipPos.x + aimVec.x * AIM_DISTANCE;
      const targetWorldY = shipPos.y + aimVec.y * AIM_DISTANCE;

      if (!this.hasInitializedCursor) {
        this.cursorWorldPos.x = targetWorldX;
        this.cursorWorldPos.y = targetWorldY;
        this.hasInitializedCursor = true;
      } else {
        const SMOOTHING = 0.25; // adjust for more/less inertia
        this.cursorWorldPos.x += (targetWorldX - this.cursorWorldPos.x) * SMOOTHING;
        this.cursorWorldPos.y += (targetWorldY - this.cursorWorldPos.y) * SMOOTHING;
      }

      const screen = this.camera.worldToScreen(this.cursorWorldPos.x, this.cursorWorldPos.y);
      drawCursor(this.ctx, this.cursorSprite, screen.x, screen.y, scale);
    }
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