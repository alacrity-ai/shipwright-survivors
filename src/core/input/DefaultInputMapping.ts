// src/core/input/DefaultInputMapping.ts

import type { InputAction } from '@/core/input/interfaces/InputActions';
import type { InputBinding } from '@/core/input/interfaces/InputBinding';

export const DefaultInputMapping: Record<InputAction, InputBinding> = {
  thrustForward:    { keys: ['KeyW'], gamepadButtons: ['leftTrigger'] },
  afterburner:      { keys: ['ShiftLeft'], gamepadButtons: ['leftBumper'] },
  brake:            { keys: ['KeyS'], gamepadButtons: ['leftTrigger'] },
  powerSlide:       { keys: [], gamepadButtons: [] }, // Deprecated

  hideHud:          { keys: ['Backquote'], gamepadButtons: ['leftStickButton'] },
  showHud:          { keys: ['Backquote'], gamepadButtons: ['leftStickButton'] },

  rotateLeft:       { keys: ['KeyA'], gamepadButtons: [] },
  rotateRight:      { keys: ['KeyD'], gamepadButtons: [] },
  strafeLeft:       { keys: [], gamepadButtons: [] },
  strafeRight:      { keys: [], gamepadButtons: [] },

  firePrimary:      { keys: ['MouseLeft'], gamepadButtons: ['rightBumper'] },
  fireSecondary:    { keys: ['MouseRight'], gamepadButtons: ['rightTrigger'] },
  fireTertiary:     { keys: ['Space'], gamepadButtons: ['B'] },
  fireQuaternary:   { keys: [''], gamepadButtons: [] },

  switchFiringMode: { keys: [], gamepadButtons: [] },
  openMenu:         { keys: ['Escape'], gamepadButtons: ['start'] },
  openShipBuilder:  { keys: ['Tab'], gamepadButtons: ['select'] },
  select:           { keys: ['Enter'], gamepadButtons: ['A'] },
  cancel:           { keys: ['Escape'], gamepadButtons: ['B'] },
  pause:            { keys: ['Escape'], gamepadButtons: ['start'] },

  zoomIn:           { keys: ['WheelUp'], gamepadButtons: ['dpadUp'] },
  zoomOut:          { keys: ['WheelDown'], gamepadButtons: ['dpadDown'] },

  placeBlockButton: { keys: ['KeyQ'], gamepadButtons: ['A'] },
  placeAllBlocksButton: { keys: ['KeyE'], gamepadButtons: ['B'] },
  rollBlocksButton: { keys: ['KeyR'], gamepadButtons: ['Y'] },
  combineBlocksButton: { keys: ['KeyF'], gamepadButtons: ['X'] },

  cycleBlockLeft:   { keys: [], gamepadButtons: ['dpadLeft'] },
  cycleBlockRight:  { keys: [], gamepadButtons: ['dpadRight'] },

  jumpHome:         { keys: ['KeyH'], gamepadButtons: ['rightStickButton'] },
  activeContractsButton: { keys: ['KeyC'], gamepadButtons: ['select'] },
};
