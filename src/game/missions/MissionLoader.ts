// src/game/mission/MissionLoader.ts
import type { MissionDefinition } from '@/game/missions/types/MissionDefinition';
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

  clear() {
    this.currentMission = null;
  }
}

export const missionLoader = new MissionLoader();
