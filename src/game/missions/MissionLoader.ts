// src/game/mission/MissionLoader.ts
import type { MissionDefinition } from '@/game/missions/types/MissionDefinition';
import type { PlanetSpawnConfig } from '@/game/missions/types/MissionDefinition';

import { WorldSettingsManager } from '@/config/world';
import { missionRegistry } from '@/game/missions/MissionRegistry';
import { audioManager } from '@/audio/Audio';

class MissionLoader {
  private currentMission: MissionDefinition | null = null;

  private density: 0.5 | 1.0 | 2.0 = 0.5;
  private intensity: 0.5 | 1.0 | 2.0 = 0.5;

  setMission(mission: MissionDefinition) {
    this.currentMission = mission;
    WorldSettingsManager.setWorldWidth(mission.environmentSettings?.worldWidth ?? 32000);
    WorldSettingsManager.setWorldHeight(mission.environmentSettings?.worldHeight ?? 32000);
    if (mission.music) {
      audioManager.playMusic(mission.music);
    }
  }

  getMission(): MissionDefinition {
    if (!this.currentMission) throw new Error('No mission loaded');
    return this.currentMission;
  }

  getDropMultiplier(): number {
    if (!this.currentMission) throw new Error('No mission loaded');
    return this.currentMission.dropMultiplier ?? 1;
  }

  getMissionById(id: string): MissionDefinition | null {
    const mission = missionRegistry[id];
    return mission ?? null;
  }

  getMissionDialogue(): string | null {
    if (!this.currentMission) throw new Error('No mission loaded');
    return this.currentMission.dialogue ?? null; 
  }

  getEnemyPower(): number {
    return this.intensity as number;
  }

  getPlanetSpawnConfigs(): PlanetSpawnConfig[] {
    if (!this.currentMission) throw new Error('No mission loaded');
    return this.currentMission.planets ?? [];
  }

  setDensity(density: 'Normal' | 'High' | 'Catastrophic') {
    this.density = density === 'Normal' ? 0.5 : density === 'High' ? 1.0 : 2.0;
  }

  setIntensity(intensity: 'Normal' | 'High' | 'Catastrophic') {
    this.intensity = intensity === 'Normal' ? 0.5 : intensity === 'High' ? 1.0 : 2.0;
  }

  getDensity(): number {
    return this.density;
  }

  getIntensity(): number {
    return this.intensity;
  }

  clear() {
    this.currentMission = null;
  }
}

export const missionLoader = new MissionLoader();
