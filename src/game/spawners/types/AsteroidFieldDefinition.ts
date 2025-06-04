// src/game/spawners/types/AsteroidFieldDefinition.ts

export interface AsteroidSpawnConfig {
  asteroidId: string;
  count: number;
}

export interface AsteroidFieldDefinition {
  id: string;
  bounds?: {                       // Optional rectangular bounds
    x: number;
    y: number;
    width: number;
    height: number;
  };
  density?: number;
  velocityRange?: {
    x: [number, number];
    y: [number, number];
  };
  angularVelocityRange?: [number, number];
  asteroids: AsteroidSpawnConfig[];
}
