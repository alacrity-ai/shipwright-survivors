// src/game/interfaces/types/ProjectileTypes.ts

export enum ProjectileType {
  Default = 0,
  ExplosiveLance = 1,
  Bullet = 2,
  PlasmaBolt = 3,
  RailgunSlug = 4,
  // ...add more as needed
}

// Forward map: string → index
export const PROJECTILE_TYPE_TO_INDEX: Record<string, number> = {
  default: ProjectileType.Default,
  explosiveLance: ProjectileType.ExplosiveLance,
  bullet: ProjectileType.Bullet,
  plasmaBolt: ProjectileType.PlasmaBolt,
  railgunSlug: ProjectileType.RailgunSlug,
};

// Reverse map: index → string (for debug or serialization)
export const INDEX_TO_PROJECTILE_TYPE: string[] = Object.keys(PROJECTILE_TYPE_TO_INDEX)
  .reduce<string[]>((arr, key) => {
    const idx = PROJECTILE_TYPE_TO_INDEX[key];
    arr[idx] = key;
    return arr;
  }, []);
