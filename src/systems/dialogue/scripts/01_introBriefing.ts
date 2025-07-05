// src/systems/dialogue/registry/scripts/01_introBriefing.ts

import type { DialogueScript } from '@/systems/dialogue/interfaces/DialogueScript';
import type { DialogueContext } from '@/systems/dialogue/interfaces/DialogueContext';

import { spawnCurrencyExplosion } from '@/systems/pickups/helpers/spawnCurrencyExplosion';
import { shakeCamera } from '@/core/interfaces/events/CameraReporter';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { getBlockType } from '@/game/blocks/BlockRegistry';
import { MiniMapIcons } from '@/ui/utils/MiniMapIcons';
import { emitPlayerVictory } from '@/core/interfaces/events/PlayerOutcomeReporter';
import { disablePickupDrops, enablePickupDrops } from '@/core/interfaces/events/PickupSpawnReporter';
import { lockBlockQueue, unlockBlockQueue } from '@/core/interfaces/events/BlockQueueReporter';
import { lockAllButtons, unlockAttachButton, unlockAllButtons } from '@/core/interfaces/events/BlockDropDecisionMenuReporter';
import { createScreenEdgeIndicator, removeScreenEdgeIndicator } from '@/core/interfaces/events/ScreenEdgeIndicatorReporter';
import { 
  emitAttachAllButtonShow,
  emitAttachAllButtonHide,
  emitMetersShow, 
  emitHudShowAll,
  emitBlockQueueShow,
  emitHudShow,
  emitMinimapShow,
  emitExperienceBarShow
 } from '@/core/interfaces/events/HudReporter';

import { isWithinRange } from '@/systems/ai/helpers/ShipUtils';

import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
import { ShipBlueprintRegistry } from '@/game/ship/ShipBlueprintRegistry';

import { missionResultStore } from '@/game/missions/MissionResultStore';
import { awaitCondition } from '@/systems/dialogue/utils/awaitCondition';
import { PlayerResources } from '@/game/player/PlayerResources';
import { PlayerPassiveManager } from '@/game/player/PlayerPassiveManager';

import { createAfterBurnerCoachMark } from '@/rendering/coachmarks/helpers/createAfterBurnerCoachMark';
import { createOpenBlockMenuCoachMark } from '@/rendering/coachmarks/helpers/createOpenBlockMenuCoachMark';
import { createToggleFiringModeCoachMark } from '@/rendering/coachmarks/helpers/createToggleFiringModeCoachMark';
import { createAimCoachMark } from '@/rendering/coachmarks/helpers/createAimCoachMark';
import { createFirePrimaryCoachMark } from '@/rendering/coachmarks/helpers/createFirePrimaryCoachMark';
import { createMoveCoachMark } from '@/rendering/coachmarks/helpers/createMoveCoachMark';
import { createOpenTradePostCoachMark } from '@/rendering/coachmarks/helpers/createOpenTradePostCoachMark';
import { createZoomCoachMark } from '@/rendering/coachmarks/helpers/createZoomCoachMark';

import { flags } from '@/game/player/PlayerFlagManager';
import { audioManager } from '@/audio/Audio';

import { GlobalEventBus } from '@/core/EventBus';
import { spawnWave } from '@/core/interfaces/events/WaveSpawnReporter';
import { v4 } from 'uuid';

// Unique wave name
const waveId = `dialogue-wave-${v4()}`;

const playerResources = PlayerResources.getInstance();

