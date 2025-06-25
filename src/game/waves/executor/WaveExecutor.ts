// src/game/waves/executor/WaveExecutor.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { ShipFactory } from '@/game/ship/factories/ShipFactory';
import type { ShipFormationFactory } from '@/game/ship/factories/ShipFormationFactory';
import type { PopupMessageSystem } from '@/ui/PopupMessageSystem';
import type { IncidentOrchestrator } from '@/systems/incidents/IncidentOrchestrator';
import type { WaveExecutionContext } from '@/game/waves/orchestrator/WaveExecutionContext';
import type { ScriptRunner } from '@/game/waves/scripting/ScriptRunner';
import type { SpawnCoordinateResolver } from '@/game/waves/executor/SpawnCoordinateResolver';
import type { WaveModifiersApplier } from '@/game/waves/executor/WaveModifiersApplier';

import { missionLoader } from '@/game/missions/MissionLoader';
import { WaveExecutionContext as Context } from '@/game/waves/orchestrator/WaveExecutionContext';
import { audioManager } from '@/audio/Audio';

export class WaveExecutor {
  public constructor(
    private readonly shipFactory: ShipFactory,
    private readonly shipFormationFactory: ShipFormationFactory,
    private readonly incidentSystem: IncidentOrchestrator,
    private readonly popupMessageSystem: PopupMessageSystem,
    private readonly scriptRunner: ScriptRunner,
    private readonly spawnResolver: SpawnCoordinateResolver,
    private readonly modApplier: WaveModifiersApplier
  ) {}

  public async execute(
    wave: WaveDefinition,
    waveIndex: number,
    tag?: string, // Optional tag for one-shot wave tracking
    customAuraLightProps?: { color?: string; radius?: number; intensity?: number }
  ): Promise<WaveExecutionContext> {
    const context = new Context(wave, waveIndex, this.scriptRunner, tag);
    const densityMultiplier = missionLoader.getMission().waveDensity ?? 1;

    // === Formations ===
    for (const formationEntry of wave.formations ?? []) {
      const baseCount = formationEntry.count ?? 1;
      const scaledCount = Math.round(baseCount * densityMultiplier);
      for (let i = 0; i < scaledCount; i++) {
        const { x, y } = this.spawnResolver.getCoords(wave);
        const formationMap = await this.shipFormationFactory.spawnFormation(formationEntry, x, y);

        for (const [ship, controller] of formationMap.entries()) {
          this.modApplier.apply(ship, wave.mods);
          context.trackShip(ship, controller, {
            shipId: 'formation-member',
            count: 1,
            onAllDefeated: undefined,
          });

          if (customAuraLightProps) {
            ship.updateAuraLight(
              customAuraLightProps.color,
              customAuraLightProps.radius,
              customAuraLightProps.intensity
            );
            ship.setBlockColor(customAuraLightProps.color!);
          }
        }
      }
    }

    // === Individual Ships ===
    for (const entry of wave.ships) {
      const baseCount = entry.count ?? 1;
      const scaledCount = Math.round(baseCount * densityMultiplier);
      for (let i = 0; i < scaledCount; i++) {
        const { x, y } = this.spawnResolver.getCoords(wave);
        const { ship, controller } = await this.shipFactory.createShip(
          entry.shipId,
          x,
          y,
          entry.hunter ?? false,
          entry.behaviorProfile,
          entry.affixes ?? {}
        );

        this.modApplier.apply(ship, wave.mods);
        context.trackShip(ship, controller!, entry);

        if (customAuraLightProps) {
          ship.updateAuraLight(
            customAuraLightProps.color,
            customAuraLightProps.radius,
            customAuraLightProps.intensity
          );
          ship.setBlockColor(customAuraLightProps.color!);
          ship.setBlockColorIntensity(1.0);
        }
      }
    }

    // === Incidents ===
    for (const incident of wave.incidents ?? []) {
      const roll = Math.random();
      if (roll <= incident.spawnChance) {
        console.log(`[WaveExecutor] Triggering incident: ${incident.script}`);
        this.incidentSystem.trigger(incident.script, incident.options ?? {}, waveIndex, incident.delaySeconds);
      }
    }

    // === UI / Music ===
    if (tag === undefined) {
      this.popupMessageSystem.displayMessage(`Wave ${waveIndex + 1}`, {
        color: '#00ff00',
        duration: 5,
        glow: true,
        font: '28px monospace',
      });
    }

    if (wave.music) {
      audioManager.playMusic(wave.music);
    }

    return context;
  }
}
