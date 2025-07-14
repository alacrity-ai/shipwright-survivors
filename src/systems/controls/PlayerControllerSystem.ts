// // src/systems/controls/PlayerControllerSystem.ts

// import type { InputManager } from '@/core/InputManager';
// import type { Camera } from '@/core/Camera';
// import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';
// import type { MovementIntent } from '@/core/intent/interfaces/MovementIntent';
// import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
// import type { UtilityIntent } from '@/core/intent/interfaces/UtilityIntent';
// import type { CursorRenderer } from '@/rendering/CursorRenderer';
// import type { Ship } from '@/game/ship/Ship';

// import { getUniformScaleFactor } from '@/config/view';

// import { emitHudHideAll, emitHudShowAll } from '@/core/interfaces/events/HudReporter';
// import { GlobalMenuReporter } from '@/core/GlobalMenuReporter';
// import { ShipGrid } from '@/game/ship/ShipGrid';
// import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';
// import { createLightFlash } from '@/lighting/helpers/createLightFlash';
// import { audioManager } from '@/audio/Audio';
// import { FiringMode } from '@/systems/combat/types/WeaponTypes';

// import {
//   EMPTY_WEAPON_INTENT,
//   EMPTY_UTILITY_INTENT,
//   EMPTY_MOVEMENT_INTENT,
// } from '@/core/intent/interfaces/EmptyIntents';

// export class PlayerControllerSystem {
//   private isEnginePlaying = false;
//   private lastFiringModeSwitchTime: number = -Infinity;
//   private hudHidden = false;

//   private aimDistance: number = 200;

//   constructor(
//     private readonly camera: Camera,
//     private readonly inputManager: InputManager,
//     private readonly cursorRenderer: CursorRenderer,
//     private readonly playerShip: Ship
//   ) {
//     this.aimDistance = 200 * getUniformScaleFactor();
//   }

//   public getIntent(dt: number): ShipIntent {
//     // Call update
//     this.update();

//     // Always allow movement, even when overlays/menus are open
//     const movement = this.getMovementIntent(dt);

//     // Guard utility and weapon intents
//     const menuOpen = GlobalMenuReporter.getInstance().isAnyMenuOpen();
//     const overlayHovered = GlobalMenuReporter.getInstance().isAnyOverlayHovered();
//     const suppress = menuOpen || overlayHovered;

//     const weapons = suppress || !this.playerShip.getCanFire() ? EMPTY_WEAPON_INTENT : this.getWeaponIntent();
//     const utility = suppress ? EMPTY_UTILITY_INTENT : this.getUtilityIntent();

//     return { movement, weapons, utility };
//   }

//   private getMovementIntent(dt: number): MovementIntent {
//     // If Jumping (Fast Travel) return instantly
//     if (this.playerShip.isJumping()) return EMPTY_MOVEMENT_INTENT;

//     ShipGrid.getInstance().updateShipPosition(this.playerShip, dt);

//     this.inputManager.setGamepadCursorOverrideEnabled(true);

//     const shift = this.inputManager.isShiftPressed();
//     const leftStick = this.inputManager.getGamepadMovementVector();
//     const leftStickMag = Math.hypot(leftStick.x, leftStick.y);

//     const tracker = InputDeviceTracker.getInstance();
//     const usingGamepad =
//       tracker.getLastUsed() === 'gamepad' ||
//       leftStickMag > 0.1 ||
//       this.inputManager.getGamepadAimVector().x !== 0 ||
//       this.inputManager.getGamepadAimVector().y !== 0;

//     if (usingGamepad) {
//       tracker.updateDevice('gamepad');
//     }

//     const shouldTurnToStick = usingGamepad && !shift && leftStickMag > 0.1;

//     const brake = this.inputManager.isActionPressed('brake');

//     let thrustForward = false;
//     if (!brake) {
//       thrustForward = usingGamepad
//         ? leftStickMag > 0.1
//         : this.inputManager.isActionPressed('thrustForward');
//     }

//     const rawAfterburner = this.inputManager.isActionPressed('afterburner');
//     const afterburner = thrustForward && rawAfterburner;

