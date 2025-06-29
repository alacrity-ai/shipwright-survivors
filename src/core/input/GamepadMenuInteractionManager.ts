// src/core/input/GamepadMenuInteractionManager.ts

import type { InputManager } from '@/core/InputManager';
import type { NavPoint } from './interfaces/NavMap';
import { InputDeviceTracker } from './InputDeviceTracker';
import { hideGamepadCursor, showGamepadCursor } from '@/core/interfaces/events/CursorReporter';

export class GamepadMenuInteractionManager {
  private navMap: NavPoint[] = [];
  private cursorX = 0;
  private cursorY = 0;
  private latched = false;

  constructor(private input: InputManager) {}

  public setNavMap(navMap: NavPoint[]): void {
    this.navMap = navMap.filter(p => p.isEnabled);

    // Disable analog-stick virtual mouse movement
    this.input.setGamepadMousemockingEnabled(false);
    this.input.setGamepadCursorOverrideEnabled(false);

    if (this.navMap.length === 0) return;

    hideGamepadCursor();
    const first = this.navMap[0];
    this.cursorX = first.gridX;
    this.cursorY = first.gridY;
    this.snapToCursor();
  }

  public clearNavMap(): void {
    this.navMap = [];

    // Re-enable analog-stick virtual mouse
    this.input.setGamepadMousemockingEnabled(true);
    this.input.setGamepadCursorOverrideEnabled(true);
    showGamepadCursor();
  }

  public hasNavMap(): boolean {
    return this.navMap.length > 0;
  }

  public setCurrentGridPosition(x: number, y: number): void {
    this.cursorX = x;
    this.cursorY = y;
    this.snapToCursor();
  }

  /**
   * Handles directional navigation and selection based on gamepad input.
   * Should be called once per frame.
   */
  public update(): void {
    if (this.navMap.length === 0) return;

    const moveVec = this.input.getGamepadMovementVector();
    const dpadLeft = this.input.wasGamepadAliasJustPressed('dpadLeft');
    const dpadRight = this.input.wasGamepadAliasJustPressed('dpadRight');
    const dpadUp = this.input.wasGamepadAliasJustPressed('dpadUp');
    const dpadDown = this.input.wasGamepadAliasJustPressed('dpadDown');

    const moveLeft = moveVec.x < -0.6 || dpadLeft;
    const moveRight = moveVec.x > 0.6 || dpadRight;
    const moveUp = moveVec.y < -0.6 || dpadUp;
    const moveDown = moveVec.y > 0.6 || dpadDown;

    const moved = moveLeft || moveRight || moveUp || moveDown;

    if (moved && !this.latched) {
      const deltaX = (moveRight ? 1 : 0) + (moveLeft ? -1 : 0);
      const deltaY = (moveDown ? 1 : 0) + (moveUp ? -1 : 0);

      this.tryMoveCursor(deltaX, deltaY);
      this.snapToCursor();
      this.latched = true;
    }

    if (this.input.isGamepadNavigationNeutral()) {
      this.latched = false;
    }
  }

  /**
   * Attempts to move the logical nav cursor by delta, skipping disabled or missing positions.
   */
  private tryMoveCursor(dx: number, dy: number): void {
    const currentX = this.cursorX;
    const currentY = this.cursorY;

    if (dx !== 0 && dy === 0) {
      // === Horizontal movement
      const direction = dx > 0 ? 1 : -1;

      const rowCandidates = this.navMap
        .filter(p => p.gridY === currentY)
        .filter(p => direction > 0 ? p.gridX > currentX : p.gridX < currentX)
        .sort((a, b) => Math.abs(a.gridX - currentX) - Math.abs(b.gridX - currentX));

      if (rowCandidates.length > 0) {
        const best = rowCandidates[0];
        this.cursorX = best.gridX;
        this.cursorY = best.gridY;
        return;
      }

      // === Fallback: scan vertically (above for left, below for right)
      const fallbackDirection = direction > 0 ? 1 : -1;
      const maxOffset = 50;

      for (let offset = 1; offset < maxOffset; offset++) {
        const newY = currentY + fallbackDirection * offset;

        const verticalRow = this.navMap
          .filter(p => p.gridY === newY)
          .sort((a, b) => {
            return direction > 0
              ? a.gridX - b.gridX     // fallback for right: pick leftmost
              : b.gridX - a.gridX;    // fallback for left: pick rightmost
          });

        if (verticalRow.length > 0) {
          const best = verticalRow[0];
          this.cursorX = best.gridX;
          this.cursorY = best.gridY;
          return;
        }
      }

    } else if (dy !== 0 && dx === 0) {
      // === Vertical movement (as implemented earlier)
      const direction = dy > 0 ? 1 : -1;
      const maxOffset = 50;

      for (let offset = 1; offset < maxOffset; offset++) {
        const newY = currentY + direction * offset;

        const candidates = this.navMap
          .filter(p => p.gridY === newY)
          .sort((a, b) => Math.abs(a.gridX - currentX) - Math.abs(b.gridX - currentX));

        if (candidates.length > 0) {
          const best = candidates[0];
          this.cursorX = best.gridX;
          this.cursorY = best.gridY;
          return;
        }
      }
    }
  }

  /**
   * Finds the current cursor position in the nav map and moves the virtual mouse to its screen coords.
   */
  private snapToCursor(): void {
    const point = this.findNavPoint(this.cursorX, this.cursorY);
    if (point) {
      InputDeviceTracker.getInstance().updateDevice('gamepad');
      this.input.setVirtualMousePosition(point.screenX, point.screenY);
    } 
  }

  /**
   * Finds the nav point at a given logical grid position, if enabled.
   */
  private findNavPoint(x: number, y: number): NavPoint | undefined {
    return this.navMap.find(p => p.gridX === x && p.gridY === y && p.isEnabled);
  }
}
