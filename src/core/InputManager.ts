// src/core/InputManager.ts

import { toggleBrowserFullscreen } from '@/shared/toggleBrowserFullscreen';
import { GamePadManager } from '@/core/input/GamePadManager';
import { DefaultInputMapping } from '@/core/input/DefaultInputMapping';
import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';
import { isElectron } from '@/shared/isElectron';
import { Camera } from './Camera';

import type { InputAction } from '@/core/input/interfaces/InputActions';
import type { GamepadButtonAlias } from '@/core/input/interfaces/GamePadButtonAlias';

type KeyState = { pressed: boolean };
type MouseState = {
  x: number;
  y: number;
  leftDown: boolean;
  rightDown: boolean;
};

export class InputManager {
  private gamepadManager: GamePadManager = new GamePadManager();
  private gamepadMousemockingEnabled = true;
  private overrideCursorWithGamepad = true;

  private keyState: Record<string, KeyState> = {};
  private prevKeyState: Record<string, boolean> = {};
  private justPressedKeys: Set<string> = new Set();
  private justReleasedKeys: Set<string> = new Set();
  private disabledKeys: Set<string> = new Set();
  private disabledGamepadButtons: Set<GamepadButtonAlias> = new Set();
  private inputDisabled = false;

  private virtualMouse: { x: number; y: number } = { x: 0, y: 0 };
  private readonly VIRTUAL_MOUSE_SPEED = 900; // pixels/sec at full stick deflection

  private leftStickDisabled = false;
  private rightStickDisabled = false;

  private mouseMoved = false;
  private mouseState: MouseState = {
    x: 0,
    y: 0,
    leftDown: false,
    rightDown: false,
  };

  private scrollUpDetected = false;
  private scrollDownDetected = false;

  private consumedActions: Set<InputAction> = new Set();

  private initialized = false;

  constructor(private canvasElement: HTMLCanvasElement) {
    this.initialize();
  }

  public disableInput(): void {
    this.inputDisabled = true;
  }

  public enableInput(): void {
    this.inputDisabled = false;
  }

  public getMousePosition(): { x: number; y: number } {
    const deviceTracker = InputDeviceTracker.getInstance();
    const usingGamepad = deviceTracker.getLastUsed() === 'gamepad';

    if (usingGamepad) {
      return { x: this.virtualMouse.x, y: this.virtualMouse.y };
    }

    return { x: this.mouseState.x, y: this.mouseState.y };
  }

  public setVirtualMousePosition(x: number, y: number): void {
    this.virtualMouse.x = x;
    this.virtualMouse.y = y;
  }

  public setGamepadMousemockingEnabled(enabled: boolean): void {
    this.gamepadMousemockingEnabled = enabled;
  }

  public setGamepadCursorOverrideEnabled(enabled: boolean): void {
    this.overrideCursorWithGamepad = enabled;
  }

  public isGamepadCursorOverrideEnabled(): boolean {
    return this.overrideCursorWithGamepad;
  }

  public isUsingGamepad(): boolean {
    const deviceTracker = InputDeviceTracker.getInstance();
    return deviceTracker.getLastUsed() === 'gamepad';
  }

  private mouseMoveHandler = (e: MouseEvent) => {
    const target = e.target as HTMLCanvasElement;
    const rect = target.getBoundingClientRect();

    const scaleX = target.width / rect.width;
    const scaleY = target.height / rect.height;

    const newX = (e.clientX - rect.left) * scaleX;
    const newY = (e.clientY - rect.top) * scaleY;

    const moved = newX !== this.mouseState.x || newY !== this.mouseState.y;
    if (moved) {
      this.mouseMoved = true;

      const deviceTracker = InputDeviceTracker.getInstance();
      const lastUsed = deviceTracker.getLastUsed();

      // 🧠 If not already in mouse mode, switch to mouse AND adopt real coordinates
      if (lastUsed !== 'mouse') {
        deviceTracker.updateDevice('mouse');
        this.virtualMouse.x = newX;
        this.virtualMouse.y = newY;
      }
    }

    this.mouseState.x = newX;
    this.mouseState.y = newY;
  };

