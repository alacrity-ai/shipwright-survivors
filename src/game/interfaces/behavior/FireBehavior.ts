// src/game/interfaces/FireBehavior.ts

export interface FireBehavior {
  fireRate?: number;       // shots per second
  fireType?: string;       // 'bullet', 'missile', etc.
  fireDamage?: number;     // per shot
  radius?: number;          // Radius of projectile
  projectileSpeed?: number; // optional: default if omitted
  lifetime?: number; // in seconds
  accuracy?: number; // 0-1, 1 = perfect, 0 = random
  energyCost?: number; // energy per shot
  detonationDelayMs?: number; // New
  explosionDamage?: number; // New 
  explosionRadiusBlocks?: number; // New
  turningPower?: number; // New
  targetingRange?: number; // New
  seekerForwardFire?: boolean; // New
}
