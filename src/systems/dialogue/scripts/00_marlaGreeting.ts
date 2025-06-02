// src/systems/dialogue/registry/scripts/00_marlaGreeting.ts

import type { DialogueScript } from '@/systems/dialogue/interfaces/DialogueScript';

import { flags } from '@/game/player/PlayerFlagManager';

export const marlaGreeting: DialogueScript = {
  id: 'marla-greeting',
  events: [
    {
      type: 'line',
      speakerId: 'marla-thinx',
      text: 'Welcome back, pilot.',
    },
    {
      type: 'line',
      speakerId: 'marla-thinx',
      text: 'The board wants to see you as soon as possible.',
    },
    {
      type: 'command',
      run: () => {
        flags.set('breakroom.marla-greeting.complete');
      },
    },
  ],
};