//     return {
//       thrustForward,
//       brake,
//       rotateLeft:
//         this.inputManager.isActionPressed('rotateLeft') &&
//         !(usingGamepad && shouldTurnToStick),
//       rotateRight:
//         this.inputManager.isActionPressed('rotateRight') &&
//         !(usingGamepad && shouldTurnToStick),
//       strafeLeft:
//         this.inputManager.isActionPressed('strafeLeft') ||
//         (shift && leftStickMag > 0.1),
//       strafeRight:
//         this.inputManager.isActionPressed('strafeRight') ||
//         (shift && leftStickMag > 0.1),
//       turnToAngle: shouldTurnToStick
//         ? Math.atan2(leftStick.y, leftStick.x) + Math.PI / 2
//         : undefined,
//       afterburner,
//     };
//   }

//   private getWeaponIntent(): WeaponIntent {
//     // ─── Fast-path device determination ──────────────────────────────────────
//     const lastUsedDevice   = InputDeviceTracker.getInstance().getLastUsed();
//     const usingGamepad     = lastUsedDevice === 'gamepad';

//     // ─── Fire buttons ─────────────────────────────────────────────────────────
//     const firePrimary      = this.inputManager.isActionPressed('firePrimary');
//     const fireSecondary    = this.inputManager.isActionPressed('fireSecondary');

//     // ─── Positional primitives (pulled once) ──────────────────────────────────
//     const { position: playerPos, rotation: playerRot } = this.playerShip.getTransform();
//     const rawPadAim      = this.inputManager.getGamepadAimVector();
//     const padHasVector   = rawPadAim.x !== 0 || rawPadAim.y !== 0;

//     // ─── Aim vector derivation ────────────────────────────────────────────────
//     const aimVec = padHasVector
//       ? this.normalize(rawPadAim.x, rawPadAim.y)
//       : usingGamepad                              // idle–stick auto-forward
//           ? { x: Math.cos(playerRot - Math.PI / 2),
//               y: Math.sin(playerRot - Math.PI / 2) }
//           : null;                                 // mouse mode → null

//     // ─── World-space aim point ────────────────────────────────────────────────
//     const aimAt = aimVec
//       ? { x: playerPos.x + aimVec.x * this.aimDistance,
//           y: playerPos.y + aimVec.y * this.aimDistance }
//       : this.camera.screenToWorld(
//           this.inputManager.getMousePosition().x,
//           this.inputManager.getMousePosition().y);

//     // ─── Keep virtual cursor in lock-step *only* when pad is active ───────────
//     if (usingGamepad) {
//       const { x: sx, y: sy } = this.camera.worldToScreen(aimAt.x, aimAt.y);
//       this.inputManager.setVirtualMousePosition(sx, sy);
//     }

//     // ─── Cursor visuals ───────────────────────────────────────────────────────
//     if (firePrimary || fireSecondary || padHasVector) {
//       this.cursorRenderer.setTargetCrosshairCursor();
//     } else {
//       this.cursorRenderer.setDefaultCursor();
//     }

//     // ─── Compose intent object ────────────────────────────────────────────────
//     return {
//       firePrimary,
//       fireSecondary,
//       aimAt,
//       firingMode: this.playerShip.getFiringMode(),
//     };
//   }

//   private getUtilityIntent(): UtilityIntent {
//     const toggleShields = this.inputManager.wasActionJustPressed('fireTertiary');
//     return { toggleShields };
//   }

//   private normalize(x: number, y: number): { x: number; y: number } {
//     const mag = Math.hypot(x, y);
//     return mag > 1e-5 ? { x: x / mag, y: y / mag } : { x: 0, y: 0 };
//   }

//   public update(): void {
//     const now = performance.now();

//     // TODO : Put in cooldown for this, etc
//     if (this.inputManager.wasActionJustPressed('jumpHome')) {
//       this.playerShip.jumpHome();
//     }

//     if (
//       this.inputManager.wasActionJustPressed('switchFiringMode') &&
//       now - this.lastFiringModeSwitchTime >= 1000
//     ) {
//       this.lastFiringModeSwitchTime = now;

//       const currentMode = this.playerShip.getFiringMode();
//       const newMode =
//         currentMode === FiringMode.Synced ? FiringMode.Sequence : FiringMode.Synced;

//       this.playerShip.setFiringMode(newMode);
//       audioManager.play('assets/sounds/sfx/ship/attach_00.wav', 'sfx');

//       const color = newMode === FiringMode.Synced ? '#00ffff' : '#ff0000';
//       const pos = this.playerShip.getTransform().position;
//       createLightFlash(pos.x, pos.y, 520, 1.2, 0.4, color);
//     }

