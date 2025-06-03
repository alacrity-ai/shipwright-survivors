// src/systems/dialogue/registry/scripts/01_introBriefing.ts

import type { DialogueScript } from '@/systems/dialogue/interfaces/DialogueScript';
import type { DialogueContext } from '@/systems/dialogue/interfaces/DialogueContext';

import { awaitCondition } from '@/systems/dialogue/utils/awaitCondition';

export function createMissionGenericScript(ctx: DialogueContext): DialogueScript {
  const { inputManager, waveSpawner, playerShip } = ctx;
  if (!inputManager) {
    throw new Error('Input manager is required for generic mission dialogue');
  }
  if (!waveSpawner) {
    throw new Error('Wave spawner is required for generic mission dialogue');
  }
  if (!playerShip) {
    throw new Error('Player ship is required for generic mission dialogue');
  }

  return {
    id: 'mission-generic',
    defaultMode: 'transmission',
    events: [
      // Show UI
      {
        type: 'showUI',
      },
      // Start the waves
      {
        type: 'command',
        run: () => {
          waveSpawner.start();
        },
      },
      // Prompt user to defeat all incoming waves in order to receive permission to return to headquarters
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Survive incoming waves in order to receive permission to return to headquarters.',
      },
      // Snarky final remark
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Remember: Always build toward revenue.',
      },
      // Wait 1000ms
      {
        type: 'pause',
        durationMs: 1000,
      },
      // Hide UI
      {
        type: 'hideUI',
      },
      // Wait until wave spawner is on boss wave
      {
        type: 'command',
        run: () => {
          return awaitCondition(() => waveSpawner.isBossWaveActive());
        },
      },
      // Show UI
      {
        type: 'showUI',
      },
      // Notify user that a powerful hostile has been detected, proceed to center coordinates
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Powerful hostile detected. Proceed to center coordinates.',
      },
      // Wait 1000ms
      {
        type: 'pause',
        durationMs: 1000,
      },
      // Snarky remark about survival probability being near 0
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Survival probability: 0.0001%. But hey, you never know.',
      },
      // Wait 1000ms
      {
        type: 'pause',
        durationMs: 1000,
      },
      {
        type: 'line',
        speakerId: 'crazy-moe',
        text: "WELL WHADDYA KNOW! A flyin' lunchbox full'a alloys!",
      },
      // Wait 1000ms
      {
        type: 'pause',
        durationMs: 1000,
      },
      // Crazy moe says: "I'ma gonna strip you for parts!"
      {
        type: 'line',
        speakerId: 'crazy-moe',
        text: "Heh—I'ma pop yer cockpit like a soda tab and sniff the coolant fumes!",
      },
      // Wait 1000ms
      {
        type: 'pause',
        durationMs: 1000,
      },
      // Hide UI
      {
        type: 'hideUI',
      },
      // Wait until boss is defeated
      {
        type: 'command',
        run: () => {
          return awaitCondition(() => waveSpawner.shouldCompleteMission());
        },
      },
      // Show UI
      {
        type: 'showUI',
      },
      {
        type: 'line',
        speakerId: 'crazy-moe',
        text: "Y'got me! Sweet entropy, I see the light—*AND SHE'S MADE OF REBAR AND RADIATION!*",
      },
      // Wait 1000ms
      {
        type: 'pause',
        durationMs: 2000,
      },
    ],
  };
}
