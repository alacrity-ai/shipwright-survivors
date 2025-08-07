// src/game/powerups/types/PowerupMetadataTypes.ts

/** Effect that injects N random blocks of a given tier into the player queue. */
export interface GrantRandomBlocksEffect {
  tier: 1 | 2 | 3 | 4 | 5;
  count: number;
}

export interface GrantEngineBlocksEffect {
  tier: 1 | 2 | 3 | 4 | 5;
  count: number;
}

export interface GrantWeaponBlocksEffect {
  tier: 1 | 2 | 3 | 4 | 5;
  count: number;
}

export interface PowerupEffectMetadata {
  /* ───────────── Offense ───────────── */
  critChance?: number;
  critMultiplier?: number;
  lifeStealOnCrit?: boolean;
  critLifeStealPercent?: number;
  baseDamageMultiplier?: number;
  fireRateMultiplier?: number;

  /* ───────────── Defense ───────────── */
  flatDamageReductionPercent?: number;
  cockpitInvulnChance?: number;
  reflectOnDamagePercent?: number;
  reflectCanCrit?: boolean;

  /* ───── Regen / Utility (future) ───── */
  regenPerSecond?: number;

  /* ─────── Block Affinity (existing) ─────── */
  attachAffinityBlockTier?: 1 | 2 | 3 | 4;
  upgradeAffinityBlocksByTier?: number;

  /* ───────────── Resupply ───────────── */
  /** Enqueue a bundle of randomly-selected blocks. */
  grantRandomBlocks?: GrantRandomBlocksEffect | GrantRandomBlocksEffect[];
  /** Enqueue a bundle of engine blocks. */
  grantEngineBlocks?: GrantEngineBlocksEffect | GrantEngineBlocksEffect[];
  /** Enqueue a bundle of weapon blocks. */
  grantWeaponBlocks?: GrantWeaponBlocksEffect | GrantWeaponBlocksEffect[];

  /* fallback */
  [key: string]:
    | number
    | boolean
    | GrantRandomBlocksEffect
    | GrantRandomBlocksEffect[]
    | GrantEngineBlocksEffect
    | GrantEngineBlocksEffect[]
    | GrantWeaponBlocksEffect
    | GrantWeaponBlocksEffect[]
    | undefined;
}
