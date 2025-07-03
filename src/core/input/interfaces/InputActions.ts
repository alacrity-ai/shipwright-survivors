// src/core/input/interfaces/InputActions.ts

export type InputAction =
  | 'thrustForward'
  | 'afterburner'
  | 'brake'
  | 'rotateLeft'
  | 'rotateRight'
  | 'strafeLeft' // To be deprecated
  | 'strafeRight'// To be deprecated
  | 'powerSlide' // New
  | 'firePrimary'
  | 'fireSecondary'
  | 'fireTertiary'
  | 'fireQuaternary'
  | 'switchFiringMode'
  | 'openShipBuilder'
  | 'openMenu'
  | 'select'
  | 'cancel'
  | 'pause'
  | 'zoomIn'
  | 'zoomOut'
  | 'showHud'
  | 'hideHud';
