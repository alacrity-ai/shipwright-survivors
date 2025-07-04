// src/game/waves/missions/Mission1Waves.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';

import { randomIntFromRange } from '@/shared/mathUtils';

import { createHourGlassFormation } from '@/systems/ai/formations/prefabs/createHourGlassFormation';
import { createMediumWedgeFormation } from '@/systems/ai/formations/prefabs/createMediumWedgeFormation';
import { createSmallWedgeFormation } from '@/systems/ai/formations/prefabs/createSmallWedgeFormation';
import { createLargeWedgeFormation } from '@/systems/ai/formations/prefabs/createLargeWedgeFormation';
import { SiegeBehaviorProfile } from '@/systems/ai/types/BehaviorProfile';

const SPEED_DEMON_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 2.4,
  turnPowerMulti: 2.4,
};

const FAST_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 1.8,
  turnPowerMulti: 1.8,
};

const SUPER_FAST_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 4.4,
  turnPowerMulti: 4.4,
};

const TIER2_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 5.0,
  turnPowerMulti: 2.0,
  fireRateMulti: 2.0,
  projectileSpeedMulti: 1.5,
  blockDurabilityMulti: 2.0,
};

const TIER3_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 2.0,
  turnPowerMulti: 2.0,
  fireRateMulti: 2.5,
  projectileSpeedMulti: 2.5,
  blockDurabilityMulti: 2.0,
};

const cursedCargoTier1Params = {
  rewardBlockTier: 1,
  rewardQuantityMultiplier: 1,
  ships: [
    { shipId: 'incidents/cursed_cargo/cursed_cargo_killer_00', count: 4, affixes: { blockDurabilityMulti: 0.5, thrustPowerMulti: 1.5, turnPowerMulti: 1.5 } },
    { shipId: 'incidents/cursed_cargo/cursed_cargo_killer_01', count: 4, affixes: { blockDurabilityMulti: 0.5, thrustPowerMulti: 1.5, turnPowerMulti: 1.5 } },
  ],
  cursedCacheShip: { shipId: 'incidents/cursed_cargo/cursed_cargo_00', count: 1 },
};

const hourGlassFormation = createHourGlassFormation(
  'hourglass',
  'ship_0_03',
  ['ship_0_02', 'ship_0_02', 'ship_0_02', 'ship_0_02', 'ship_0_02', 'ship_0_02'],
  FAST_AFFIXES,
  SPEED_DEMON_AFFIXES,
  600,
  2,
  true,
  true
);

const smallWedgeFormation = createSmallWedgeFormation(
  'small-wedge',
  'ship_0_02',
  ['ship_0_02', 'ship_0_02'],
  FAST_AFFIXES,
  FAST_AFFIXES,
  800,
  5,
  true,
  true
);

const mediumWedgeFormation = createMediumWedgeFormation(
  'medium-wedge',
  'ship_0_03',
  ['ship_0_02', 'ship_0_02', 'ship_0_02', 'ship_0_02'],
  FAST_AFFIXES,
  FAST_AFFIXES,
  700,
  3,
  true,
  true
);

const cruiserLargeWedgeFormation = createLargeWedgeFormation(
  'large-wedge',
  'ship_scrapper_4',
  ['ship_scrapper_3', 'ship_scrapper_3', 'ship_0_02', 'ship_0_02', 'ship_0_02', 'ship_0_02'],
  FAST_AFFIXES,
  FAST_AFFIXES,
  600,
  2,
  true,
  true
);

const killCrewFormation = createSmallWedgeFormation(
  'kill-crew',
  'ship_scrapper_6',
  ['ship_scrapper_6', 'ship_scrapper_6'],
  FAST_AFFIXES,
  FAST_AFFIXES,
  700,
  2,
  true,
  true
);

const speedHuntersFormation = createSmallWedgeFormation(
  'speed-hunters',
  'ship_0_02',
  ['ship_0_02', 'ship_0_02'],
  SUPER_FAST_AFFIXES,
  SUPER_FAST_AFFIXES,
  600,
  4,
  true,
  true
);

