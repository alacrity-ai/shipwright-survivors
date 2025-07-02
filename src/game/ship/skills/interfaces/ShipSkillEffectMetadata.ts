// src/game/ship/skills/interfaces/ShipSkillEffectMetadata.ts

export interface ShipSkillEffectMetadata {
  // SW-1 Nodes
  turretDamage?: number; // Flat // Implemented
  turretProjectileSpeed?: number; // Flat // Implemented
  turretCriticalChance?: number; // Percentage // Implemented
  turretPenetratingShots?: boolean; // Implemented
  turretSplitShots?: boolean; // Implemented
  
  // Vanguard Nodes
  igniteOnSeekerMissileExplosion?: boolean;
  seekerMissileExplosionRadius?: number; // Flat
  seekerMissileDamage?: number; // Flat
  doubleSeekerMissileShotChance?: number; // Percentage
  timeFreezeOnSeekerMissileExplosion?: boolean;

  // Monarch Nodes
  explosiveLanceGrappling?: boolean;
  explosiveLanceLifesteal?: boolean;
  explosiveLanceDamage?: number; // Flat
  explosiveLanceElectrocution?: boolean;
  explosiveLanceFiringRate?: number; // Percentage
  explosiveLanceRange?: number; // Percentage

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
  laserShieldPenetration?: boolean;
  laserTargeting?: boolean;

  // Universal Nodes
  startingBlocks?: string[]; // Implemented
}