//     if (this.inputManager.wasActionJustPressed('showHud')) {
//       this.hudHidden = !this.hudHidden;
//       this.hudHidden ? emitHudHideAll() : emitHudShowAll();
//     }
//   }

//   public destroy(): void {
//     // No-op for now
//   }
// }

// ─────────────────────────────────────────────────────────────────────────────
//  PlayerControllerSystem.ts
//  • Centralised input→intent adapter for the player’s ship
//  • Features dynamic aiming-strategy selection:
//      – ‘manual’        → always ManualAimProvider
//      – ‘auto’ (default)→ PlayerAutoAimController, *unless* the right stick
//                          is deflected, in which case control is temporarily
//                          ceded to ManualAimProvider until the stick rests.
// ─────────────────────────────────────────────────────────────────────────────
/* eslint-disable max-lines */

import type { InputManager }   from '@/core/InputManager';
import type { Camera }         from '@/core/Camera';
import type { ShipIntent }     from '@/core/intent/interfaces/ShipIntent';
import type { MovementIntent } from '@/core/intent/interfaces/MovementIntent';
import type { WeaponIntent }   from '@/core/intent/interfaces/WeaponIntent';
import type { UtilityIntent }  from '@/core/intent/interfaces/UtilityIntent';
import type { CursorRenderer } from '@/rendering/CursorRenderer';
import type { Ship }           from '@/game/ship/Ship';

import { emitHudHideAll, emitHudShowAll } from '@/core/interfaces/events/HudReporter';
import { GlobalMenuReporter }   from '@/core/GlobalMenuReporter';
import { ShipGrid }             from '@/game/ship/ShipGrid';
import { InputDeviceTracker }   from '@/core/input/InputDeviceTracker';
import { createLightFlash }     from '@/lighting/helpers/createLightFlash';
import { audioManager }         from '@/audio/Audio';
import { FiringMode }           from '@/systems/combat/types/WeaponTypes';

import {
  EMPTY_MOVEMENT_INTENT,
  EMPTY_UTILITY_INTENT,
  EMPTY_WEAPON_INTENT,
} from '@/core/intent/interfaces/EmptyIntents';

import type { AimProvider }         from './aiming/AimProvider';
import { ManualAimProvider }        from './aiming/ManualAimProvider';
import { PlayerAutoAimController }  from './aiming/PlayerAutoAimController';
import { PlayerSettingsManager }    from '@/game/player/PlayerSettingsManager';

export class PlayerControllerSystem {
  /* ── internal state ────────────────────────────────────────────── */
  private lastFiringModeSwitchTime = -Infinity;
  private hudHidden                = false;

  /* ── providers ─────────────────────────────────────────────────── */
  private readonly manualProvider: ManualAimProvider;
  private readonly autoProvider:   PlayerAutoAimController;
  private aimProvider: AimProvider;                 // pointer to active one

  constructor(
    private readonly camera:  Camera,
    private readonly input:   InputManager,
    private readonly cursor:  CursorRenderer,
    private readonly playerShip: Ship,
  ) {
    this.manualProvider = new ManualAimProvider(camera, input, cursor);
    this.autoProvider   = new PlayerAutoAimController(input);

    // default: respect current setting, but fall back to manual for first-timers
    this.aimProvider = PlayerSettingsManager.getInstance().getAimMode() === 'auto'
      ? this.autoProvider
      : this.manualProvider;
  }

  /* ───────────────────────────────────────────────────────────────── */

  public getIntent(dt: number): ShipIntent {
    this.updateSideEffects();                                   // ancillary work

    /* movement is never suppressed */
    const movement = this.getMovementIntent(dt);

    /* overlay / menu suppression rules */
    const gm     = GlobalMenuReporter.getInstance();
    const suppress = gm.isAnyMenuOpen() // || gm.isAnyOverlayHovered()) && this.aimProvider === this.manualProvider;

    const weapons = suppress || !this.playerShip.getCanFire()
      ? EMPTY_WEAPON_INTENT
      : this.getWeaponIntent(dt);

    const utility = suppress
      ? EMPTY_UTILITY_INTENT
      : this.getUtilityIntent();

    return { movement, weapons, utility };
  }

  /* ───────────────────────── movement ───────────────────────────── */

