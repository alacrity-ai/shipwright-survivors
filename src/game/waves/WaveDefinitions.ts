// src/game/waves/WaveDefinitions.ts

export interface WaveDefinition {
  id: number;
  type: 'wave' | 'boss' | string;
  mods: string[];
  ships: {
    shipId: string;
    count: number;
  }[];
}

export const waveDefinitions: WaveDefinition[] = [
  {
    id: 1,
    type: 'wave',
    mods: [],
    ships: [
      { shipId: 'ship_0_00', count: 40 },
      { shipId: 'ship_0_01', count: 20 },
      { shipId: 'ship_0_02', count: 15 },
      { shipId: 'ship_0_03', count: 10 },
      { shipId: 'ship_0_04', count: 6 },
      { shipId: 'ship_0_station', count: 6 }
    ]
  },
  {
    id: 2,
    type: 'wave',
    mods: ['extra-aggressive'],
    ships: [
      { shipId: 'ship_scrapper_0', count: 30 },
      { shipId: 'ship_scrapper_1', count: 20 },
      { shipId: 'ship_scrapper_2', count: 12 },
      { shipId: 'ship_scrapper_3', count: 10 },
      { shipId: 'ship_scrapper_4', count: 8 },
      { shipId: 'ship_scrapper_5', count: 6 },
      { shipId: 'ship_scrapper_6', count: 3 }
    ]
  },
  {
    id: 3,
    type: 'wave',
    mods: ['shielded'],
    ships: [
      { shipId: 'ship_basic_0', count: 12 },
      { shipId: 'ship_basic_1', count: 10 },
      { shipId: 'ship_basic_2', count: 8 },
      { shipId: 'ship_basic_3', count: 6 },
      { shipId: 'ship_basic_4', count: 5 },
      { shipId: 'ship_basic_5', count: 4 },
      { shipId: 'ship_basic_6', count: 3 }
    ]
  },
  {
    id: 4,
    type: 'boss',
    mods: ['shielded', 'extra-aggressive'],
    ships: [
      { shipId: 'ship_deathcruiser_4', count: 1 }
    ]
  }
];
