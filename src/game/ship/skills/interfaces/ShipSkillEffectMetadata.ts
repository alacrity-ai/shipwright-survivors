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
  explosiveLanceGrappling?: boolean;
  explosiveLanceLifesteal?: boolean; // Implemented
  explosiveLanceDamage?: number; // Flat // Implemented
  explosiveLanceElectrocution?: boolean; // Implemented in backend
  explosiveLanceFiringRate?: number; // Percentage // Implemented
  explosiveLanceRange?: number; // Flat // Implemented

  // Halo Nodes
  haloBladeSplitBlades?: boolean; 
  haloBladeDetonateOnHit?: boolean;
  haloBladeFreezeOnHit?: boolean;
  haloBladeDamage?: number; // Flat
  haloBladeSize?: number; // Percentage
  haloBladeOrbitRadius?: number; // Flat

  // Godhand Nodes
  laserDamage?: number; // Flat
  laserBeamWidth?: number; // Flat
  laserEfficiency?: number; // Percentage
  laserChain?: boolean;
  laserAreaOfEffect?: boolean;

  // Universal Nodes
  startingBlocks?: string[]; // Implemented
}
