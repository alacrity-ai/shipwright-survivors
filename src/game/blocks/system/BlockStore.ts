// src/game/blocks/system/BlockStore.ts

export class BlockStore {
  // Fixed capacity and state tracking
  public readonly capacity: number;
  public count: number = 0;
  private freeList: number[] = [];

  // Track allocated slots (0 = free, 1 = allocated)
  private readonly allocated: Uint8Array;

  // Spatial / Transform arrays
  public readonly localX: Float32Array;
  public readonly localY: Float32Array;
  public readonly worldX: Float32Array;
  public readonly worldY: Float32Array;
  public readonly rotation: Float32Array;       // World rotation (composed in radians)
  public readonly localRotation: Float32Array;  // Rotation relative to ship
  public readonly overlayRotation: Float32Array; // Rotation relative to ship, for turrets, etc.
  public readonly hidden: Uint8Array;

  // Combat / State arrays
  public readonly hp: Float32Array; // Current HP
  public readonly armor: Float32Array;   // cached max HP for damage tier math
  public readonly destroyed: Uint8Array;
  public readonly indestructible: Uint8Array;
  public readonly cooldown: Float32Array;

  // Fire Attributes
  public readonly fireDamage: Float32Array;
  public readonly fireRate: Float32Array;
  public readonly projectileSpeed: Float32Array;
  public readonly projectileLifetime: Float32Array;
  public readonly explosionDamage: Float32Array;
  public readonly explosionRadiusBlocks: Float32Array;
  public readonly targetingRange: Float32Array;

  // Ownership & Typing arrays
  public readonly ownerShipId: Float64Array;
  public readonly ownerFaction: Uint8Array; // 1=Player, 2=Enemy, 3=Neutral
  public readonly typeIndex: Int32Array;

  // Movement arrays
  public readonly thrustPower: Float32Array; // Thrust power (e.g. 5 for small engine, 10 for large engine)
  public readonly canThrust: Uint8Array; // 1 = can thrust, 0 = cannot thrust
  public readonly turnPower: Float32Array; // Turn power (e.g. 1 for small fin, 2 for large fin)

  // *** New cached BlockType attributes for SOA hot-path access ***
  public readonly categoryCode: Uint8Array;    // Enum-mapped BlockCategory
  public readonly subcategoryCode: Uint8Array; // Enum-mapped BlockSubcategory
  public readonly dropRate: Float32Array;      // 0–1, drop chance
  public readonly tier: Uint8Array;            // Tier (1–5 typically)

  // Shielding arrays
  public readonly isShielded: Uint8Array; // 1 = shielded, 0 = not shielded
  public readonly shieldEfficiency: Float32Array;
  public readonly shieldHighlightColor: Int32Array;
  public readonly shieldSourceId: Int32Array;
  public readonly shieldEnergyDrain: Float32Array;
  public readonly shieldRadius: Float32Array;

  // Rendering color (RGBA packed as floats 0–1)
  public readonly colorR: Float32Array;
  public readonly colorG: Float32Array;
  public readonly colorB: Float32Array;
  public readonly colorA: Float32Array;

  // Per-frame culling mask (1 = visible, 0 = culled)
  public readonly visible: Uint8Array;

  // Texture atlas UVs (precomputed per block, so renderer can read directly)
  public readonly uvBaseX: Float32Array;
  public readonly uvBaseY: Float32Array;
  public readonly uvOverlayX: Float32Array;
  public readonly uvOverlayY: Float32Array;
  public readonly atlasKey: Int32Array;  // numeric key (usually typeIndex)

  constructor(capacity: number) {
    if (capacity <= 0 || !Number.isInteger(capacity)) {
      throw new Error("BlockStore capacity must be a positive integer");
    }

    this.capacity = capacity;

    // Allocation tracking
    this.allocated = new Uint8Array(capacity);

    // Preallocate arrays
    // Spatial / Transform
    this.localX = new Float32Array(capacity);
    this.localY = new Float32Array(capacity);
    this.worldX = new Float32Array(capacity);
    this.worldY = new Float32Array(capacity);
    this.rotation = new Float32Array(capacity);
    this.localRotation = new Float32Array(capacity);
    this.overlayRotation = new Float32Array(capacity);
    this.hidden = new Uint8Array(capacity);

    // Combat / State
    this.hp = new Float32Array(capacity);
    this.armor = new Float32Array(capacity).fill(0);
    this.destroyed = new Uint8Array(capacity);
    this.indestructible = new Uint8Array(capacity);
    this.cooldown = new Float32Array(capacity);

    // Fire Attributes
    this.fireDamage = new Float32Array(capacity);
    this.fireRate = new Float32Array(capacity);
    this.projectileSpeed = new Float32Array(capacity);
    this.projectileLifetime = new Float32Array(capacity);
    this.explosionDamage = new Float32Array(capacity);
    this.explosionRadiusBlocks = new Float32Array(capacity);
    this.targetingRange = new Float32Array(capacity);

    // Ownership & Typing
    this.ownerShipId = new Float64Array(capacity);
    this.ownerFaction = new Uint8Array(capacity);
    this.typeIndex = new Int32Array(capacity);

    // Cached BlockType attributes
    this.categoryCode = new Uint8Array(capacity);
    this.subcategoryCode = new Uint8Array(capacity);
    this.dropRate = new Float32Array(capacity);
    this.tier = new Uint8Array(capacity);

    // Thrusting
    this.thrustPower = new Float32Array(capacity);
    this.canThrust = new Uint8Array(capacity);
    this.turnPower = new Float32Array(capacity);

    // Shielding
    this.isShielded = new Uint8Array(capacity);
    this.shieldEfficiency = new Float32Array(capacity);
    this.shieldHighlightColor = new Int32Array(capacity);
    this.shieldSourceId = new Int32Array(capacity).fill(-1);
    this.shieldEnergyDrain = new Float32Array(capacity);
    this.shieldRadius = new Float32Array(capacity);

    // Rendering color defaults (white, opaque)
    this.colorR = new Float32Array(capacity).fill(1);
    this.colorG = new Float32Array(capacity).fill(1);
    this.colorB = new Float32Array(capacity).fill(1);
    this.colorA = new Float32Array(capacity).fill(1);

    // Per-frame visibility (default visible)
    this.visible = new Uint8Array(capacity).fill(1);

    // Texture atlas UVs
    this.uvBaseX = new Float32Array(capacity).fill(0);
    this.uvBaseY = new Float32Array(capacity).fill(0);
    this.uvOverlayX = new Float32Array(capacity).fill(-1);
    this.uvOverlayY = new Float32Array(capacity).fill(-1);
    this.atlasKey = new Int32Array(capacity).fill(-1);

    this.allocated.fill(0);
  }

