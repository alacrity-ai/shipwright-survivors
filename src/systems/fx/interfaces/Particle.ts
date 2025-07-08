// src/systems/fx/interfaces/Particle.ts

export type FadeMode = 'linear' | 'delayed';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  speed: number;

  // Primary visual field
  color: string;

  // Precomputed RGB for rendering (avoids per-frame hex parsing)
  r: number;
  g: number;
  b: number;

  // Optional rendering logic
  initialLife?: number;
  fadeOut?: boolean;
  fadeMode?: FadeMode;
  renderAlpha?: number;
  lightId?: string;
}