  private getMovementIntent(dt: number): MovementIntent {
    if (this.playerShip.isJumping()) return EMPTY_MOVEMENT_INTENT;

    ShipGrid.getInstance().updateShipPosition(this.playerShip, dt);
    this.input.setGamepadCursorOverrideEnabled(true);

    const shift      = this.input.isShiftPressed();
    const left       = this.input.getGamepadMovementVector();
    const leftMag    = Math.hypot(left.x, left.y);
    const tracker    = InputDeviceTracker.getInstance();
    const usingPad   = tracker.getLastUsed() === 'gamepad'
                    || leftMag > 0.1
                    || this.input.getGamepadAimVector().x !== 0
                    || this.input.getGamepadAimVector().y !== 0;

    if (usingPad) tracker.updateDevice('gamepad');

    const shouldTurn = usingPad && !shift && leftMag > 0.1;
    const brake      = this.input.isActionPressed('brake');

    const thrustForward = !brake && (
      usingPad ? leftMag > 0.1 : this.input.isActionPressed('thrustForward')
    );

    const afterburner = thrustForward && this.input.isActionPressed('afterburner');

    return {
      thrustForward,
      brake,
      rotateLeft:  this.input.isActionPressed('rotateLeft')  && !(usingPad && shouldTurn),
      rotateRight: this.input.isActionPressed('rotateRight') && !(usingPad && shouldTurn),
      strafeLeft:  this.input.isActionPressed('strafeLeft')  || (shift && leftMag > 0.1),
      strafeRight: this.input.isActionPressed('strafeRight') || (shift && leftMag > 0.1),
      turnToAngle: shouldTurn ? Math.atan2(left.y, left.x) + Math.PI / 2 : undefined,
      afterburner,
    };
  }

  /* ─────────────────────── weapon / aiming ──────────────────────── */

  private getWeaponIntent(dt: number): WeaponIntent {
    const mode          = PlayerSettingsManager.getInstance().getAimMode(); // 'auto' | 'manual'
    const rightStick    = this.input.getGamepadAimVector();
    const stickActive   = rightStick.x !== 0 || rightStick.y !== 0;

    // NEW: treat firePrimary press as manual override condition
    const firePrimaryHeld = this.input.isActionPressed('firePrimary');

    const wantProvider =
          mode === 'manual'
            ? this.manualProvider
            : (stickActive || firePrimaryHeld)  // <-- Enhancement here
                ? this.manualProvider
                : this.autoProvider;

    if (this.aimProvider !== wantProvider) {
      this.aimProvider = wantProvider;
      if ('reset' in this.aimProvider && typeof this.aimProvider.reset === 'function') {
        this.aimProvider.reset();
      }
    }

    this.aimProvider.tick(dt, this.playerShip);
    const aimAt = this.aimProvider.getAimPoint(this.playerShip);

    const providerLocked = this.aimProvider.isLocked();
    const autoFire       = this.aimProvider === this.autoProvider && providerLocked;

    return {
      firePrimary:   autoFire || firePrimaryHeld,
      fireSecondary: this.input.isActionPressed('fireSecondary'),
      aimAt,
      firingMode:    this.playerShip.getFiringMode(),
    };
  }

  /* ───────────────────────── utility ─────────────────────────────── */

  private getUtilityIntent(): UtilityIntent {
    return { toggleShields: this.input.wasActionJustPressed('fireTertiary') };
  }

  /* ─────────────── per-frame non-intent side-effects ─────────────── */

  private updateSideEffects(): void {
    const now = performance.now();

    if (this.input.wasActionJustPressed('jumpHome')) {
      this.playerShip.jumpHome();
    }

    if (this.input.wasActionJustPressed('switchFiringMode')
        && now - this.lastFiringModeSwitchTime >= 1000) {
      this.lastFiringModeSwitchTime = now;

      const newMode = this.playerShip.getFiringMode() === FiringMode.Synced
        ? FiringMode.Sequence
        : FiringMode.Synced;

      this.playerShip.setFiringMode(newMode);
      audioManager.play('assets/sounds/sfx/ship/attach_00.wav', 'sfx');

      const colour = newMode === FiringMode.Synced ? '#00ffff' : '#ff0000';
      const pos    = this.playerShip.getTransform().position;
      createLightFlash(pos.x, pos.y, 520, 1.2, 0.4, colour);
    }

    if (this.input.wasActionJustPressed('showHud')) {
      this.hudHidden = !this.hudHidden;
      this.hudHidden ? emitHudHideAll() : emitHudShowAll();
    }
  }

  /* ───────────────────────────────────────────────────────────────── */

  public destroy(): void {
    /* currently stateless; placeholder for future teardown */
  }
}
