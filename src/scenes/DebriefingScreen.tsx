// src/scenes/DebriefingScreen.tsx

import { sceneManager } from '@/core/SceneManager';
import { missionResultStore } from '@/game/missions/MissionResultStore';

export function DebriefingScreen() {
  if (!missionResultStore.hasResult()) {
    return (
      <div className="scene debriefing-screen">
        <p>Error: No mission data available.</p>
        <button onClick={() => sceneManager.setScene('hub')}>Return to Hub</button>
      </div>
    );
  }

  const result = missionResultStore.get();

  return (
    <div className="scene debriefing-screen">
      <h1>Mission Debriefing</h1>
      <p><strong>Mission Outcome:</strong> {result.outcome === 'victory' ? 'Victory' : 'Defeat'}</p>
      <p><strong>Enemies Destroyed:</strong> {result.enemiesDestroyed}</p>
      <p><strong>Currency Gathered:</strong> {result.currencyGathered}</p>
      <p><strong>Passive Points Earned:</strong> {result.passivePointsEarned}</p>
      <p><strong>Time Taken:</strong> {result.timeTakenSeconds?.toFixed(1)}s</p>

      {result.blocksUnlocked.length > 0 && (
        <>
          <p><strong>Blocks Unlocked:</strong></p>
          <ul>
            {result.blocksUnlocked.map(blockId => (
              <li key={blockId}>{blockId}</li>
            ))}
          </ul>
        </>
      )}

      {result.bonusObjectives && result.bonusObjectives.length > 0 && (
        <>
          <p><strong>Bonus Objectives:</strong></p>
          <ul>
            {result.bonusObjectives.map((desc, idx) => (
              <li key={idx}>{desc}</li>
            ))}
          </ul>
        </>
      )}

      <button onClick={() => {
        missionResultStore.clear();
        sceneManager.setScene('hub');
      }}>
        Return to Hub
      </button>
    </div>
  );
}
