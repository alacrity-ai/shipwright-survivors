// src/systems/dialogue/registry/scripts/01_introBriefing.ts

import type { DialogueScript } from '@/systems/dialogue/interfaces/DialogueScript';
import type { DialogueContext } from '@/systems/dialogue/interfaces/DialogueContext';

import { emitPlayerVictory } from '@/core/interfaces/events/PlayerOutcomeReporter';
import { spawnBossArena } from '@/core/interfaces/events/BossReporter';
import { shakeCamera } from '@/core/interfaces/events/CameraReporter';

import { purgeNonPlayerShips } from '@/systems/culling/purgeNonPlayerShips';
import { clearAllPickups } from '@/core/interfaces/events/PickupSpawnReporter';

import { awaitCondition } from '@/systems/dialogue/utils/awaitCondition';

import { BossManager } from '@/game/boss/BossManager';
import { BossRegistry } from '@/game/boss/registry/BossRegistry';
import { ArenaManager } from '@/game/arena/ArenaManager';
import { missionResultStore } from '@/game/missions/MissionResultStore';

export function createMissionGenericScript(ctx: DialogueContext): DialogueScript {
  const { inputManager, waveOrchestrator, playerShip } = ctx;
  if (!inputManager) {
    throw new Error('Input manager is required for generic mission dialogue');
  }
  if (!waveOrchestrator) {
    throw new Error('Wave orchestrator is required for generic mission dialogue');
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
          waveOrchestrator.start();
        },
      },
      // Wait 1500ms
      {
        type: 'pause',
        durationMs: 1500
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
          return awaitCondition(() => waveOrchestrator.areAllWavesCompleted());
        },
      },
      // Call event
      {
        type: 'command',
        run: () => {
          shakeCamera(12, 4, 10);
          purgeNonPlayerShips();
          clearAllPickups();
          const { x, y } = playerShip.getTransform().position;
          spawnBossArena({
            center: [x, y],
            radius: 2220,
            initialState: 1,
            formingDuration: 1.0
          });
        },
      },
      // Wait 1000ms
      {
        type: 'pause',
        durationMs: 1000,
      },
      // Spawn Boss
      {
        type: 'command',
        run: () => {
          // TODO : Ultimately when this is implemented, replace hard coded flamelord with the boss field in the mission definition
          const bossManager = BossManager.getInstance();
          const bossOrchestrator = bossManager.getOrchestrator();
          const bossDefinition = BossRegistry.get('flame_lord');

          const arenaManager = ArenaManager.getInstance();
          const [x, y] = arenaManager.getArenaCenter();
          bossOrchestrator.spawnBoss(bossDefinition, { x, y });
        },
      },
      // Wait until boss is defeated
      {
        type: 'command',
        run: () => {
          const bossManager = BossManager.getInstance();
          return awaitCondition(() => bossManager.fightComplete());
        },
      },
      // Run script
      {
        type: 'command',
        run: () => {
          const bossManager = BossManager.getInstance();
          bossManager.destroy();
          missionResultStore.setBossDefeated();
        },
      },
      {
        type: 'pause',
        durationMs: 5000,
      },
      // End the mission
      {
        type: 'command',
        run: () => {
          console.log('Dialogue manager ending mission');
          emitPlayerVictory();
        },
      },
    ],
  };
}
