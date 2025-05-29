// src/core/Input.ts

type KeyState = { pressed: boolean };
type MouseState = {
  x: number;
  y: number;
  leftDown: boolean;
  rightDown: boolean;
};

const keyState: Record<string, KeyState> = {};
const prevKeyState: Record<string, boolean> = {};
const justPressedKeys: Set<string> = new Set();

const mouseState: MouseState = {
  x: 0,
  y: 0,
  leftDown: false,
  rightDown: false,
};

let zoomDelta = 0;
let scrollUpDetected = false;
let scrollDownDetected = false;


export function initializeInputTracking(): void {
  window.addEventListener('keydown', (e) => {
    keyState[e.code] = { pressed: true };
  });

  window.addEventListener('keyup', (e) => {
    keyState[e.code] = { pressed: false };
  });

  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) mouseState.leftDown = true;
    if (e.button === 2) mouseState.rightDown = true;
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouseState.leftDown = false;
    if (e.button === 2) mouseState.rightDown = false;
  });

  window.addEventListener('mousemove', (e) => {
    mouseState.x = e.clientX;
    mouseState.y = e.clientY;
  });

  window.addEventListener('wheel', (e) => {
    const delta = Math.sign(e.deltaY);

    if (delta < 0 && !scrollUpDetected) {
      scrollUpDetected = true;
    } else if (delta > 0 && !scrollDownDetected) {
      scrollDownDetected = true;
    }
  });

  window.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function updateInputFrame(): void {
  justPressedKeys.clear();
  scrollUpDetected = false;
  scrollDownDetected = false;

  // Mouse edge detection
  if (!prevKeyState['MouseLeft'] && mouseState.leftDown) {
    justPressedKeys.add('MouseLeft');
  }
  if (!prevKeyState['MouseRight'] && mouseState.rightDown) {
    justPressedKeys.add('MouseRight');
  }

  prevKeyState['MouseLeft'] = mouseState.leftDown;
  prevKeyState['MouseRight'] = mouseState.rightDown;

  // Keyboard edge detection
  for (const code in keyState) {
    const current = keyState[code]?.pressed ?? false;
    const previous = prevKeyState[code] ?? false;

    if (!previous && current) {
      justPressedKeys.add(code);
    }

    prevKeyState[code] = current;
  }
}

// === General Access ===

export function isKeyPressed(code: string): boolean {
  return code === 'MouseLeft'
    ? mouseState.leftDown
    : code === 'MouseRight'
    ? mouseState.rightDown
    : keyState[code]?.pressed ?? false;
}

export function wasKeyJustPressed(code: string): boolean {
  return justPressedKeys.has(code);
}

export function getMousePosition(): { x: number; y: number } {
  return { x: mouseState.x, y: mouseState.y };
}

export function getZoomDelta(): number {
  return zoomDelta;
}

export function consumeZoomDelta(): number {
  let delta = 0;

  if (wasScrollWheelUp() || isKeyPressed('KeyR')) {
    delta += 10; // Zoom in
  }

  if (wasScrollWheelDown() || isKeyPressed('KeyT')) {
    delta -= 10; // Zoom out
  }

  return delta;
}

// === Shorthand bindings ===

export function isEscapePressed(): boolean {
  return isKeyPressed('Escape');
}

export function isTabPressed(): boolean {
  return isKeyPressed('Tab');
}

export function is0Pressed(): boolean {
  return isKeyPressed('Digit0');
}

export function isLPressed(): boolean {
  return isKeyPressed('KeyL');
}

export function wasMouseClicked(): boolean {
  return wasKeyJustPressed('MouseLeft');
}

export function wasRightClicked(): boolean {
  return wasKeyJustPressed('MouseRight');
}

export function wasScrollWheelUp(): boolean {
  return scrollUpDetected;
}

export function wasScrollWheelDown(): boolean {
  return scrollDownDetected;
}

export function isShiftPressed(): boolean {
  return isKeyPressed('ShiftLeft') || isKeyPressed('ShiftRight');
}
