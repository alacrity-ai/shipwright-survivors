// src/systems/controls/PlayerControllerSystem.ts

import type { InputManager } from '@/core/InputManager';
import type { Camera } from '@/core/Camera';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';
import type { MovementIntent } from '@/core/intent/interfaces/MovementIntent';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { UtilityIntent } from '@/core/intent/interfaces/UtilityIntent';
import type { CursorRenderer } from '@/rendering/CursorRenderer';
import type { Ship } from '@/game/ship/Ship';

import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { audioManager } from '@/audio/Audio';
import { FiringMode } from '@/systems/combat/types/WeaponTypes';

export class PlayerControllerSystem {
  private isEnginePlaying = false;
  private lastFiringModeSwitchTime: number = -Infinity;

  constructor(
    private readonly camera: Camera,
    private readonly inputManager: InputManager,
    private readonly cursorRenderer: CursorRenderer,
    private readonly playerShip: Ship
  ) {}

  public getIntent(): ShipIntent {
    const shift = this.inputManager.isShiftPressed();
    const leftStick = this.inputManager.getGamepadMovementVector();
    const leftStickMag = Math.hypot(leftStick.x, leftStick.y);

    const usingGamepad = InputDeviceTracker.getInstance().getLastUsed() === 'gamepad';
    const shouldTurnToStick = usingGamepad && !shift && leftStickMag > 0.1;

    const brake = this.inputManager.isActionPressed('brake');

    let thrustForward = false;
    if (!brake) {
      if (usingGamepad) {
        thrustForward = leftStickMag > 0.1;
      } else {
        thrustForward = this.inputManager.isActionPressed('thrustForward');
      }
    }

    const movementIntent: MovementIntent = {
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
      afterburner: this.inputManager.isActionPressed('afterburner'),
    };

    // === Weapon controls ===
    const firePrimary = this.inputManager.isActionPressed('firePrimary');
    const fireSecondary = this.inputManager.isActionPressed('fireSecondary');

    const playerPos = this.playerShip.getTransform().position;
    const rawGamepadAim = this.inputManager.getGamepadAimVector();
    const AIM_DISTANCE = 800;

    const hasGamepadAim = rawGamepadAim.x !== 0 || rawGamepadAim.y !== 0;

    const aimVector = hasGamepadAim
      ? this.normalize(rawGamepadAim.x, rawGamepadAim.y)
      : usingGamepad
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

    const weaponIntent: WeaponIntent = {
      firePrimary,
      fireSecondary,
      aimAt,
      firingMode: this.playerShip.getFiringMode(),
    };

    if (firePrimary || fireSecondary) {
      this.cursorRenderer.setTargetCrosshairCursor();
    } else {
      this.cursorRenderer.setDefaultCursor();
    }

    // === Utility Controls ===
    const toggleShields = this.inputManager.wasActionJustPressed('fireTertiary');

    const utilityIntent: UtilityIntent = {
      toggleShields,
    };

    // === Non-intent system actions ===
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

      const lightColor = newMode === FiringMode.Synced ? '#00ffff' : '#ff0000';
      createLightFlash(playerPos.x, playerPos.y, 520, 1.2, 0.4, lightColor);
    }

    return {
      movement: movementIntent,
      weapons: weaponIntent,
      utility: utilityIntent,
    };
  }

  private normalize(x: number, y: number): { x: number; y: number } {
    const mag = Math.hypot(x, y);
    return mag > 1e-5 ? { x: x / mag, y: y / mag } : { x: 0, y: 0 };
  }
}
