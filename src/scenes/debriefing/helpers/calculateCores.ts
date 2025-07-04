// src/scenes/debriefing/helpers/calculateCores.ts

import { missionResultStore } from '@/game/missions/MissionResultStore';


/**
 * Calculates the number of reward cores earned based on mission results.
 */
export function calculateCoresEarned(): number {
  const breakdown = calculateCoresEarnedDetailed();
  return Object.values(breakdown).reduce((sum, val) => sum + val, 0);
}

export function calculateCoresEarnedDetailed() {
  const result = missionResultStore.get();

  return {
    fromWaves: result.wavesCleared * 1,
    fromKills: Math.floor(result.enemiesDestroyed / 100),
    fromBlocks: Math.floor(result.blocksCollected / 25),
    fromCurrency: Math.floor(result.entropiumGathered / 1000),
    fromMass: Math.floor(result.massAchieved / 2000),
    fromIncidents: result.incidentsCompleted,
    fromVictory: result.outcome === 'victory' ? 5 : 0,
  };
}
