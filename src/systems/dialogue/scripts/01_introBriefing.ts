// src/systems/dialogue/registry/scripts/01_introBriefing.ts

import type { DialogueScript } from '@/systems/dialogue/interfaces/DialogueScript';
import type { InputManager } from '@/core/InputManager';

import { flags } from '@/game/player/PlayerFlagManager';
import { audioManager } from '@/audio/Audio';

export function createIntroBriefingScript(inputManager: InputManager): DialogueScript {
  return {
    id: 'intro-briefing',
    defaultMode: 'transmission',
    events: [
      {
        type: 'command',
        run: () => {
          inputManager.disableInput();
        },
      },
      {
        type: 'pause',
        durationMs: 1000,
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: "Greetings, Shipwright Second Class. Assessing pilot consciousness status...",
      },
      {
        type: 'pause',
        durationMs: 500,
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: "Neural activity meets minimum viable contractor threshold. Initiating pre-flight checks.",
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: "Activating Engine Systems. Please remain stationary until accidents are formally authorized.",
      },
      {
        type: 'command',
        run: () => {
          audioManager.play('assets/sounds/sfx/power_on.wav');
        },
      },
      {
        type: 'pause',
        durationMs: 500,
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Thruster interface enabled. W, A, S, D keys mapped—pending your keyboard competency certification.',
      },
      {
        type: 'command',
        run: () => {
          inputManager.enableInput();
        },
      },
      {
        type: 'command',
        run: () => {
          return new Promise<void>((resolve) => {
            const waitForInput = () => {
              if (
                inputManager.wasKeyJustPressed('KeyW') ||
                inputManager.wasKeyJustPressed('KeyA') ||
                inputManager.wasKeyJustPressed('KeyS') ||
                inputManager.wasKeyJustPressed('KeyD')
              ) {
                resolve();
              } else {
                requestAnimationFrame(waitForInput);
              }
            };
            waitForInput();
          });
        },
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: "Mobility nominal. Unexpectedly, your motor cortex appears to be functional.",
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: "Firing vector locked. Wiggle the mouse—yes, the rodent-shaped input relic—to express hostility.",
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: "Please Left-click to discharge kinetic discouragement...",
      },
      {
        type: 'command',
        run: () => {
          return new Promise<void>((resolve) => {
            const waitForInput = () => {
              if (inputManager.wasMouseClicked()) {
                resolve();
              } else {
                requestAnimationFrame(waitForInput);
              }
            };
            waitForInput();
          });
        },
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: "Weapon discharge successful. No signs of sabotage by operator. Unexpected.",
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: "Telemetry indicates unidentified salvage targets approaching. Classification: 'reclaimable liability clusters'.",
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: "Standard procedure: convert threats into revenue. Failure to do so may impact your survivability rating.",
      },
      {
        type: 'command',
        run: () => {
          flags.set('mission.intro-briefing.complete');
        },
      },
    ],
  };
}
