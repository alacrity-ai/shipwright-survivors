// src/systems/controls/PlayerControllerSystem.ts

import type { InputManager } from '@/core/InputManager';
import type { Camera } from '@/core/Camera';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';
import type { MovementIntent } from '@/core/intent/interfaces/MovementIntent';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { UtilityIntent } from '@/core/intent/interfaces/UtilityIntent';
import type { CursorRenderer } from '@/rendering/CursorRenderer';
import type { Ship } from '@/game/ship/Ship';

import { emitHudHideAll, emitHudShowAll } from '@/core/interfaces/events/HudReporter';
import { GlobalMenuReporter } from '@/core/GlobalMenuReporter';
import { ShipGrid } from '@/game/ship/ShipGrid';
import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { audioManager } from '@/audio/Audio';
import { FiringMode } from '@/systems/combat/types/WeaponTypes';

import {
  EMPTY_WEAPON_INTENT,
  EMPTY_UTILITY_INTENT
} from '@/core/intent/interfaces/EmptyIntents';

export class PlayerControllerSystem {
  private isEnginePlaying = false;
  private lastFiringModeSwitchTime: number = -Infinity;
  private hudHidden = false;

  constructor(
    private readonly camera: Camera,
    private readonly inputManager: InputManager,
    private readonly cursorRenderer: CursorRenderer,
    private readonly playerShip: Ship
  ) {}

  public getIntent(dt: number): ShipIntent {
    // Call update
    this.update();

    // Always allow movement, even when overlays/menus are open
    const movement = this.getMovementIntent(dt);

    // Guard utility and weapon intents
    const menuOpen = GlobalMenuReporter.getInstance().isAnyMenuOpen();
    const overlayHovered = GlobalMenuReporter.getInstance().isAnyOverlayHovered();
    const suppress = menuOpen || overlayHovered;

    const weapons = suppress ? EMPTY_WEAPON_INTENT : this.getWeaponIntent();
    const utility = suppress ? EMPTY_UTILITY_INTENT : this.getUtilityIntent();

    return { movement, weapons, utility };
  }

  private getMovementIntent(dt: number): MovementIntent {
    ShipGrid.getInstance().updateShipPosition(this.playerShip, dt);

    this.inputManager.setGamepadCursorOverrideEnabled(true);

    const shift = this.inputManager.isShiftPressed();
    const leftStick = this.inputManager.getGamepadMovementVector();
    const leftStickMag = Math.hypot(leftStick.x, leftStick.y);

    const tracker = InputDeviceTracker.getInstance();
    const usingGamepad =
      tracker.getLastUsed() === 'gamepad' ||
      leftStickMag > 0.1 ||
      this.inputManager.getGamepadAimVector().x !== 0 ||
      this.inputManager.getGamepadAimVector().y !== 0;

    if (usingGamepad) {
      tracker.updateDevice('gamepad');
    }

    const shouldTurnToStick = usingGamepad && !shift && leftStickMag > 0.1;

    const brake = this.inputManager.isActionPressed('brake');

    let thrustForward = false;
    if (!brake) {
      thrustForward = usingGamepad
        ? leftStickMag > 0.1
        : this.inputManager.isActionPressed('thrustForward');
    }

    const rawAfterburner = this.inputManager.isActionPressed('afterburner');
    const afterburner = thrustForward && rawAfterburner;

    return {
      thrustForward,
      brake,
      rotateLeft:
        this.inputManager.isActionPressed('rotateLeft') &&
        !(usingGamepad && shouldTurnToStick),
      rotateRight:
        this.inputManager.isActionPressed('rotateRight') &&
        !(usingGamepad && shouldTurnToStick),
      strafeLeft:
        this.inputManager.isActionPressed('strafeLeft') ||
        (shift && leftStickMag > 0.1),
      strafeRight:
        this.inputManager.isActionPressed('strafeRight') ||
        (shift && leftStickMag > 0.1),
      turnToAngle: shouldTurnToStick
        ? Math.atan2(leftStick.y, leftStick.x) + Math.PI / 2
        : undefined,
      afterburner,
    };
  }

  private getWeaponIntent(): WeaponIntent {
    const firePrimary = this.inputManager.isActionPressed('firePrimary');
    const fireSecondary = this.inputManager.isActionPressed('fireSecondary');

    const playerPos = this.playerShip.getTransform().position;
    const rawGamepadAim = this.inputManager.getGamepadAimVector();
    const AIM_DISTANCE = 800;

    const hasGamepadAim = rawGamepadAim.x !== 0 || rawGamepadAim.y !== 0;

    const aimVector = hasGamepadAim
      ? this.normalize(rawGamepadAim.x, rawGamepadAim.y)
      : InputDeviceTracker.getInstance().getLastUsed() === 'gamepad'
        ? {
            x: Math.cos(this.playerShip.getTransform().rotation - Math.PI / 2),
            y: Math.sin(this.playerShip.getTransform().rotation - Math.PI / 2),
          }
        : null;

    const aimAt = aimVector
      ? {
          x: playerPos.x + aimVector.x * AIM_DISTANCE,
          y: playerPos.y + aimVector.y * AIM_DISTANCE,
        }
      : this.camera.screenToWorld(
          this.inputManager.getMousePosition().x,
          this.inputManager.getMousePosition().y
        );

    // Cursor visuals
    if (firePrimary || fireSecondary || hasGamepadAim) {
      this.cursorRenderer.setTargetCrosshairCursor();
    } else {
      this.cursorRenderer.setDefaultCursor();
    }

    return {
      firePrimary,
      fireSecondary,
      aimAt,
      firingMode: this.playerShip.getFiringMode(),
    };
  }

  private getUtilityIntent(): UtilityIntent {
    const toggleShields = this.inputManager.wasActionJustPressed('fireTertiary');
    return { toggleShields };
  }

  private normalize(x: number, y: number): { x: number; y: number } {
    const mag = Math.hypot(x, y);
    return mag > 1e-5 ? { x: x / mag, y: y / mag } : { x: 0, y: 0 };
  }

  public update(): void {
    const now = performance.now();
    if (
      this.inputManager.wasActionJustPressed('switchFiringMode') &&
      now - this.lastFiringModeSwitchTime >= 1000
    ) {
      this.lastFiringModeSwitchTime = now;

      const currentMode = this.playerShip.getFiringMode();
      const newMode =
        currentMode === FiringMode.Synced ? FiringMode.Sequence : FiringMode.Synced;

      this.playerShip.setFiringMode(newMode);
      audioManager.play('assets/sounds/sfx/ship/attach_00.wav', 'sfx');

      const color = newMode === FiringMode.Synced ? '#00ffff' : '#ff0000';
      const pos = this.playerShip.getTransform().position;
      createLightFlash(pos.x, pos.y, 520, 1.2, 0.4, color);
    }

    if (this.inputManager.wasActionJustPressed('showHud')) {
      this.hudHidden = !this.hudHidden;
      this.hudHidden ? emitHudHideAll() : emitHudShowAll();
    }
  }

  public destroy(): void {
    // No-op for now
  }
}
