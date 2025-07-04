// src/rendering/coachmarks/interfaces/CoachMarkBehaviorOptions.ts

export type CoachMarkType = 
  'arrow' |
  'box' |
  'image' |
  'text' |
  'key' |
  'mouse' |
  'gamepadFaceButtons' |
  'gamepadFaceButton' |
  'gamepadSticks' |
  'gamepadShoulders' | 
  'gamepadDpad';

interface BaseCoachMarkBehaviorOptions {
  duration?: number;
  type: CoachMarkType;
}

// === Specific variants ===

export interface ArrowCoachMarkBehavior extends BaseCoachMarkBehaviorOptions {
  type: 'arrow';
  arrowDirection?: 'up' | 'down' | 'left' | 'right';
  arrowLength?: number;
  arrowColor?: string;
}

export interface BoxCoachMarkBehavior extends BaseCoachMarkBehaviorOptions {
  type: 'box';
  boxWidth?: number;
  boxHeight?: number;
  boxStrokeColor?: string;
  boxLineWidth?: number;
}

export interface ImageCoachMarkBehavior extends BaseCoachMarkBehaviorOptions {
  type: 'image';
  imageSrc: string; // required for image marks
  imageWidth?: number;
  imageHeight?: number;
}


export interface TextCoachMarkBehavior extends BaseCoachMarkBehaviorOptions {
  type: 'text';
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  labelOffset?: { x: number, y: number };
}

export interface KeyCoachMarkBehavior extends BaseCoachMarkBehaviorOptions {
  type: 'key';
  keyLabel: string; // e.g. "W", "A", "Space"
  width?: number;   // px
  height?: number;
  fontSize?: number;
  borderColor?: string;
  fillColor?: string;
  textColor?: string;
}

export type MouseInteractionMode = 'wiggle' | 'leftClick' | 'rightClick' | 'scroll';

export interface MouseCoachMarkBehavior extends BaseCoachMarkBehaviorOptions {
  type: 'mouse';
  interactionMode: MouseInteractionMode;
  width?: number;
  height?: number;
  borderColor?: string;
  fillColor?: string;
  highlightColor?: string;
}

export type GamepadFaceButton = 'A' | 'B' | 'X' | 'Y';

export interface GamepadFaceButtonsCoachMarkBehavior extends BaseCoachMarkBehaviorOptions {
  type: 'gamepadFaceButtons';
  highlightButton?: GamepadFaceButton; // Optional pulse target
  radius?: number; // base circle size
  borderColor?: string;
  fillColor?: string;
  highlightColor?: string;
  textColor?: string;
  fontSize?: number;
}

export interface GamepadFaceButtonCoachMarkBehavior extends BaseCoachMarkBehaviorOptions {
  type: 'gamepadFaceButton';
  label: GamepadFaceButton; // 'A' | 'B' | 'X' | 'Y'
  radius?: number;
  fontSize?: number;
  borderColor?: string;
  fillColor?: string;
  highlightColor?: string;
  textColor?: string;
}

export type GamepadStickSide = 'left' | 'right';

export interface GamepadSticksCoachMarkBehavior extends BaseCoachMarkBehaviorOptions {
  type: 'gamepadSticks';
  highlightStick?: GamepadStickSide; // Optional: pulse one stick
  wiggleStick?: GamepadStickSide;    // Optional: wiggle one stick
  width?: number; // base gamepad width
  height?: number;
  borderColor?: string;
  fillColor?: string;
  highlightColor?: string;
}

export type GamepadShoulderButton = 'leftBumper' | 'rightBumper' | 'leftTrigger' | 'rightTrigger';

export interface GamepadShoulderButtonsCoachMarkBehavior extends BaseCoachMarkBehaviorOptions {
  type: 'gamepadShoulders';
  highlighted: GamepadShoulderButton[];
  width?: number;
  height?: number;
  borderColor?: string;
  fillColor?: string;
  highlightColor?: string;
}

export type DPadDirection = 'up' | 'down' | 'left' | 'right';

export interface GamepadDPadCoachMarkBehavior extends BaseCoachMarkBehaviorOptions {
  type: 'gamepadDpad';
  size?: number;
  borderColor?: string;
  fillColor?: string;
  highlightColor?: string;
  highlightDirections?: DPadDirection[];
}

// === Unified Union ===
export type CoachMarkBehaviorOptions =
  | ArrowCoachMarkBehavior
  | BoxCoachMarkBehavior
  | ImageCoachMarkBehavior
  | TextCoachMarkBehavior
  | MouseCoachMarkBehavior
  | KeyCoachMarkBehavior
  | GamepadFaceButtonsCoachMarkBehavior
  | GamepadFaceButtonCoachMarkBehavior
  | GamepadSticksCoachMarkBehavior
  | GamepadShoulderButtonsCoachMarkBehavior
  | GamepadDPadCoachMarkBehavior;

