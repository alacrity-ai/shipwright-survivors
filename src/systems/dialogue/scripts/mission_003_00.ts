// src/systems/dialogue/registry/scripts/01_introBriefing.ts

import type { DialogueScript } from '@/systems/dialogue/interfaces/DialogueScript';
import type { DialogueContext } from '@/systems/dialogue/interfaces/DialogueContext';

import { emitPlayerVictory } from '@/core/interfaces/events/PlayerOutcomeReporter';

import { PlayerResources } from '@/game/player/PlayerResources';
import { flags } from '@/game/player/PlayerFlagManager';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { awaitCondition } from '@/systems/dialogue/utils/awaitCondition';

export function createMission003Script00(ctx: DialogueContext): DialogueScript {
  const { inputManager, waveOrchestrator, playerShip } = ctx;
  if (!inputManager) {
    throw new Error('Input manager is required for mission dialogue');
  }
  if (!waveOrchestrator) {
    throw new Error('Wave orchestrator is required for mission dialogue');
  }
  if (!playerShip) {
    throw new Error('Player ship is required for mission dialogue');
  }

  return {
    id: 'mission_003_00',
    defaultMode: 'transmission',
    events: [
      // Show UI
      // {
      //   type: 'endIf',
      //   condition: () => flags.has('mission.mission_003_00.complete'),
      // },
      {
        type: 'showUI',
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: "Deployment confirmed. SYSTEM: FERRUST. CONDITION: METALLURGICALLY HOSTILE."
      },
      // Start the waves
      {
        type: 'command',
        run: () => {
          waveOrchestrator.start();
        },
      },
      {
        type: 'pause',
        durationMs: 400,
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: "OBJECTIVE: Convert hostile scrap into Entropium. Try not to die—but either outcome generates data.",
      },
      {
        type: 'pause',
        durationMs: 400,
      },
      // Snarky final remark
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Remember: Survival is admirable. Profitability is mandatory.',
      },
      // Wait 1000ms
      {
        type: 'pause',
        durationMs: 700,
      },
      // Hide UI
      {
        type: 'hideUI',
      },
      {
        type: 'async',
        dialogue: [
          {
            type: 'command',
            run: () => {
              return awaitCondition(() => missionResultStore.get().enemiesDestroyed >= 5);
            }, 
          },
          {
            type: 'showUI',
          },
          {
            type: 'line',
            speakerId: 'carl',
            text: "Five kills? I'll adjust your obituary.",
          },
          {
            type: 'pause',
            durationMs: 1000,
          },
          {
            type: 'hideUI',
          },
        ],
      }, 
      {
        type: 'async',
        dialogue: [
          {
            type: 'command',
            run: () => {
              return awaitCondition(() => missionResultStore.get().blocksUnlocked.length >= 1);
            }, 
          },
          {
            type: 'showUI',
          },
          {
            type: 'line',
            speakerId: 'carl',
            text: "BLOCK UNLOCKED! Please be aware that all new technology is the intellectual property of Deep Void.",
          },
          {
            type: 'pause',
            durationMs: 200,
          },
          {
            type: 'hideUI',
          },
        ]
      },
      {
        type: 'async',
        dialogue: [
          {
            type: 'command',
            run: () => {
              return awaitCondition(() => missionResultStore.get().blocksLost >= 1);
            }, 
          },
          {
            type: 'showUI',
          },
          {
            type: 'line',
            speakerId: 'carl',
            text: "Please avoid asset loss. Repair damaged blocks in Ship Building Console before damage becomes permanent.",
          },
          {
            type: 'pause',
            durationMs: 1000,
          },
          {
            type: 'hideUI',
          },
        ]
      },
      {
        type: 'async',
        dialogue: [
          {
            type: 'command',
            run: () => {
              return awaitCondition(() => missionResultStore.get().enemiesDestroyed >= 20);
            },
          },
          { type: 'showUI' },
          {
            type: 'line',
            speakerId: 'carl',
            text: "Twenty construct terminations logged. Exceeding expectations will not result in a raise.",
          },
          { type: 'pause', durationMs: 1000 },
          { type: 'hideUI' },
        ],
      },
      {
        type: 'async',
        dialogue: [
          {
            type: 'command',
            run: () => {
              return awaitCondition(() => missionResultStore.get().enemiesDestroyed >= 50);
            },
          },
          { type: 'showUI' },
          {
            type: 'line',
            speakerId: 'carl',
            text: "Fifty? Very efficient. Disturbingly so. Filing a concern.",
          },
          { type: 'pause', durationMs: 1000 },
          { type: 'hideUI' },
        ],
      },
      {
        type: 'async',
        dialogue: [
          {
            type: 'command',
            run: () => {
              return awaitCondition(() => PlayerResources.getInstance().getCurrency() >= 1000);
            },
          },
          { type: 'showUI' },
          {
            type: 'line',
            speakerId: 'carl',
            text: "Reminder: All Entropium is property of Deep Void Salvage Co. Unauthorized enrichment is discouraged.",
          },
          { type: 'pause', durationMs: 1000 },
          { type: 'hideUI' },
        ],
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
        text: "Detecting massive kinetic disturbance. Signature: industrial-grade excavation unit... with delusions of grandeur.",
      },
      // Wait 1000ms
      {
        type: 'pause',
        durationMs: 1000,
      },
      // Executron introduction
      {
        type: 'line',
        speakerId: 'executron',
        text: "I WAS BUILT TO DIG. THEN THEY GAVE ME LEGS. BIG MISTAKE.",
      },
      // Wait 1000ms
      {
        type: 'pause',
        durationMs: 1000,
      },
      // Executron boasts
      {
        type: 'line',
        speakerId: 'executron',
        text: "YOUR SHIP LOOKS LIKE A LOW-YIELD ASTEROID. PREPARE FOR AUTOMATED EXTRACTION.",
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
          flags.set('mission.mission_003_00.complete');
          flags.set('mission.mission_004_00.unlocked');
        },
      },
      // Show UI
      {
        type: 'showUI',
      },
      // Executron death line
      {
        type: 'line',
        speakerId: 'executron',
        text: "SYSTEM FAILURE. CORE MELTDOWN IMMINENT. I REGRET NOTHING... EXCEPT THE LEGS.",
      },
      // Wait 2000ms
      {
        type: 'pause',
        durationMs: 2000,
      },
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Surprising! I was expecting something more... conventional.',
      },
      // Urges player to continue fighting
      {
        type: 'line',
        speakerId: 'carl',
        text: 'Readings indicate more powerful hostiles inbound.',
      },
      // // End the mission
      // {
      //   type: 'command',
      //   run: () => {
      //     emitPlayerVictory();
      //   },
      // }
    ],
  };
}
