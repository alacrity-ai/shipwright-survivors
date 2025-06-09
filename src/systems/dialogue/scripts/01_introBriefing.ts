// src/systems/dialogue/registry/scripts/01_introBriefing.ts

import type { DialogueScript } from '@/systems/dialogue/interfaces/DialogueScript';
import type { DialogueContext } from '@/systems/dialogue/interfaces/DialogueContext';

import { missionResultStore } from '@/game/missions/MissionResultStore';
import { awaitCondition } from '@/systems/dialogue/utils/awaitCondition';
import { PlayerResources } from '@/game/player/PlayerResources';
import { PlayerPassiveManager } from '@/game/player/PlayerPassiveManager';

const playerResources = PlayerResources.getInstance();

import { flags } from '@/game/player/PlayerFlagManager';
import { audioManager } from '@/audio/Audio';

export function createIntroBriefingScript(ctx: DialogueContext): DialogueScript {
  const { inputManager, waveSpawner, playerShip } = ctx;
  if (!inputManager) {
    throw new Error('Input manager is required for intro briefing');
  }
  if (!waveSpawner) {
    throw new Error('Wave spawner is required for intro briefing');
  }
  if (!playerShip) {
    throw new Error('Player ship is required for intro briefing');
  }

  return {
    id: 'intro-briefing',
    defaultMode: 'transmission',
    events: [
      // Check flag to end early
      {
        type: 'endIf',
        condition: () => flags.has('mission.intro-briefing.complete'),
      },
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
        text: "Greetings, Shipwright Second Class. Assessing your consciousness status...",
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
        text: "Activating Engine Systems. Please do remain stationary until accidents are formally authorized.",
      },
      {
        type: 'command',
        run: () => {
          audioManager.play('assets/sounds/sfx/ship/computing_00.wav', 'sfx');
        },
      },
      {
        type: 'pause',
        durationMs: 500,
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Thruster interface enabled. W, A, S, D keys mapped—pending your keyboard competency certification...',
      },
      {
        type: 'command',
        run: () => {
          inputManager.enableInput();
          inputManager.disableKey('MouseLeft');
          inputManager.disableKey('Tab');
          inputManager.disableKey('Escape');
        },
      },
      {
        type: 'command',
        run: () => {
          return new Promise<void>((resolve) => {
            const waitForInput = () => {
              if (
                inputManager.isKeyPressed('KeyW') ||
                inputManager.isKeyPressed('KeyA') ||
                inputManager.isKeyPressed('KeyS') ||
                inputManager.isKeyPressed('KeyD')
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
        type: 'command',
        run: () => {
          return new Promise<void>((resolve) => {
            const waitForInput = () => {
              if (inputManager.wasMouseMoved()) {
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
        text: "Please Left-click to discharge kinetic discouragement...",
      },
      // Enable left click
      {
        type: 'command',
        run: () => {
          inputManager.enableKey('MouseLeft');
          inputManager.enableKey('Escape');
        },
      },
      {
        type: 'command',
        run: () => {
          return new Promise<void>((resolve) => {
            const waitForInput = () => {
              if (inputManager.isMouseLeftPressed()) {
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
      // Instruct user to use mousewheel or R/T to zoom in and out, instruction should be witty
      {
        type: 'line',
        speakerId: 'carl',
        text: "Use the scroll wheel or R/T to zoom in and out. Don't break it.",
      },
      {
        type: 'command',
        run: () => {
          return new Promise<void>((resolve) => {
            const waitForInput = () => {
              if (
                inputManager.wasScrollWheelUp() || 
                inputManager.wasScrollWheelDown() || 
                inputManager.isKeyPressed('KeyR') || 
                inputManager.isKeyPressed('KeyT')
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
      // Express affirmation for using the zoom functionality, sarcastically
      {
        type: 'line',
        speakerId: 'carl',
        text: "Zoom functionality confirmed. Your biomechanics are improving... Slightly.",
      },
      {
        type: 'command',
        run: () => {
          waveSpawner.start();
        },
      },
      {
        type: 'command',
        run: () => {
          audioManager.play('assets/sounds/sfx/ship/computing_00.wav', 'sfx');
        },
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
      // Wait 3000ms
      {
        type: 'pause',
        durationMs: 3000,
      },
      // Hide UI
      {
        type: 'hideUI',
      },
      {
        type: 'command',
        run: () => {
          return awaitCondition(() => missionResultStore.get().enemiesDestroyed >= 1);
        },
      },
      // Show UI
      {
        type: 'showUI',
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Enemy presence reduced. Efficiency confirmed. Continue extraction until Entropium reserves reach acceptable thresholds.',
      },
      // Wait 2000ms
      {
        type: 'pause',
        durationMs: 2000,
      },
      // Hide UI
      {
        type: 'hideUI',
      },
      {
        type: 'command',
        run: () => {
          return awaitCondition(() => playerResources.getCurrency() >= 80);
        },
      },
      // Show UI
      {
        type: 'showUI',
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Entropium extraction threshold reached. Your contract remains marginally unbroken.',
      },  
      {
        type: 'command',
        run: () => {
          audioManager.play('assets/sounds/sfx/ship/computing_00.wav', 'sfx');
        },
      },
      // Dialogue prompting user that ship building module has been activated and to press Tab
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Shipbuilding module activated. Press Tab to access the module.',
        options: {
          side: 'right',
        },
      },
      // Unlock tab key
      {
        type: 'command',
        run: () => {
          inputManager.enableKey('Tab');
        },
      },
      {
        type: 'command',
        run: () => {
          return new Promise<void>((resolve) => {
            const waitForInput = () => {
              if (inputManager.wasKeyJustPressed('Tab')) {
                resolve();
              } else {
                requestAnimationFrame(waitForInput);
              }
            };
            waitForInput();
          });
        },
      },
      // Prompt the user to place a block on the ship
      // Lock the tab key so the user can't close the menu early
      {
        type: 'command',
        run: () => {
          inputManager.disableKey('Tab');
        },
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Place a block on the ship by clicking on the block in the menu and then clicking on the ship.',
        options: {
          side: 'right',
        },
      },
      {
        type: 'command',
        run: () => {
          return awaitCondition(() => missionResultStore.get().blockPlacedCount >= 1);
        },
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Block placement confirmed.',
        options: {
          side: 'right',
        },
      },
      // Instruct the user to rotate the block by pressing spacebar
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Demonstrate your ability to rotate the block by pressing the Spacebar.',
        options: {
          side: 'right',
        },
      },
      {
        type: 'command',
        run: () => {
          return new Promise<void>((resolve) => {
            const waitForInput = () => {
              if (inputManager.wasKeyJustPressed('Space')) {
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
        text: 'Rotation confirmed.',
        options: {
          side: 'right',
        },
      },
      // Sarcastic compliment on the user's ability to rotate the block
      {
        type: 'line',
        speakerId: 'carl',
        text: 'You rotated the block. I am... impressed.',
        options: {
          side: 'right',
        },
      },
      // Blocks can also be removed with right click (No check, just instruction)
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Blocks can be removed by right-clicking on them. You will be refunded for half the original cost.',
        options: {
          side: 'right',
        },
      },
      // Wait 1500ms
      {
        type: 'pause',
        durationMs: 1500,
      },
      // Instruct user to close the shipbuilding menu with Tab or Escape
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Close the shipbuilding menu by pressing Tab or Escape.',
        options: {
          side: 'right',
        },
      },
      // Unlock escape and tab keys
      {
        type: 'command',
        run: () => {
          inputManager.enableKey('Tab');
          inputManager.enableKey('Escape');
        },
      },
      {
        type: 'command',
        run: () => {
          return new Promise<void>((resolve) => {
            const waitForInput = () => {
              if (inputManager.wasKeyJustPressed('Tab') || inputManager.wasKeyJustPressed('Escape')) {
                resolve();
              } else {
                requestAnimationFrame(waitForInput);
              }
            };
            waitForInput();
          });
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
        durationMs: 500,
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
      {
        type: 'command',
        run: () => {
          console.log('Added passive point!')
          PlayerPassiveManager.getInstance().addPassivePoints(1);
        },
      },
      {
        type: 'command',
        run: () => {
          flags.set('mission.intro-briefing.complete');
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
      }
    ],
  };
}
