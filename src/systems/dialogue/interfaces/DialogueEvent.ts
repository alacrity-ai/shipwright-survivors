// src/systems/dialogue/interfaces/DialogueEvent.ts
import type { DialogueMode } from './DialogueMode';

export type DialogueEvent =
  | {
      type: 'line';
      speakerId: string;
      text: string;
      options?: {
        textColor?: string;
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
    };
