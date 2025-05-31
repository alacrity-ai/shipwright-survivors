// src/systems/fx/interfaces/Particle.ts

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  color: string;
  speed: number;
  initialLife?: number; // optional, for alpha fading
  fadeOut?: boolean;    // optional, toggle per particle
}
