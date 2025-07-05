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

import { GlobalEventBus } from '@/core/EventBus';
import { ShipGrid } from '@/game/ship/ShipGrid';
import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { audioManager } from '@/audio/Audio';
import { FiringMode } from '@/systems/combat/types/WeaponTypes';

export class PlayerControllerSystem {
  private isEnginePlaying = false;
  private lastFiringModeSwitchTime: number = -Infinity;
  private isOverlayInteracting = false;
  private hudHidden = false;

  private unlockingInteraction = false;

  constructor(
    private readonly camera: Camera,
    private readonly inputManager: InputManager,
    private readonly cursorRenderer: CursorRenderer,
    private readonly playerShip: Ship
  ) {
    GlobalEventBus.on('ui:overlay:interacting', this.onOverlayInteracting);
    GlobalEventBus.on('ui:overlay:not-interacting', this.onOverlayNotInteracting);
  }

  private onOverlayInteracting = () => {
    this.isOverlayInteracting = true;
  };

  private onOverlayNotInteracting = () => {
    // TODO : This is very jenky
    if (!this.unlockingInteraction) {
      this.unlockingInteraction = true;
      // Run this in 100ms
      setTimeout(() => {
        this.isOverlayInteracting = false;
        this.unlockingInteraction = false;
      }, 100);
    }
  };

  public getIntent(): ShipIntent {
    // Early exit if menus or overlays are interacting
    if (GlobalMenuReporter.getInstance().isAnyMenuOpen() || GlobalMenuReporter.getInstance().isAnyOverlayHovered()) return {
      movement: {
        thrustForward: false,
        brake: false,
        rotateLeft: false,
        rotateRight: false,
        strafeLeft: false,
        strafeRight: false,
        turnToAngle: undefined,
        afterburner: false,
      },
      weapons: {
        firePrimary: false,
        fireSecondary: false,
        aimAt: null,
        firingMode: this.playerShip.getFiringMode(),
      },
      utility: {
        toggleShields: false,
      },
    };

    // Update ship position in ship grid | TODO: Should go somewhere agnostic that is run every frame.
    ShipGrid.getInstance().updateShipPosition(this.playerShip);

    this.inputManager.setGamepadCursorOverrideEnabled(true);

    const shift = this.inputManager.isShiftPressed();
    const leftStick = this.inputManager.getGamepadMovementVector();
    const leftStickMag = Math.hypot(leftStick.x, leftStick.y);

    // Determine gamepad usage by direct inspection of stick state or last input
    const tracker = InputDeviceTracker.getInstance();
    const usingGamepad =
      tracker.getLastUsed() === 'gamepad' ||
      leftStickMag > 0.1 ||
      this.inputManager.getGamepadAimVector().x !== 0 ||
      this.inputManager.getGamepadAimVector().y !== 0;

    // Reinforce gamepad as active device
    if (usingGamepad) {
      tracker.updateDevice('gamepad');
    }

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

    const rawAfterburner = this.inputManager.isActionPressed('afterburner');
    const afterburner = thrustForward && rawAfterburner;

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
      afterburner,
    };

    // === Weapon controls ===
    const firePrimary = this.inputManager.isActionPressed('firePrimary') && !this.isOverlayInteracting;
    const fireSecondary = this.inputManager.isActionPressed('fireSecondary') && !this.isOverlayInteracting;

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

    // === Cursor logic ===
    const anyFire = firePrimary || fireSecondary;
    if (anyFire || hasGamepadAim) {
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

    this.onOverlayNotInteracting();

    // Hiding and showing hud
    if (this.inputManager.wasActionJustPressed('showHud')) {
      if (this.hudHidden) {
        emitHudShowAll();
        this.hudHidden = false;
      } else {
        emitHudHideAll();
        this.hudHidden = true;
      }
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

  public destroy(): void {
    GlobalEventBus.off('ui:overlay:interacting', this.onOverlayInteracting);
    GlobalEventBus.off('ui:overlay:not-interacting', this.onOverlayNotInteracting);
  }
}
