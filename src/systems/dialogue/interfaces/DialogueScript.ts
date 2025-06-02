// src/systems/dialogue/interfaces/DialogueScript.ts

import type { DialogueEvent } from '@/systems/dialogue/interfaces/DialogueEvent';
import type { DialogueMode } from '@/systems/dialogue/interfaces/DialogueMode';

export interface DialogueScript {
  id: string;
  events: DialogueEvent[];
  defaultMode?: DialogueMode;
}
