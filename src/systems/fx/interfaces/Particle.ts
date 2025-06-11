// src/systems/fx/interfaces/Particle.ts

export type FadeMode = 'linear' | 'delayed';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  color: string;
  speed: number;

  // Optional visual fields
  initialLife?: number;
  fadeOut?: boolean;
  fadeMode?: FadeMode;
  renderAlpha?: number;

  lightId?: string;
}
