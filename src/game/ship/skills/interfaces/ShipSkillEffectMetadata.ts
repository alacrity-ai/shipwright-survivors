// src/game/ship/skills/interfaces/ShipSkillEffectMetadata.ts

export interface ShipSkillEffectMetadata {
  // SW-1 Nodes
  turretDamage?: number;
  turretProjectileSpeed?: number;
  turretCriticalChance?: number;
  turretPenetratingShots?: boolean;
  turretSplitShots?: boolean;
  
  // Vanguard Nodes
  igniteOnSeekerMissileExplosion?: boolean;
  seekerMissileExplosionRadius?: number;
  seekerMissileDamage?: number;
  doubleSeekerMissileShotChance?: number;
  timeFreezeOnSeekerMissileExplosion?: boolean;

  // Monarch Nodes
  explosiveLanceGrappling?: boolean;
  explosiveLanceLifesteal?: boolean;
  explosiveLanceDamage?: number;
  explosiveLanceElectrocution?: boolean;
  explosiveLanceFiringRate?: number;
  explosiveLanceRange?: number;

  // Halo Nodes
  haloBladeSplitBlades?: boolean;
  haloBladeDetonateOnHit?: boolean;
  haloBladeFreezeOnHit?: boolean;
  haloBladeDamage?: number;
  haloBladeSize?: number;
  haloBladeOrbitRadius?: number;

  // Godhand Nodes
  laserDamage?: number;
  laserBeamWidth?: number;
  laserEfficiency?: number;
  laserShieldPenetration?: boolean;
  laserTargeting?: boolean;

  // Universal Nodes
  startingBlocks?: string[];
}
