// src/core/input/GamePadManager.ts

import type { GamepadButtonAlias } from './interfaces/GamePadButtonAlias';
import type { StickVector } from './interfaces/StickVector';

import { InputDeviceTracker } from './InputDeviceTracker';

const DEADZONE = 0.2;

export class GamePadManager {
  private connected = false;

  private prevButtons = new Set<string>();
  private currentButtons = new Set<string>();
  private justPressed = new Set<string>();
  private justReleased = new Set<string>();

  private leftStick: StickVector = { x: 0, y: 0 };
  private rightStick: StickVector = { x: 0, y: 0 };

  // === Public ===
  public updateFrame(): void {
    this.justPressed.clear();
    this.justReleased.clear();

    const gamepad = this.getPrimaryGamepad();
    if (!gamepad) {
      this.connected = false;
      this.currentButtons.clear();
      return;
    }

    this.connected = true;

    const prevLeft = { ...this.leftStick };
    const prevRight = { ...this.rightStick };
    const prevPressedCount = this.currentButtons.size;

    this.pollButtons(gamepad);
    this.pollSticks(gamepad);

    const buttonsChanged =
      this.justPressed.size > 0 || this.justReleased.size > 0;

    const leftStickMoved =
      Math.abs(prevLeft.x - this.leftStick.x) > 0.05 ||
      Math.abs(prevLeft.y - this.leftStick.y) > 0.05;

    const rightStickMoved =
      Math.abs(prevRight.x - this.rightStick.x) > 0.05 ||
      Math.abs(prevRight.y - this.rightStick.y) > 0.05;

    const anyActivity = buttonsChanged || leftStickMoved || rightStickMoved;

    if (anyActivity) {
      InputDeviceTracker.getInstance().updateDevice('gamepad');
    }
  }

  public isActionPressed(alias: GamepadButtonAlias): boolean {
    return this.currentButtons.has(alias);
  }

  public wasActionJustPressed(alias: GamepadButtonAlias): boolean {
    return this.justPressed.has(alias);
  }

  public wasActionJustReleased(alias: GamepadButtonAlias): boolean {
    return this.justReleased.has(alias);
  }

  public getLeftStick(): StickVector {
    return this.leftStick;
  }

  public getRightStick(): StickVector {
    return this.rightStick;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  // === Internals ===

  private getPrimaryGamepad(): Gamepad | null {
    const pads = navigator.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (pad && pad.connected && pad.mapping === 'standard') {
        return pad;
      }
    }
    return null;
  }

  private pollButtons(pad: Gamepad): void {
    const newlyPressed = new Set<string>();
    const previous = this.prevButtons;

    for (let i = 0; i < pad.buttons.length; i++) {
      const b = pad.buttons[i];
      if (b.pressed) {
        const alias = this.mapButtonIndexToAlias(i);
        if (alias) newlyPressed.add(alias);
      }
    }

    for (const b of newlyPressed) {
      if (!previous.has(b)) this.justPressed.add(b);
    }

    for (const b of previous) {
      if (!newlyPressed.has(b)) this.justReleased.add(b);
    }

    this.prevButtons = new Set(newlyPressed);
    this.currentButtons = newlyPressed;
  }

  // Right stick is always a normalized direction vector post-deadzone.
  // This ensures consistent aiming distance regardless of pressure.
  private pollSticks(pad: Gamepad): void {
    // === Left Stick ===
    const rawLX = pad.axes[0] ?? 0;
    const rawLY = pad.axes[1] ?? 0;
    const leftMag = Math.hypot(rawLX, rawLY);

    if (leftMag < DEADZONE) {
      this.leftStick = { x: 0, y: 0 };
    } else {
      const normX = rawLX / leftMag;
      const normY = rawLY / leftMag;
      this.leftStick = { x: normX, y: normY };
    }

    // === Right Stick ===
    const rawRX = pad.axes[2] ?? 0;
    const rawRY = pad.axes[3] ?? 0;
    const rightMag = Math.hypot(rawRX, rawRY);

    if (rightMag < DEADZONE) {
      this.rightStick = { x: 0, y: 0 };
    } else {
      const normX = rawRX / rightMag;
      const normY = rawRY / rightMag;
      this.rightStick = { x: normX, y: normY };
    }
  }

  private applyDeadzone(v: number): number {
    return Math.abs(v) < DEADZONE ? 0 : v;
  }

  public isVerticalNavigationNeutral(): boolean {
    const aimY = this.getLeftStick().y;

    // Analog stick within deadzone, and no D-pad up/down alias was just pressed this frame
    const stickNeutral = aimY > -0.3 && aimY < 0.3;
    const dpadNeutral =
      !this.wasActionJustPressed('dpadUp') && !this.wasActionJustPressed('dpadDown');

    return stickNeutral && dpadNeutral;
  }

  public isHorizontalNavigationNeutral(): boolean {
    const aimX = this.getLeftStick().x;

    // Analog stick within deadzone, and no D-pad left/right alias was just pressed this frame
    const stickNeutral = aimX > -0.3 && aimX < 0.3;
    const dpadNeutral =
      !this.wasActionJustPressed('dpadLeft') && !this.wasActionJustPressed('dpadRight');

    return stickNeutral && dpadNeutral;
  }

  public isNavigationNeutral(): boolean {
    return this.isVerticalNavigationNeutral() && this.isHorizontalNavigationNeutral();
  }

  private mapButtonIndexToAlias(index: number): GamepadButtonAlias | null {
    // Standard gamepad mapping (Xbox 360/One layout)
    switch (index) {
      case 0: return 'A';     // A button
      case 1: return 'B';   // B button  
      case 2: return 'X';      // X button
      case 3: return 'Y';       // Y button
      case 4: return 'leftBumper';  // LB
      case 5: return 'rightBumper'; // RB
      case 6: return 'leftTrigger'; // LT (if digital)
      case 7: return 'rightTrigger';        // RT (right trigger)
      case 8: return 'start';      // Back/View button
      case 9: return 'select';       // Start/Menu button
      case 10: return 'leftStickButton';  // Left stick click (L3)
      case 11: return 'rightStickButton'; // Right stick click (R3)
      case 12: return 'dpadUp';     // D-pad Up
      case 13: return 'dpadDown';   // D-pad Down
      case 14: return 'dpadLeft';   // D-pad Left
      case 15: return 'dpadRight';  // D-pad Right
      case 16: return 'home';       // Xbox/Guide button (if available)
      default: return null;
    }
  }

  private normalize(x: number, y: number): StickVector {
    const mag = Math.hypot(x, y);
    return mag > 1e-5 ? { x: x / mag, y: y / mag } : { x: 0, y: 0 };
  }
}