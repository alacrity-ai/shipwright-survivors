// src/systems/controls/aiming/ManualAimProvider.ts
import type { Camera } from '@/core/Camera';
import type { InputManager } from '@/core/InputManager';
import type { CursorRenderer } from '@/rendering/CursorRenderer';
import type { AimProvider } from './AimProvider';
import type { Ship } from '@/game/ship/Ship';
import { getUniformScaleFactor } from '@/config/view';
import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';

export class ManualAimProvider implements AimProvider {
  private readonly aimDistance = 200 * getUniformScaleFactor();

  constructor(
    private readonly camera: Camera,
    private readonly input: InputManager,
    private readonly cursor: CursorRenderer,
  ) {}

  public tick(): void {/* stateless – nothing to do */}

  public isLocked(): boolean { return false; }

  public getAimPoint(ship: Ship) {
    // ——— original manual-aim maths, unmodified ———
    const lastUsed = InputDeviceTracker.getInstance().getLastUsed() === 'gamepad';
    const { position: pos, rotation: rot } = ship.getTransform();
    const padVec   = this.input.getGamepadAimVector();
    const padMoved = padVec.x !== 0 || padVec.y !== 0;

    const aimVec = padMoved
      ? this.normalize(padVec.x, padVec.y)
      : lastUsed
        ? { x:  Math.cos(rot - Math.PI / 2),
            y:  Math.sin(rot - Math.PI / 2) }
        : null;

    const aim = aimVec
      ? { x: pos.x + aimVec.x * this.aimDistance,
          y: pos.y + aimVec.y * this.aimDistance }
      : this.camera.screenToWorld(
          this.input.getMousePosition().x,
          this.input.getMousePosition().y);

    // cursor presentation (unchanged)
    if (padMoved || this.input.isActionPressed('firePrimary') ||
        this.input.isActionPressed('fireSecondary')) {
      this.cursor.setTargetCrosshairCursor();
    } else {
      this.cursor.setDefaultCursor();
    }

    if (lastUsed) {
      const scr = this.camera.worldToScreen(aim.x, aim.y);
      this.input.setVirtualMousePosition(scr.x, scr.y);
    }
    return aim;
  }

  private normalize(x: number, y: number) {
    const m = Math.hypot(x, y);
    return m > 1e-5 ? { x: x / m, y: y / m } : { x: 0, y: 0 };
  }
}
