// src/core/Input.ts

type KeyState = { pressed: boolean };
type MouseState = {
  x: number;
  y: number;
  leftDown: boolean;
  rightDown: boolean;
};

const keyState: Record<string, KeyState> = {};
const mouseState: MouseState = {
  x: 0,
  y: 0,
  leftDown: false,
  rightDown: false,
};

let prevLeftDown = false;
let clickDetected = false;
let zoomDelta = 0;

let prevRightDown = false;
let rightClickDetected = false;

let prevSpacePressed = false;
let spacePressDetected = false;


export function initializeInputTracking() {
  window.addEventListener('keydown', (e) => {
    keyState[e.code] = { pressed: true };
  });

  window.addEventListener('keyup', (e) => {
    keyState[e.code] = { pressed: false };
  });

  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      mouseState.leftDown = true;
      if (!prevLeftDown) clickDetected = true;
    }
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
    const normalized = Math.sign(e.deltaY) * 100; // Or use a better heuristic
    zoomDelta += normalized;
  });

  // Prevent right-click menu
  window.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function isKeyPressed(code: string): boolean {
  return keyState[code]?.pressed ?? false;
}

export function isLeftMouseDown(): boolean {
  return mouseState.leftDown;
}

export function isRightMouseDown(): boolean {
  return mouseState.rightDown;
}

export function isEscapePressed(): boolean {
  return isKeyPressed('Escape');
}

export function isTabPressed(): boolean {
  return isKeyPressed('Tab');
}

export function is0Pressed(): boolean {
  return isKeyPressed('Digit0');
}

// src/core/Input.ts
export function isLPressed(): boolean {
  return isKeyPressed('KeyL');
}

export function getMousePosition(): { x: number; y: number } {
  return { x: mouseState.x, y: mouseState.y };
}

export function wasMouseClicked(): boolean {
  const clicked = clickDetected;
  clickDetected = false;
  return clicked;
}

export function wasRightClicked(): boolean {
  const clicked = rightClickDetected;
  rightClickDetected = false;
  return clicked;
}

export function wasSpacePressed(): boolean {
  const pressed = spacePressDetected;
  spacePressDetected = false;
  return pressed;
}

export function getZoomDelta(): number {
  return zoomDelta;
}

export function updateInputFrame(): void {
  // Left click detection
  if (!prevLeftDown && mouseState.leftDown) {
    clickDetected = true;
  }
  prevLeftDown = mouseState.leftDown;

  // Right click detection
  if (!prevRightDown && mouseState.rightDown) {
    rightClickDetected = true;
  }
  prevRightDown = mouseState.rightDown;

  // Spacebar detection
  const spacePressed = isKeyPressed('Space');
  if (!prevSpacePressed && spacePressed) {
    spacePressDetected = true;
  }
  prevSpacePressed = spacePressed;
}


export function consumeZoomDelta(): number {
  // const delta = zoomDelta;
  // zoomDelta = 0;
  // return delta;

  let delta = 0;

  if (isKeyPressed('KeyR')) {
    delta -= 10; // Zoom in
  }

  if (isKeyPressed('KeyT')) {
    delta += 10; // Zoom out
  }

  // Do not use stored zoomDelta anymore
  // const actualDelta = zoomDelta;
  // zoomDelta = 0;
  return delta;  
}