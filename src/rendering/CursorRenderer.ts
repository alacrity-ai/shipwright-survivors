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

import { GlobalEventBus } from '@/core/EventBus';
import type { CursorChangeType } from '@/core/interfaces/EventTypes';

const AIM_DISTANCE = 800;

export class CursorRenderer {
  private ctx: CanvasRenderingContext2D;
  private cursorSprite: HTMLCanvasElement | null;
  
  private playerShip: Ship | null = null;
  private camera: Camera | null = null;

  private cursorWorldPos = { x: 0, y: 0 };
  private hasInitializedCursor = false;

  private isHidden = false;
  private isHiddenFromGamepad = false;

  // Track listeners for removal
  private cursorChangeHandler = (payload: { type: CursorChangeType }) =>
    this.setCursorFromType(payload.type);
  private cursorRestoreHandler = () => this.setDefaultCursor();
  private hideHandler = () => this.hide();
  private showHandler = () => this.show();
  private hideFromGamepadHandler = () => this.hideFromGamepad();
  private showFromGamepadHandler = () => this.showFromGamepad();

  constructor(
    canvasManager: CanvasManager,
    private readonly inputManager: InputManager,
  ) {
    this.cursorSprite = getCrosshairCursorSprite();
    this.ctx = canvasManager.getContext('overlay');

    GlobalEventBus.on('cursor:change', this.cursorChangeHandler);
    GlobalEventBus.on('cursor:restore', this.cursorRestoreHandler);
    GlobalEventBus.on('cursor:hide', this.hideHandler);
    GlobalEventBus.on('cursor:show', this.showHandler);
    GlobalEventBus.on('cursor:gamepad:hide', this.hideFromGamepadHandler);
    GlobalEventBus.on('cursor:gamepad:show', this.showFromGamepadHandler);
  }

  setPlayerShip(ship: Ship): void {
    this.playerShip = ship;
    this.camera = Camera.getInstance();
  }

  render(): void {
    if (!this.cursorSprite || this.isHidden) return;

    const scale = getUniformScaleFactor();
    const lastUsed = InputDeviceTracker.getInstance().getLastUsed();

    const isWorldScene = !!this.playerShip;
    const isMenuScene = !isWorldScene;

    if (lastUsed === 'keyboard' || lastUsed === 'mouse') {
      const mouse = this.inputManager.getMousePosition();
      drawCursor(this.ctx, this.cursorSprite, mouse.x, mouse.y, scale);
      return;
    }

    if (lastUsed === 'gamepad') {
      if (isMenuScene) {
        const mouse = this.inputManager.getMousePosition(); // virtual mouse
        if (this.isHiddenFromGamepad) return;
        drawCursor(this.ctx, this.cursorSprite, mouse.x, mouse.y, scale);
        return;
      }

      if (!this.playerShip || !this.camera) return;

      const shouldOverrideCursor = this.inputManager.isGamepadCursorOverrideEnabled();
      if (!shouldOverrideCursor) {
        const mouse = this.inputManager.getMousePosition(); // virtual mouse
        if (this.isHiddenFromGamepad) return;
        drawCursor(this.ctx, this.cursorSprite, mouse.x, mouse.y, scale);
        return;
      }

      // proceed with aimVec hijack only if override is enabled
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
        const SMOOTHING = 0.25;
        this.cursorWorldPos.x += (targetWorldX - this.cursorWorldPos.x) * SMOOTHING;
        this.cursorWorldPos.y += (targetWorldY - this.cursorWorldPos.y) * SMOOTHING;
      }

      const screen = this.camera.worldToScreen(this.cursorWorldPos.x, this.cursorWorldPos.y);
      if (this.isHiddenFromGamepad) return;
      drawCursor(this.ctx, this.cursorSprite, screen.x, screen.y, scale);
    }
  }

  // === Cursor Switching ===
  private setCursorFromType(type: CursorChangeType): void {
    switch (type) {
      case 'crosshair': this.setCrosshairCursor(); break;
      case 'target': this.setTargetCrosshairCursor(); break;
      case 'hovered': this.setHoveredCursor(); break;
      case 'wrench': this.setWrenchCursor(); break;
      case 'up': this.setUpCursor(); break;
      case 'right': this.setRightCursor(); break;
      case 'down': this.setDownCursor(); break;
      case 'left': this.setLeftCursor(); break;
      case 'small-circle': this.setSmallCircleCursor(); break;
    }
  }

  // === Public API ===
  hide() {
    this.isHidden = true;
  }

  show() {
    this.isHidden = false;
  }

  hideFromGamepad() {
    this.isHiddenFromGamepad = true;
  }

  showFromGamepad() {
    this.isHiddenFromGamepad = false;
  }

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

  destroy(): void {
    GlobalEventBus.off('cursor:change', this.cursorChangeHandler);
    GlobalEventBus.off('cursor:restore', this.cursorRestoreHandler);
    GlobalEventBus.off('cursor:hide', this.hide);
    GlobalEventBus.off('cursor:show', this.show);
    GlobalEventBus.off('cursor:gamepad:hide', this.hideFromGamepad);
    GlobalEventBus.off('cursor:gamepad:show', this.showFromGamepad);
  }
}
