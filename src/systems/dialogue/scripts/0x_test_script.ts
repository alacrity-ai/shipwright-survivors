// src/systems/dialogue/registry/scripts/00_marlaGreeting.ts

import type { DialogueScript } from '@/systems/dialogue/interfaces/DialogueScript';
import type { DialogueContext } from '@/systems/dialogue/interfaces/DialogueContext';

export function createTestScript(ctx: DialogueContext): DialogueScript {

  return {
    id: 'test-script',
    defaultMode: 'inPerson',
    events: [
      {
        type: 'line',
        speakerId: 'marla',
        text: "Excuse me. You are not authorized to take a break right now Shipwright!"
      }
    ]
  }
}