export function createIntroBriefingScript(ctx: DialogueContext): DialogueScript {
  const { inputManager, waveOrchestrator, playerShip, coachMarkManager } = ctx;
  if (!inputManager) {
    throw new Error('Input manager is required for intro briefing');
  }
  if (!waveOrchestrator) {
    throw new Error('Wave orchestrator is required for intro briefing');
  }
  if (!playerShip) {
    throw new Error('Player ship is required for intro briefing');
  }
  if (!coachMarkManager) {
    throw new Error('Coach mark manager is required for intro briefing');
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
          // Disable Actions
          inputManager.disableAllActions();

          // Disable Pickup Drops
          disablePickupDrops();
          
          // Unlock starter ship and set as active ship
          const playerShipCollection = PlayerShipCollection.getInstance();
          playerShipCollection.discover('SW-1 Standard Issue');
          playerShipCollection.unlock('SW-1 Standard Issue');
          const sw1Definition = ShipBlueprintRegistry.getByName('sw1');
          playerShipCollection.setActiveShip(sw1Definition!);
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
        type: 'command',
        run: () => {
          audioManager.play('assets/sounds/sfx/ship/computing_00.wav', 'sfx');
          shakeCamera(10, 1, 10);
          emitMetersShow();
        },
      },
      {
        type: 'pause',
        durationMs: 500,
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Thruster interface enabled. Please engage your mobility system to pass competency certification...',
      },
      {
        type: 'command',
        run: () => {
          inputManager.enableAllActions();
          inputManager.disableAction('firePrimary');
          inputManager.disableAction('openShipBuilder');
          inputManager.disableAction('pause');
        },
      },
      // Display W, A, S, D in classic T-layout
      {
        type: 'command',
        run: () => {
          createMoveCoachMark(coachMarkManager, 200, 400);
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
                inputManager.isKeyPressed('KeyD') ||
                inputManager.isLeftStickMoved()
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
      // Remove the WASD coachmarks
      {
        type: 'command',
        run: () => {
          coachMarkManager.clear();
        },
      },
      // Teach afterburner (Shift / LB)
      {
        type: 'line',
        speakerId: 'carl',
        text: "Supersonic priveleges granted. Engage your afterburner to confirm.",
      },
      {
        type: 'command',
        run: () => {
          createAfterBurnerCoachMark(coachMarkManager, 200, 400);
        },
      },
      {
        type: 'command',
        run: () => {
          return new Promise<void>((resolve) => {
            const waitForInput = () => {
              if (inputManager.isActionPressed('afterburner')) {
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
        text: "Acceleration spike detected. Try not to hit anything valuable—like me.",
      },
      // Clear coachmarks
      {
        type: 'command',
        run: () => {
          coachMarkManager.clear();
        },
      },
      // Wait 300ms
      {
        type: 'pause',
        durationMs: 300,
      },
      // Excellent, I am now activating your radar system
      {
        type: 'line',
        speakerId: 'carl',
        text: "Excellent. I am now activating your radar system. Please remain still while I calibrate your peripheral vision...",
      },
      // Play sound effect
      {
        type: 'command',
        run: () => {
          audioManager.play('assets/sounds/sfx/ship/system_enable_00.wav', 'sfx');
        },
      },
      // Wait 300ms
      {
        type: 'pause',
        durationMs: 300,
      },
      // Show minimap
      {
        type: 'command',
        run: () => {
          emitMinimapShow();
          // Add ScreenEdge indicator at planet coordinates
          const iconImage = MiniMapIcons.createIcon('planet', 32); // Size is noop here
          createScreenEdgeIndicator('planet', -5000, -6000, { icon: iconImage });
        },
      },
      // Destination has been marked on your radar, Proceed to coordinates for weapon system training
      {
        type: 'line',
        speakerId: 'carl',
        text: "Destination has been marked on your radar. Proceed to coordinates for weapon system training.",
      },
      // Wait 300ms
      {
        type: 'pause',
        durationMs: 300,
      },
      // Try not to crash into too many spatial bodies during your trip
      {
        type: 'line',
        speakerId: 'carl',
        text: "Try not to crash into too many spatial bodies during your trip. It's not good for your health.",
      },
      // Verify player has reached destination
      {
        type: 'command',
        run: () => {
          return awaitCondition(() => (isWithinRange(playerShip.getTransform().position, { x: -5000, y: -6000 }, 1400)));
        },
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: "Trading Post reached! Please hold while I add some initial salvage to your queue.",
      },
      // Show the block queue
      {
        type: 'command',
        run: () => {
          emitBlockQueueShow();
          lockBlockQueue();
        },
      },
      {
        type: 'command',
        run: () => {
          PlayerResources.getInstance().enqueueBlockToFront(getBlockType('hull1')!);
          audioManager.play('assets/sounds/sfx/ship/attach_00.wav', 'sfx');
          const { x, y } = playerShip.getTransform().position;
          createLightFlash(x, y, 600, 1.0, 0.4, '#ffffff');
        },
      },
      // Wait 200ms
      {
        type: 'pause',
        durationMs: 200,
      },
      // Enqueue the same block again
      {
        type: 'command',
        run: () => {
          PlayerResources.getInstance().enqueueBlockToFront(getBlockType('hull1')!);
          audioManager.play('assets/sounds/sfx/ship/attach_00.wav', 'sfx');
          const { x, y } = playerShip.getTransform().position;
          createLightFlash(x, y, 600, 1.0, 0.4, '#ffffff');
        },
      },
      // Wait 200ms
      {
        type: 'pause',
        durationMs: 200,
      },
      // Enqueue the same block again
      {
        type: 'command',
        run: () => {
          PlayerResources.getInstance().enqueueBlockToFront(getBlockType('hull1')!);
          audioManager.play('assets/sounds/sfx/ship/attach_00.wav', 'sfx');
          const { x, y } = playerShip.getTransform().position;
          createLightFlash(x, y, 600, 1.0, 0.4, '#ffffff');
        },
      },
      // Wait 300ms
      {
        type: 'pause',
        durationMs: 300,
      },
      // Create coachmark for transmission
      {
        type: 'command',
        run: () => {
          createOpenTradePostCoachMark(coachMarkManager, 200, 400);
        },
      },
      // Unlock player input
      {
        type: 'command',
        run: () => {
          inputManager.enableAction('firePrimary');
        },
      },
      // Instruct player to purchase a turret with their salvage
      {
        type: 'line',
        speakerId: 'carl',
        text: "Purchase a Turret from the Tradepost to arm your ship.",
      },
      // Wait for block count to be less than 3, indicating that they traded at the trade post, and that they have closed it
      {
        type: 'command',
        run: () => {
          return awaitCondition(() => (flags.has('mission.intro-briefing.tradepost-closed') && playerResources.getBlockCount() < 3));
        },
      },
      // Disable firePrimary
      {
        type: 'command',
        run: () => {
          inputManager.disableAction('firePrimary');
        },
      },
      // Clear coach mark
      {
        type: 'command',
        run: () => {
          coachMarkManager.clear();
        },
      },
      {
        type: 'command',
        run: () => {
          createOpenBlockMenuCoachMark(coachMarkManager, 200, 400);
        },
      },
      // Instruct player to open the ship builder console
      {
        type: 'line',
        speakerId: 'carl',
        text: "Open the ship builder console to attach your new Turret.",
      },
      // Unlock the input action
      {
        type: 'command',
        run: () => {
          inputManager.enableAction('openShipBuilder');
          lockAllButtons(); // Lock all the buttons in the shipbuilder menu, but the attach button
          unlockAttachButton();
        },
      },
      // Wait for the ship builder to be opened
      {
        type: 'command',
        run: () => {
          return new Promise<void>((resolve) => {
            const waitForInput = () => {
              if (inputManager.wasActionJustPressed('openShipBuilder')) {
                resolve();
              } else {
                requestAnimationFrame(waitForInput);
              }
            };
            waitForInput();
          });
        },
      },
      // Clear ScreenEdge indicator
      {
        type: 'command',
        run: () => {
          removeScreenEdgeIndicator('planet');
        },
      },
      // Clear coachmarks
      {
        type: 'command',
        run: () => {
          coachMarkManager.clear();
        },
      },
      // Instruct the player to place the block using the attach button
      {
        type: 'line',
        speakerId: 'carl',
        text: "Use the 'Attach' button to place the block on your ship.",
      },
      // Unlock fireprimary
      {
        type: 'command',
        run: () => {
          inputManager.enableAction('firePrimary');
        },
      },
      // Verify that a block has been attached
      {
        type: 'command',
        run: () => {
          return awaitCondition(() => missionResultStore.get().blockPlacedCount >= 1);
        },
      },
      // Lock fire primary
      {
        type: 'command',
        run: () => {
          inputManager.disableAction('firePrimary');
        },
      },
      // Give some sarcastic encouragement like "Wow! You placed a block... I am impressed"
      {
        type: 'line',
        speakerId: 'carl',
        text: "Block placement confirmed. Your ship's structural integrity has been bolstered.",
      },
      // Clear coachmark
      {
        type: 'command',
        run: () => {
          coachMarkManager.clear();
        },
      },
      // Unlock the block queue
      {
        type: 'command',
        run: () => {
          unlockBlockQueue();
        },
      },
      {
        type: 'pause',
        durationMs: 300,
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: "Firing vector locked. Wiggle your aiming controls to express your hostility.",
      },
      {
        type: 'command',
        run: () => {
          createAimCoachMark(coachMarkManager, 200, 400);

          return new Promise<void>((resolve) => {
            const waitForInput = () => {
              if (inputManager.wasMouseMoved() || inputManager.isRightStickMoved()) {
                coachMarkManager.clear(); // Clear all active marks
                resolve();
              } else {
                requestAnimationFrame(waitForInput);
              }
            };
            waitForInput();
          });
        },
      },
      // Clear the coachmark
      {
        type: 'command',
        run: () => {
          coachMarkManager.clear();
          audioManager.play('assets/sounds/sfx/ui/activate_01.wav', 'sfx');
          shakeCamera(10, 1, 10);
        },
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: "Weapon controls enabled. discharge kinetic discouragement...",
      },
      {
        type: 'command',
        run: () => {
          inputManager.enableAction('firePrimary');
          inputManager.enableAction('pause');

          createFirePrimaryCoachMark(coachMarkManager, 200, 400);
        },
      },
      {
        type: 'command',
        run: () => {
          return new Promise<void>((resolve) => {
            const waitForInput = () => {
              if (inputManager.isActionPressed('firePrimary')) {
                coachMarkManager.clear();
                resolve();
              } else {
                requestAnimationFrame(waitForInput);
              }
            };
            waitForInput();
          });
        },
      },
      // Clear the coachmark
      {
        type: 'command',
        run: () => {
          coachMarkManager.clear();
        },
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: "Weapon discharge successful. No signs of sabotage by operator. Unexpected.",
      },
      // Wait 300ms
      {
        type: 'pause',
        durationMs: 300,
      },
      // Instruct user to press X to toggle between firing modes
      {
        type: 'line',
        speakerId: 'carl',
        text: "Demonstrate ability to toggle firing mode. 'Synced' for sustained fire, 'Sequence' for burst fire.",
      },
      // Show hud
      {
        type: 'command',
        run: () => {
          emitHudShow();
        },
      },
      // Make sure KeyX is enabled
      {
        type: 'command',
        run: () => {
          inputManager.enableKey('KeyX');
        },
      },
      // Show X Key Coachmark
      {
        type: 'command',
        run: () => {
          createToggleFiringModeCoachMark(coachMarkManager, 200, 400);
        },
      },
      {
        type: 'command',
        run: () => {
          return new Promise<void>((resolve) => {
            const waitForInput = () => {
              if (inputManager.isActionPressed('switchFiringMode')) {
                resolve();
              } else {
                requestAnimationFrame(waitForInput);
              }
            };
            waitForInput();
          });
        },
      },
      // Clear the coachmark
      {
        type: 'command',
        run: () => {
          coachMarkManager.clear();
        },
      },
      // Wait 200ms
      {
        type: 'pause',
        durationMs: 200,
      },
      // Instruct user to use mousewheel or R/T to zoom in and out, instruction should be witty
      {
        type: 'line',
        speakerId: 'carl',
        text: "Demonstrate usage of your viewport zoom controls...",
      },
      // Scrollsheel mouse coachmark
      {
        type: 'command',
        run: () => {
          createZoomCoachMark(coachMarkManager, 200, 400);
        },
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
                inputManager.isKeyPressed('KeyT') ||
                (inputManager.wasGamepadAliasJustPressed('dpadUp') || inputManager.wasGamepadAliasJustPressed('dpadDown'))
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
      // Clear the coachmark
      {
        type: 'command',
        run: () => {
          coachMarkManager.clear();
        },
      },
      // Express affirmation for using the zoom functionality, sarcastically
      {
        type: 'line',
        speakerId: 'carl',
        text: "Zoom functionality confirmed. Your biomechanics are improving...",
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
        text: "Telemetry indicates unidentified salvage targets approaching.",
      },
      {
        type: 'command',
        run: () => {
          const waveTag = `intro_briefing_wave_${Date.now()}`;

          // Track completion
          let isComplete = false;
          const handler = (data: { tag: string }) => {
            if (data.tag === waveTag) {
              isComplete = true;
            }
          };

          GlobalEventBus.on('wave:completed', handler);
          // Spawn the wave
          spawnWave(waveTag, {
            spawnDistribution: 'aroundPlayer',
            duration: Infinity,
            ships: [
              { shipId: 'wave_0_00', count: 4, hunter: true, affixes: { thrustPowerMulti: 5.0, turnPowerMulti: 3.4 } },
              { shipId: 'wave_0_01', count: 4, hunter: true, affixes: { thrustPowerMulti: 5.0, turnPowerMulti: 3.4 } },
            ],
            mods: [],
            formations: [],
          });

          // Wait until it's cleared
          return awaitCondition(() => {
            if (isComplete) {
              GlobalEventBus.off('wave:completed', handler); // clean up
              return true;
            }
            return false;
          });
        },
      },
      // Notify player that wave has been cleared
      {
        type: 'line',
        speakerId: 'carl',
        text: "Salvage neutralized.",
      },
      // Tell player that entropium is being rewarded for powerup demonstration
      {
        type: 'line',
        speakerId: 'carl',
        text: "HQ has awarded you with a powerup demonstration. You will be granted 100 Entropium.",
      },
      // Create entropium explosion
      {
        type: 'command',
        run: () => {
          const { x, y } = playerShip.getTransform().position;
          spawnCurrencyExplosion({
            x,
            y,
            currencyType: 'entropium',
            totalAmount: 100,
            pickupCount: 8,
            spreadRadius: 1600,
            randomizeAmount: false,
          });
          shakeCamera(10, 1, 10);
          audioManager.play('assets/sounds/sfx/magic/magic_poof.wav', 'sfx');
        },
      },
      // Show experience bar
      {
        type: 'command',
        run: () => {
          emitExperienceBarShow();
        },
      },
      // Tell player to gather all entropium
      {
        type: 'line',
        speakerId: 'carl',
        text: "Gather all Entropium to confirm your account.",
      },
      {
        type: 'command',
        run: () => {
          return awaitCondition(() => flags.has('mission.intro-briefing.powerupMenuOpened'));
        },
      },
      // Lock all input
      {
        type: 'command',
        run: () => {
          inputManager.disableAllActions();
        },
      },
      // Show UI
      {
        type: 'showUI',
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: 'You have been granted a powerup license. Select a powerup to activate.',
      },
      // Wait 1000ms
      {
        type: 'pause',
        durationMs: 200,
      },
      // Enable all input
      {
        type: 'command',
        run: () => {
          inputManager.enableAllActions();
        },
      },
      // Wait for powerup to be selected
      {
        type: 'command',
        run: () => {
          return awaitCondition(() => flags.has('mission.intro-briefing.powerupMenuClosed'));
        },
      },
      // Wait 200ms
      {
        type: 'pause',
        durationMs: 200,
      },
      // More hostiles detected
      {
        type: 'line',
        speakerId: 'carl',
        text: "Telemetry indicates additional salvage targets approaching.",
      },
      // Enable entropium drops
      {
        type: 'command',
        run: () => {
          enablePickupDrops();
        },
      },
      // Start the waves
      {
        type: 'command',
        run: () => {
          waveOrchestrator.start();
        },
      },
      // Prompt user to defeat all incoming waves in order to receive permission to return to headquarters
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Survive all incoming waves in order to receive permission to return to headquarters.',
      },
      // Snarky final remark
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Remember: Always build toward revenue.',
      },
      // emitAttachAllButtonShow
      {
        type: 'command',
        run: () => {
          emitAttachAllButtonShow();
        },
      },
      // Update flags to prevent softlock on death
      {
        type: 'command',
        run: () => {
          flags.set('mission.intro-briefing.complete');
          flags.set('mission.mission_002.unlocked');
          flags.set('mission.mission_003_00.unlocked');
        },
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
      // Show all hud
      {
        type: 'command',
        run: () => {
          emitHudShowAll();
          // Unlock all input
          inputManager.enableAllActions();
          // Unlock refine, attach, and attach all buttons
          unlockAllButtons();
        },
      },
      // Wait until wave spawner is on boss wave
      {
        type: 'command',
        run: () => {
          return awaitCondition(() => waveOrchestrator.isBossWaveActive());
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
          return awaitCondition(() => waveOrchestrator.isActiveWaveCompleted());
        },
      },
      {
        type: 'command',
        run: () => {
          console.log('Added passive point!')
          PlayerPassiveManager.getInstance().addPassivePoints(1);
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
      // Wait 2000ms
      {
        type: 'pause',
        durationMs: 2000,
      },
      // End the mission
      {
        type: 'command',
        run: () => {
          emitPlayerVictory();
        },
      },
    ],
  };
}
