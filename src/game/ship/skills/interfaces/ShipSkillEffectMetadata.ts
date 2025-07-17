// src/game/ship/skills/interfaces/ShipSkillEffectMetadata.ts

export interface ShipSkillEffectMetadata {
  // SW-1 Nodes
  turretDamage?: number; // Flat // Implemented
  turretProjectileSpeed?: number; // Flat // Implemented
  turretCriticalChance?: number; // Percentage // Implemented
  turretPenetratingShots?: boolean; // Implemented
  turretSplitShots?: boolean; // Implemented
  
  // Vanguard Nodes
  igniteOnSeekerMissileExplosion?: boolean; // Implemented in Backend
  seekerMissileExplosionRadius?: number; // Flat // Implemented
  seekerMissileDamage?: number; // Flat // Implemented
  doubleSeekerMissileShotChance?: number; // Percentage // Implemented
  timeFreezeOnSeekerMissileExplosion?: boolean; // Implemented in Backend

  // Monarch Nodes
  explosiveLanceRadiate?: boolean; // Implemented
  explosiveLanceLifesteal?: boolean; // Implemented
  explosiveLanceDamage?: number; // Flat // Implemented
  explosiveLanceElectrocution?: boolean; // Implemented in backend
  explosiveLanceFiringRate?: number; // Percentage // Implemented
  explosiveLanceRange?: number; // Flat // Implemented

  // Halo Nodes
  haloBladeSplitBlades?: boolean; 
  haloBladeDetonateOnHit?: boolean;
  haloBladeFreezeOnHit?: boolean;
  haloBladeDamage?: number; // Flat // Implemented
  haloBladeSize?: number; // Percentage // Implemented
  haloBladeOrbitRadius?: number; // Percentage // Implemented

  // Godhand Nodes
  laserDamage?: number; // Flat // Implemented
  laserRange?: number; // Percentage // Implemented
  laserFiringRate?: number; // Percentage // Implemented
  laserChain?: boolean; // Implemented 
  laserAreaOfEffect?: boolean;

  // Universal Nodes
  startingBlocks?: string[]; // Implemented
}
