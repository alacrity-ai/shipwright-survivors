// src/systems/dialogue/registry/scripts/01_introBriefing.ts

import type { DialogueScript } from '@/systems/dialogue/interfaces/DialogueScript';
import type { DialogueContext } from '@/systems/dialogue/interfaces/DialogueContext';

import { audioManager } from '@/audio/Audio';
// import { awaitCondition } from '@/systems/dialogue/utils/awaitCondition';

export function createPlanetGenericScript(ctx: DialogueContext): DialogueScript {
  const { inputManager, waveSpawner, playerShip } = ctx;
  if (!inputManager) {
    throw new Error('Input manager is required for generic planet dialogue');
  }
  if (!waveSpawner) {
    throw new Error('Wave spawner is required for generic planet dialogue');
  }
  if (!playerShip) {
    throw new Error('Player ship is required for generic planet dialogue');
  }

  return {
    id: 'planet-generic',
    defaultMode: 'transmission',
    events: [  
      {
        type: 'command',
        run: () => {
          audioManager.play('assets/sounds/sfx/ship/computing_00.wav', 'sfx');
        },
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Nobody appears to be home.',
      },
      // Wait 1000ms
      {
        type: 'pause',
        durationMs: 1000,
      },
    ],
  };
}
