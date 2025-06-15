// src/core/input/interfaces/InputBinding.ts

import type { GamepadButtonAlias } from './GamePadButtonAlias';

export interface InputBinding {
  keys?: string[];             // KeyboardEvent.code
  gamepadButtons?: GamepadButtonAlias[];   // GamePadManager aliases
}
