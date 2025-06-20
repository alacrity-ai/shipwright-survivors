// src/systems/dialogue/interfaces/DialogueEvent.ts
import type { DialogueMode } from './DialogueMode';

export type DialogueEvent =
  | {
      type: 'line';
      speakerId: string;
      text: string;
      options?: {
        textColor?: string;
        textBoxAlpha?: number;
        font?: string;
        speed?: number;     // override charDelay
        pitchMod?: number;  // additional pitch shift
        mode?: DialogueMode;
        side?: 'left' | 'right';
      };
    }
  | {
      type: 'pause';
      durationMs: number;
    }
  | {
      type: 'command';
      run: () => void | Promise<void>; // <-- updated to allow async
    }
  | {
      type: 'hideUI';
    }
  | {
      type: 'showUI';
    }
  | {
      type: 'endIf';
      condition: () => boolean;
    }
  | {
      type: 'async';
      dialogue: DialogueEvent[];
    }
  // Deprecated changespeaker
  | {
      type: 'changespeaker';
      speakerId: string;
      options?: {
        mode?: DialogueMode;
        side?: 'left' | 'right';
        textColor?: string;
        font?: string;
        pitchMod?: number;
      };
    }

