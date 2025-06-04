// src/game/spawners/spawnConfigurations/asteroidField02.ts

// Example of localized asteroid field

import type { AsteroidFieldDefinition } from '@/game/spawners/types/AsteroidFieldDefinition';

export const asteroidField02: AsteroidFieldDefinition = {
  id: 'asteroid-field-02',
  bounds: {
    x: -2000,
    y: -1500,
    width: 4000,
    height: 3000,
  },
  density: 0.8,
  velocityRange: {
    x: [-0.2, 0.2],
    y: [-0.1, 0.1],
  },
  angularVelocityRange: [-0.1, 0.1],
  asteroids: [
    { asteroidId: 'asteroid_0_00', count: 30 },
    { asteroidId: 'asteroid_0_01', count: 20 },
    { asteroidId: 'asteroid_0_02', count: 15 },
  ],
};
