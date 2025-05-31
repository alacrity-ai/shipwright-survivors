// src/scenes/hub/GalaxyMapView.tsx

import { sceneManager } from '@/core/SceneManager';
import { missionRegistry } from '@/game/missions/MissionRegistry';
import { missionLoader } from '@/game/missions/MissionLoader';

export function GalaxyMapView() {
  const launchMission = (missionId: string) => {
    missionLoader.setMission(missionRegistry[missionId]);
    sceneManager.setScene('mission');
  };

  return (
    <div className="galaxy-map-view">
      <h2>Galaxy Map</h2>

      <button onClick={() => launchMission('mission_001')}>
        Launch "Scrapfield Gauntlet"
      </button>

      <button onClick={() => launchMission('mission_002')}>
        Launch "The Scrapyard Shift"
      </button>
    </div>
  );
}
