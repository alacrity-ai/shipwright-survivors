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
        text: "Welcome to HQ. Please do not mistake this for a place of safety. It is merely where the paperwork lives."
      },
      {
        type: 'line',
        speakerId: 'marla',
        text: "I'm Marla Thinx, Account Liaison. My role is to observe, log, and gently discourage noncompliance. Occasionally I blink."
      },
    ]
  }
}