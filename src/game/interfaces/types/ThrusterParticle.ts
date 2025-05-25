// src/game/interfaces/ThrusterParticle.ts

export interface ThrusterParticle {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  color: string;
  size: number;
  life: number;
}
