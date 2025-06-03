// src/core/InputManager.ts

type KeyState = { pressed: boolean };
type MouseState = {
  x: number;
  y: number;
  leftDown: boolean;
  rightDown: boolean;
};

export class InputManager {
  private keyState: Record<string, KeyState> = {};
  private prevKeyState: Record<string, boolean> = {};
  private justPressedKeys: Set<string> = new Set();
  private justReleasedKeys: Set<string> = new Set();
  private disabledKeys: Set<string> = new Set();
  private inputDisabled = false;

  private mouseMoved = false;

  private mouseState: MouseState = {
    x: 0,
    y: 0,
    leftDown: false,
    rightDown: false,
  };

  private scrollUpDetected = false;
  private scrollDownDetected = false;
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
    return { x: this.mouseState.x, y: this.mouseState.y };
  }

  private mouseMoveHandler = (e: MouseEvent) => {
    const target = e.target as HTMLCanvasElement;
    const rect = target.getBoundingClientRect();

    const scaleX = target.width / rect.width;
    const scaleY = target.height / rect.height;

    const newX = (e.clientX - rect.left) * scaleX;
    const newY = (e.clientY - rect.top) * scaleY;

    if (newX !== this.mouseState.x || newY !== this.mouseState.y) {
      this.mouseMoved = true;
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
    this.mouseMoved = false;
    this.justPressedKeys.clear();
    this.justReleasedKeys.clear();
    this.scrollUpDetected = false;
    this.scrollDownDetected = false;

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
    return this.wasKeyJustPressed('MouseLeft');
  }

  public wasLeftClicked(): boolean {
    if (this.inputDisabled) return false;
    return this.wasKeyJustPressed('MouseLeft');
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
    if (this.inputDisabled) return 0;
    let delta = 0;
    if (this.scrollUpDetected || this.isKeyPressed('KeyR')) delta += 10;
    if (this.scrollDownDetected || this.isKeyPressed('KeyT')) delta -= 10;
    return delta;
  }

  // === Custom aliases ===
  public isEscapePressed(): boolean {
    return this.isKeyPressed('Escape');
  }

  public isMouseLeftPressed(): boolean {
    return this.isKeyPressed('MouseLeft');
  }

  public isMouseRightPressed(): boolean {
    return this.isKeyPressed('MouseRight');
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
  };

  private keyUpHandler = (e: KeyboardEvent) => {
    this.keyState[e.code] = { pressed: false };
  };

  private mouseDownHandler = (e: MouseEvent) => {
    if (e.button === 0) this.mouseState.leftDown = true;
    if (e.button === 2) this.mouseState.rightDown = true;
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
}
