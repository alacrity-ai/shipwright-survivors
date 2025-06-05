// src/game/mission/MissionLoader.ts
import type { MissionDefinition } from '@/game/missions/types/MissionDefinition';
import type { PlanetSpawnConfig } from '@/game/missions/types/MissionDefinition';

import { audioManager } from '@/audio/Audio';

class MissionLoader {
  private currentMission: MissionDefinition | null = null;

  setMission(mission: MissionDefinition) {
    this.currentMission = mission;
    if (mission.music) {
      audioManager.playMusic(mission.music);
    }
  }

  getMission(): MissionDefinition {
    if (!this.currentMission) throw new Error('No mission loaded');
    return this.currentMission;
  }

  getMissionDialogue(): string | null {
    if (!this.currentMission) throw new Error('No mission loaded');
    return this.currentMission.dialogue ?? null; 
  }

  getEnemyPower(): number {
    if (!this.currentMission) throw new Error('No mission loaded');
    return this.currentMission.enemyPower ?? 1;
  }

  getPlanetSpawnConfigs(): PlanetSpawnConfig[] {
    if (!this.currentMission) throw new Error('No mission loaded');
    return this.currentMission.planets ?? [];
  }

  clear() {
    this.currentMission = null;
  }
}

export const missionLoader = new MissionLoader();
