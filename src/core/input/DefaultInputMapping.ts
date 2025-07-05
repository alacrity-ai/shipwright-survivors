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
  strafeLeft:       { keys: ['KeyQ'], gamepadButtons: ['dpadLeft'] },
  strafeRight:      { keys: ['KeyE'], gamepadButtons: ['dpadRight'] },

  firePrimary:      { keys: ['MouseLeft'], gamepadButtons: ['rightBumper'] },
  fireSecondary:    { keys: ['MouseRight'], gamepadButtons: ['rightTrigger'] },
  fireTertiary:     { keys: ['Space'], gamepadButtons: ['B'] },
  fireQuaternary:   { keys: ['KeyC'], gamepadButtons: [] },

  switchFiringMode: { keys: ['KeyX'], gamepadButtons: ['X'] },
  openMenu:         { keys: ['Escape'], gamepadButtons: ['start'] },
  openShipBuilder:  { keys: ['Tab'], gamepadButtons: ['Y'] },
  select:           { keys: ['Enter'], gamepadButtons: ['A'] },
  cancel:           { keys: ['Escape'], gamepadButtons: ['B'] },
  pause:            { keys: ['Escape'], gamepadButtons: ['start'] },

  zoomIn:           { keys: ['WheelUp'], gamepadButtons: ['dpadUp'] },
  zoomOut:          { keys: ['WheelDown'], gamepadButtons: ['dpadDown'] },

  placeAllBlocksButton: { keys: ['KeyE'], gamepadButtons: ['A'] },
};

/*
  | 'confirm'           // A button
  | 'cancel'            // X button
  | 'pause'             // Y button
  | 'fire'              // RT (right trigger)
  | 'secondary'         // B button
  | 'leftBumper'        // LB
  | 'rightBumper'       // RB
  | 'leftTrigger'       // LT
  | 'select'            // Back/View button
  | 'start'             // Start/Menu button
  | 'leftStickButton'   // Left stick click (L3)
  | 'rightStickButton'  // Right stick click (R3)
  | 'dpadUp'            // D-pad Up
  | 'dpadDown'          // D-pad Down
  | 'dpadLeft'          // D-pad Left
  | 'dpadRight'         // D-pad Right
  | 'home';             // Xbox/Guide button
*/