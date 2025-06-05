// src/systems/dialogue/interfaces/DialogueLine.ts

import type { DialogueMode } from './DialogueMode';

export interface DialogueLine {
  speakerId: string;
  text: string;
  mode: DialogueMode;
  position: { x: number; y: number };
  textBoxRect: { x: number; y: number; width: number; height: number };
  textBoxAlpha?: number;
  textColor?: string;
  font?: string;
  textSpeed?: number;
}