export const waveDefinitions: WaveDefinition[] = [
  {
    sustainMode: true,
    duration: 60,
    spawnDistribution: 'aroundPlayer',
    mods: [],
    ships: [
      { shipId: 'ship_0_03', count: 4, hunter: true, affixes: FAST_AFFIXES },
      { shipId: 'ship_0_02', count: 4, hunter: true, affixes: SPEED_DEMON_AFFIXES },
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'CursedCargoIncident',
        options: cursedCargoTier1Params,
      },
      {
        spawnChance: 1.0,
        script: 'DimensionalPortalIncident',
        options: {
          maxDuration: 20,
          tiers: [
            [ // Tier 0: 0–4 kills
              { shipId: 'wave_0_00', count: 4, hunter: true }
            ],
            [ // Tier 1: 5–9 kills
              { shipId: 'wave_0_01', count: 4, hunter: true }
            ],
            [ // Tier 2: 10–14 kills
              { shipId: 'wave_0_02', count: 4, hunter: true }
            ],
            [ // Tier 3: 15–19 kills
              { shipId: 'wave_0_03', count: 4, hunter: true }
            ],
            [ // Tier 4+: 20+ kills
              { shipId: 'wave_0_04', count: 4, hunter: true }
            ],
            [ // Tier 4+: 25+ kills
              { shipId: 'ship_scrapper_4', count: 4, hunter: true }
            ],
            [ // Tier 4+: 30+ kills
              { shipId: 'ship_scrapper_5', count: 4, hunter: true }
            ],
            [ // Tier 4+: 35+ kills
              { shipId: 'ship_scrapper_6', count: 4, hunter: true }
            ],
          ],
        },
      }
    ],
  },
  {
    duration: 60,
    sustainMode: true,
    spawnDistribution: 'aroundPlayer',
    mods: [],
    ships: [
      { shipId: 'mission_02/long_range_00', 
        count: 4, 
        hunter: true,
        affixes: FAST_AFFIXES,
        behaviorProfile: {
          ...SiegeBehaviorProfile,
          params: {
            ...SiegeBehaviorProfile.params,
            engagementRange: 2000,
            siegeRange: 2000,
            disengageRange: 4000,
          },
        },
      },
      { shipId: 'ship_0_03', count: 4, hunter: true, affixes: FAST_AFFIXES },
      { shipId: 'ship_0_02', count: 4, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'ship_0_station', count: 4 }
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'CursedCargoIncident',
        options: cursedCargoTier1Params,
      },
      {
        spawnChance: 1.0,
        script: 'DimensionalPortalIncident',
        options: {
          maxDuration: 20,
          tiers: [
            [ // Tier 0: 0–4 kills
              { shipId: 'wave_0_00', count: 4, hunter: true }
            ],
            [ // Tier 1: 5–9 kills
              { shipId: 'wave_0_01', count: 4, hunter: true }
            ],
            [ // Tier 2: 10–14 kills
              { shipId: 'wave_0_02', count: 4, hunter: true }
            ],
            [ // Tier 3: 15–19 kills
              { shipId: 'wave_0_03', count: 4, hunter: true }
            ],
            [ // Tier 4+: 20+ kills
              { shipId: 'wave_0_04', count: 4, hunter: true }
            ],
            [ // Tier 4+: 25+ kills
              { shipId: 'ship_scrapper_4', count: 4, hunter: true }
            ],
            [ // Tier 4+: 30+ kills
              { shipId: 'ship_scrapper_5', count: 4, hunter: true }
            ],
            [ // Tier 4+: 35+ kills
              { shipId: 'ship_scrapper_6', count: 4, hunter: true }
            ],
          ],
        },
      }
    ],
  },
  {
    duration: 60,
    sustainMode: true,
    spawnDistribution: 'aroundPlayer',
    mods: [],
    ships: [
      { shipId: 'mission_02/long_range_00', 
        count: 4, 
        hunter: true,
        affixes: FAST_AFFIXES,
        behaviorProfile: {
          ...SiegeBehaviorProfile,
          params: {
            ...SiegeBehaviorProfile.params,
            engagementRange: 2800,
            siegeRange: 2800,
            disengageRange: 5000,
          },
        },
      },
      { shipId: 'ship_0_03', count: 4, hunter: true, affixes: FAST_AFFIXES },
      { shipId: 'ship_0_02', count: 4, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'ship_scrapper_3', count: 4, hunter: true, affixes: FAST_AFFIXES },
      { shipId: 'ship_0_station', count: 4 }
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'CursedCargoIncident',
        options: cursedCargoTier1Params,
      },
      {
        spawnChance: 1.0,
        script: 'DimensionalPortalIncident',
        options: {
          maxDuration: 20,
          tiers: [
            [ // Tier 0: 0–4 kills
              { shipId: 'ship_scrapper_2', count: 6 }
            ],
            [ // Tier 1: 5–9 kills
              { shipId: 'ship_scrapper_3', count: 6 }
            ],
            [ // Tier 2: 10–14 kills
              { shipId: 'ship_scrapper_4', count: 6, hunter: true }
            ],
            [ // Tier 3: 15–19 kills
              { shipId: 'mission_02/tier2_fighter_00', count: 6, hunter: true, affixes: TIER2_AFFIXES }
            ],
            [ // Tier 4+: 24+ kills
              { shipId: 'mission_02/tier2_fighter_00', count: 6, hunter: true, affixes: TIER2_AFFIXES }
            ],
            [ // Tier 4+: 29+ kills
              { shipId: 'mission_02/tier2_cruiser_00', count: 6, hunter: true, affixes: TIER2_AFFIXES }
            ],
            [ // Tier 4+: 34+ kills
              { shipId: 'mission_02/tier2_cruiser_00', count: 6, hunter: true, affixes: TIER2_AFFIXES }

            ],
            [ // Tier 4+: 39+ kills
              { shipId: 'mission_02/tier2_cruiser_01', count: 6, hunter: true, affixes: TIER2_AFFIXES }
            ],
          ],
        },
      }
    ],
  },
  {
    duration: 60,
    sustainMode: true,
    spawnDistribution: 'aroundPlayer',    
    mods: [],
    ships: [
      { shipId: 'ship_scrapper_0', count: 6, hunter: true },
      { shipId: 'mission_02/long_range_00', 
        count: 4, 
        hunter: true,
        affixes: FAST_AFFIXES,
        behaviorProfile: {
          ...SiegeBehaviorProfile,
          params: {
            ...SiegeBehaviorProfile.params,
            engagementRange: 1800,
            siegeRange: 2800,
            disengageRange: 5000,
          },
        },
      },
      { shipId: 'ship_scrapper_2', count: 4, hunter: true, affixes: SUPER_FAST_AFFIXES },
      { shipId: 'ship_scrapper_3', count: 4, hunter: true, affixes: FAST_AFFIXES },
      { shipId: 'ship_scrapper_4', count: 2, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'ship_scrapper_5', count: 2, hunter: true, affixes: FAST_AFFIXES },
      { shipId: 'ship_scrapper_6', count: 2, hunter: true, affixes: FAST_AFFIXES },
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'QuantumBoomIncident',
      },
    ],
  },
  {
    spawnDistribution: 'center',
    duration: Infinity,    
    mods: [],
    ships: [
      {
        shipId: 'boss_0_00',
        count: 1,
        hunter: true,
        behaviorProfile: {
          ...SiegeBehaviorProfile,
          params: {
            ...SiegeBehaviorProfile.params,
            engagementRange: 2400,
            siegeRange: 2400,
            disengageRange: 3000,
          },
        },
        affixes: {
          blockDurabilityMulti: 12.0,
          thrustPowerMulti: 6.0,
          turnPowerMulti: 0.6,
          fireRateMulti: 2.5,
        },
      },
    ],
    music: {
      file: 'assets/sounds/music/track_03_boss.mp3',
    },
    lightingSettings: {
      clearColor: [0.25, 0.0, 0.0, 0.0]
    },
    isBoss: true,
  }
];