  // === Lifecycle ===
  public initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
    window.addEventListener('mousedown', this.mouseDownHandler);
    window.addEventListener('mouseup', this.mouseUpHandler);
    // window.addEventListener('mousemove', this.mouseMoveHandler);
    this.canvasElement.addEventListener('mousemove', this.mouseMoveHandler);
    window.addEventListener('wheel', this.wheelHandler);
    window.addEventListener('contextmenu', this.contextMenuHandler);
  }

  public destroy(): void {
    if (!this.initialized) return;
    this.initialized = false;

    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    window.removeEventListener('mousedown', this.mouseDownHandler);
    window.removeEventListener('mouseup', this.mouseUpHandler);
    // window.removeEventListener('mousemove', this.mouseMoveHandler);
    this.canvasElement.removeEventListener('mousemove', this.mouseMoveHandler);
    window.removeEventListener('wheel', this.wheelHandler);
    window.removeEventListener('contextmenu', this.contextMenuHandler);
  }

  // === Input Update ===
  public updateFrame(): void {
    this.gamepadManager.updateFrame();
    this.mouseMoved = false;
    this.justPressedKeys.clear();
    this.justReleasedKeys.clear();
    this.scrollUpDetected = false;
    this.scrollDownDetected = false;

    // === Gamepad Mousemocking
    const deviceTracker = InputDeviceTracker.getInstance();
    const usingGamepad = deviceTracker.getLastUsed() === 'gamepad';

    if (usingGamepad && this.gamepadMousemockingEnabled) {
      const dt = 1 / 60;
      const { x: dx, y: dy } = this.getGamepadMovementVector();
      const mag = Math.hypot(dx, dy);

      if (mag > 1e-3) {
        this.virtualMouse.x += dx * this.VIRTUAL_MOUSE_SPEED * dt;
        this.virtualMouse.y += dy * this.VIRTUAL_MOUSE_SPEED * dt;

        const canvasWidth = this.canvasElement.width;
        const canvasHeight = this.canvasElement.height;

        this.virtualMouse.x = Math.max(0, Math.min(canvasWidth, this.virtualMouse.x));
        this.virtualMouse.y = Math.max(0, Math.min(canvasHeight, this.virtualMouse.y));
      }
    }

    // === Mouse buttons ===
    if (!this.prevKeyState['MouseLeft'] && this.mouseState.leftDown) {
      this.justPressedKeys.add('MouseLeft');
    }
    if (this.prevKeyState['MouseLeft'] && !this.mouseState.leftDown) {
      this.justReleasedKeys.add('MouseLeft');
    }

    if (!this.prevKeyState['MouseRight'] && this.mouseState.rightDown) {
      this.justPressedKeys.add('MouseRight');
    }
    if (this.prevKeyState['MouseRight'] && !this.mouseState.rightDown) {
      this.justReleasedKeys.add('MouseRight');
    }

    this.prevKeyState['MouseLeft'] = this.mouseState.leftDown;
    this.prevKeyState['MouseRight'] = this.mouseState.rightDown;

    // === Keyboard keys ===
    for (const code in this.keyState) {
      if (this.disabledKeys.has(code)) continue;

      const current = this.keyState[code]?.pressed ?? false;
      const previous = this.prevKeyState[code] ?? false;

      if (!previous && current) {
        this.justPressedKeys.add(code);
      }

      if (previous && !current) {
        this.justReleasedKeys.add(code);
      }

      this.prevKeyState[code] = current;
    }
  
    // === Global Inputs (DEV) TODO: ===
    // PUT A checkbox for fullscreen in the settings menu
    if (this.wasKeyJustPressed('KeyY')) {
      if (isElectron() && window.electronAPI?.toggleFullscreen) {
        window.electronAPI.toggleFullscreen();
      } else {
        toggleBrowserFullscreen();
      }
    }
  }

  public consumeAction(action: InputAction): void {
    this.consumedActions.add(action);
  }

  public isActionConsumed(action: InputAction): boolean {
    return this.consumedActions.has(action);
  }

  public clearConsumedActions(): void {
    this.consumedActions.clear();
  }

  public disableKey(code: string): void {
    this.disabledKeys.add(code);
  }

  public enableKey(code: string): void {
    this.disabledKeys.delete(code);
  }

  public enableAllKeys(): void {
    this.disabledKeys.clear();
  }

  // === Accessors ===
  public isKeyPressed(code: string): boolean {
    if (this.inputDisabled || this.disabledKeys.has(code)) return false;
    return code === 'MouseLeft'
      ? this.mouseState.leftDown
      : code === 'MouseRight'
      ? this.mouseState.rightDown
      : this.keyState[code]?.pressed ?? false;
  }

  public wasKeyJustPressed(code: string): boolean {
    if (this.inputDisabled || this.disabledKeys.has(code)) return false;
    return this.justPressedKeys.has(code);
  }

  public wasKeyJustReleased(code: string): boolean {
    if (this.inputDisabled || this.disabledKeys.has(code)) return false;
    return this.justReleasedKeys.has(code);
  }

  public wasMouseClicked(): boolean {
    if (this.inputDisabled) return false;
    return this.wasKeyJustPressed('MouseLeft') || this.wasActionJustPressed('select');
  }

  public wasLeftClicked(): boolean {
    if (this.inputDisabled) return false;
    return this.wasKeyJustPressed('MouseLeft') || this.wasActionJustPressed('select');
  }

  public wasRightClicked(): boolean {
    if (this.inputDisabled) return false;
    return this.wasKeyJustPressed('MouseRight');
  }

  public wasMouseMoved(): boolean {
    if (this.inputDisabled) return false;
    return this.mouseMoved;
  }

  public wasScrollWheelUp(): boolean {
    if (this.inputDisabled) return false;
    return this.scrollUpDetected;
  }

  public wasScrollWheelDown(): boolean {
    if (this.inputDisabled) return false;
    return this.scrollDownDetected;
  }

  public isShiftPressed(): boolean {
    if (this.inputDisabled) return false;
    return this.isKeyPressed('ShiftLeft') || this.isKeyPressed('ShiftRight');
  }

  public consumeZoomDelta(): number {
    if (this.inputDisabled || !this.overrideCursorWithGamepad) return 0;

    const scrollUpDetected = this.scrollUpDetected;
    const scrollDownDetected = this.scrollDownDetected;

    const up = scrollUpDetected || this.isKeyPressed('KeyR') || this.gamepadAliasIsPressed('dpadUp');
    const down = scrollDownDetected || this.isKeyPressed('KeyT') || this.gamepadAliasIsPressed('dpadDown');

    if (up || down) {
      Camera.getInstance().abortZoomAnimation();
    }

    // Return higher zoom speed for scrollwheel
    if (scrollUpDetected || scrollDownDetected) {
      return (scrollUpDetected ? 10 : 0) + (scrollDownDetected ? -10 : 0);
    }

    // Return zoom speed for keys or buttons
    return (up ? 0.2 : 0) + (down ? -0.2 : 0);
  }

  // === Custom aliases ===
  public isEscapePressed(): boolean {
    return this.isKeyPressed('Escape');
  }

  public isMouseLeftPressed(): boolean {
    return this.isKeyPressed('MouseLeft') || this.isActionPressed('select');
  }

  public isMouseRightPressed(): boolean {
    return this.isKeyPressed('MouseRight') || this.isActionPressed('cancel');
  }

  public isTabPressed(): boolean {
    return this.isKeyPressed('Tab');
  }

  public is0Pressed(): boolean {
    return this.isKeyPressed('Digit0');
  }

  public isLPressed(): boolean {
    return this.isKeyPressed('KeyL');
  }

  public wasLeftBracketPressed(): boolean {
    return this.wasKeyJustPressed('BracketLeft');
  }

  public wasRightBracketPressed(): boolean {
    return this.wasKeyJustPressed('BracketRight');
  }

  // === Handlers (private) ===
  private keyDownHandler = (e: KeyboardEvent) => {
    this.keyState[e.code] = { pressed: true };
    InputDeviceTracker.getInstance().updateDevice('keyboard');
  };

  private keyUpHandler = (e: KeyboardEvent) => {
    this.keyState[e.code] = { pressed: false };
  };

  private mouseDownHandler = (e: MouseEvent) => {
    if (e.button === 0) this.mouseState.leftDown = true;
    if (e.button === 2) this.mouseState.rightDown = true;

    const deviceTracker = InputDeviceTracker.getInstance();
    const lastUsed = deviceTracker.getLastUsed();

    // Ignore if gamepad is last used and no real mouse motion has occurred
    if (lastUsed !== 'gamepad') {
      deviceTracker.updateDevice('mouse');
    }
  };


  private mouseUpHandler = (e: MouseEvent) => {
    if (e.button === 0) this.mouseState.leftDown = false;
    if (e.button === 2) this.mouseState.rightDown = false;
  };

  private wheelHandler = (e: WheelEvent) => {
    const delta = Math.sign(e.deltaY);
    if (delta < 0) this.scrollUpDetected = true;
    else if (delta > 0) this.scrollDownDetected = true;
  };

  private contextMenuHandler = (e: MouseEvent) => {
    e.preventDefault();
  };

  public isGamepadConnected(): boolean {
    return this.gamepadManager.isConnected();
  }

  // Left stick for moving / turning ship
  public getGamepadMovementVector(): { x: number; y: number } {
    return this.leftStickDisabled ? { x: 0, y: 0 } : this.gamepadManager.getLeftStick();
  }

  // Right stick for aiming crosshair
  public getGamepadAimVector(): { x: number; y: number } {
    return this.rightStickDisabled ? { x: 0, y: 0 } : this.gamepadManager.getRightStick();
  }

  // Gamepad

  public disableGamepadButton(alias: GamepadButtonAlias): void {
    this.disabledGamepadButtons.add(alias);
  }

  public enableGamepadButton(alias: GamepadButtonAlias): void {
    this.disabledGamepadButtons.delete(alias);
  }

  public enableAllGamepadButtons(): void {
    this.disabledGamepadButtons.clear();
  }

  public disableLeftStick(): void {
    this.leftStickDisabled = true;
  }

  public enableLeftStick(): void {
    this.leftStickDisabled = false;
  }

  public disableRightStick(): void {
    this.rightStickDisabled = true;
  }

  public enableRightStick(): void {
    this.rightStickDisabled = false;
  }

  public enableAllSticks(): void {
    this.leftStickDisabled = false;
    this.rightStickDisabled = false;
  }

  public isLeftStickMoved(): boolean {
    if (this.leftStickDisabled) return false;
    const { x, y } = this.gamepadManager.getLeftStick();
    return Math.abs(x) > 0 || Math.abs(y) > 0;
  }

  public isRightStickMoved(): boolean {
    if (this.rightStickDisabled) return false;
    const { x, y } = this.gamepadManager.getRightStick();
    return Math.abs(x) > 0 || Math.abs(y) > 0;
  }

  public isLeftTriggerPressed(): boolean {
    return !this.disabledGamepadButtons.has('leftTrigger') &&
          this.gamepadManager.isActionPressed('leftTrigger');
  }

  // Abstracted Actions

  public disableAllActions(): void {
    for (const action in DefaultInputMapping) {
      const binding = DefaultInputMapping[action as InputAction];

      // Disable all keys
      binding.keys?.forEach(k => this.disableKey(k));

      // Disable all gamepad buttons
      binding.gamepadButtons?.forEach(b => this.disableGamepadButton(b));

      // Disable gamepad sticks
      this.disableLeftStick();
      this.disableRightStick();
    }
  }

  public enableAllActions(): void {
    for (const action in DefaultInputMapping) {
      const binding = DefaultInputMapping[action as InputAction];

      // Enable all keys
      binding.keys?.forEach(k => this.enableKey(k));

      // Enable all gamepad buttons
      binding.gamepadButtons?.forEach(b => this.enableGamepadButton(b));

      // Enable gamepad sticks
      this.enableLeftStick();
      this.enableRightStick();
    }
  }

  public disableAction(action: InputAction): void {
    const binding = DefaultInputMapping[action];
    binding.keys?.forEach(k => this.disableKey(k));
    binding.gamepadButtons?.forEach(b => this.disableGamepadButton(b));
  }

  public enableAction(action: InputAction): void {
    const binding = DefaultInputMapping[action];
    binding.keys?.forEach(k => this.enableKey(k));
    binding.gamepadButtons?.forEach(b => this.enableGamepadButton(b));
  }

  public isActionPressed(action: InputAction): boolean {
    const binding = DefaultInputMapping[action];

    const keyboardPressed =
      binding.keys?.some(k => this.isKeyPressed(k)) ?? false;

    const gamepadPressed =
      binding.gamepadButtons?.some(
        b => !this.disabledGamepadButtons.has(b) && this.gamepadManager.isActionPressed(b)
      ) ?? false;

    return keyboardPressed || gamepadPressed;
  }

  public wasActionJustPressed(action: InputAction): boolean {
    const binding = DefaultInputMapping[action];

    const keyboardJustPressed =
      binding.keys?.some(k => this.wasKeyJustPressed(k)) ?? false;

    const gamepadJustPressed =
      binding.gamepadButtons?.some(
        b => !this.disabledGamepadButtons.has(b) && this.gamepadManager.wasActionJustPressed(b)
      ) ?? false;

    return keyboardJustPressed || gamepadJustPressed;
  }

  public wasActionJustReleased(action: InputAction): boolean {
    const binding = DefaultInputMapping[action];

    const keyboardJustReleased =
      binding.keys?.some(k => this.wasKeyJustReleased(k)) ?? false;

    const gamepadJustReleased =
      binding.gamepadButtons?.some(
        b => !this.disabledGamepadButtons.has(b) && this.gamepadManager.wasActionJustReleased(b)
      ) ?? false;

    return keyboardJustReleased || gamepadJustReleased;
  }

  // Gamepad Passthroughs

  public isGamepadVerticalNavigationNeutral(): boolean {
    return this.gamepadManager.isVerticalNavigationNeutral();
  }

  public isGamepadHorizontalNavigationNeutral(): boolean {
    return this.gamepadManager.isHorizontalNavigationNeutral();
  }

  public isGamepadNavigationNeutral(): boolean {
    return this.gamepadManager.isNavigationNeutral();
  }

  public wasGamepadAliasJustPressed(alias: GamepadButtonAlias): boolean {
    return this.gamepadManager.wasActionJustPressed(alias);
  }

  public gamepadAliasIsPressed(alias: GamepadButtonAlias): boolean {
    return this.gamepadManager.isActionPressed(alias);
  }
}