  allocateIndex(): number {
    if (this.freeList.length > 0) {
      const index = this.freeList.pop()!;
      this.allocated[index] = 1;
      return index;
    }
    if (this.count >= this.capacity) return -1;
    const index = this.count++;
    this.allocated[index] = 1;
    return index;
  }

  freeIndex(index: number): void {
    if (index < 0 || index >= this.capacity) {
      throw new Error(`Invalid block index: ${index}`);
    }
    this.allocated[index] = 0;

    // Clear scalar fields (performance-friendly, avoids object churn)
    this.localX[index] = 0;
    this.localY[index] = 0;
    this.worldX[index] = 0;
    this.worldY[index] = 0;
    this.rotation[index] = 0;
    this.localRotation[index] = 0;
    this.overlayRotation[index] = 0;
    this.hidden[index] = 0;

    this.hp[index] = 0;
    this.destroyed[index] = 0;
    this.indestructible[index] = 0;
    this.cooldown[index] = 0;

    this.fireDamage[index] = 0;
    this.fireRate[index] = 0;
    this.projectileSpeed[index] = 0;
    this.projectileLifetime[index] = 0;
    this.explosionDamage[index] = 0;
    this.explosionRadiusBlocks[index] = 0;
    this.targetingRange[index] = 0;

    this.ownerShipId[index] = 0;
    this.ownerFaction[index] = 0;
    this.typeIndex[index] = 0;

    // Reset new cached fields
    this.categoryCode[index] = 0;
    this.subcategoryCode[index] = 0;
    this.dropRate[index] = 0;
    this.tier[index] = 0;

    this.thrustPower[index] = 0;
    this.canThrust[index] = 0;
    this.turnPower[index] = 0;

    this.isShielded[index] = 0;
    this.shieldEfficiency[index] = 0;
    this.shieldHighlightColor[index] = 0;
    this.shieldSourceId[index] = -1;
    this.shieldEnergyDrain[index] = 0;
    this.shieldRadius[index] = 0;

    this.colorR[index] = 1;
    this.colorG[index] = 1;
    this.colorB[index] = 1;
    this.colorA[index] = 1;

    this.visible[index] = 1;

    this.uvBaseX[index] = 0;
    this.uvBaseY[index] = 0;
    this.uvOverlayX[index] = -1;
    this.uvOverlayY[index] = -1;
    this.armor[index] = 0;
    this.atlasKey[index] = -1;

    this.freeList.push(index);
  }

  isAllocated(index: number): boolean {
    return index >= 0 && index < this.capacity && this.allocated[index] === 1;
  }

  clear(): void {
    this.count = 0;
    this.freeList.length = 0;
    this.allocated.fill(0);

    this.localX.fill(0);
    this.localY.fill(0);
    this.worldX.fill(0);
    this.worldY.fill(0);
    this.rotation.fill(0);
    this.localRotation.fill(0);
    this.overlayRotation.fill(0);
    this.hidden.fill(0);

    this.hp.fill(0);
    this.destroyed.fill(0);
    this.indestructible.fill(0);
    this.cooldown.fill(0);

    this.fireDamage.fill(0);
    this.fireRate.fill(0);
    this.projectileSpeed.fill(0);
    this.projectileLifetime.fill(0);
    this.explosionDamage.fill(0);
    this.explosionRadiusBlocks.fill(0);
    this.targetingRange.fill(0);

    this.ownerShipId.fill(0);
    this.ownerFaction.fill(0);
    this.typeIndex.fill(0);

    this.categoryCode.fill(0);
    this.subcategoryCode.fill(0);
    this.dropRate.fill(0);
    this.tier.fill(0);

    this.thrustPower.fill(0);
    this.canThrust.fill(0);
    this.turnPower.fill(0);

    this.isShielded.fill(0);
    this.shieldEfficiency.fill(0);
    this.shieldHighlightColor.fill(0);
    this.shieldSourceId.fill(-1);
    this.shieldEnergyDrain.fill(0);
    this.shieldRadius.fill(0);

    this.colorR.fill(1);
    this.colorG.fill(1);
    this.colorB.fill(1);
    this.colorA.fill(1);

    this.uvBaseX.fill(0);
    this.uvBaseY.fill(0);
    this.uvOverlayX.fill(-1);
    this.uvOverlayY.fill(-1);
    this.armor.fill(0);
    this.atlasKey.fill(-1);

    this.visible.fill(1);
  }
}
