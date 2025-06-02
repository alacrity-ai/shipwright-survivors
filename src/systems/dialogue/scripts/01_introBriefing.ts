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
        text: "Whoa there! You're awake!",
      },
      {
        type: 'pause',
        durationMs: 500,
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: "I'm going to turn on your control system. One second...",
      },
      {
        type: 'command',
        run: () => {
          audioManager.play('assets/sounds/sfx/power_on.wav');
        },
      },
      {
        type: 'pause',
        durationMs: 1000,
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Okay, the helm should be responsive! Try using W, A, S, or D.',
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
        text: "Good! Now let's verify you still remember how to use your weapons.",
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: "Try aiming with the mouse, and firing with the Left mouse button...",
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
        text: "Excellent! I'm detecting potential reclaimants entering the area.",
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: "Track them down and reclaim their assets.",
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
