// src/game/spawners/spawnConfigurations/asteroidField01.ts

import type { AsteroidFieldDefinition } from '@/game/spawners/types/AsteroidFieldDefinition';

// Map Wide asteroid field
export const asteroidField01: AsteroidFieldDefinition = {
  id: 'asteroid-field-01',
  asteroids: [
    { asteroidId: 'asteroid_0_00', count: 100 },
    { asteroidId: 'asteroid_0_01', count: 100 },
    // { asteroidId: 'asteroid_0_02', count: 100 },
  ],
  velocityRange: {
    x: [-50, 50],
    y: [-50, 50],
  },
  angularVelocityRange: [-1, 1]
};
