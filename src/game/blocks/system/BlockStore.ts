// src/game/blocks/system/BlockStore.ts

export class BlockStore {
  // Fixed capacity and state tracking
  public readonly capacity: number;
  public count: number = 0;
  private freeList: number[] = [];

  // Allocation state
  private readonly allocated: Uint8Array;

  // === New: Active index tracking ===
  public readonly activeIndices: Uint32Array;
  public activeCount: number = 0;
  private readonly blockToActivePos: Int32Array;

  // Spatial / Transform arrays
  public readonly localX: Float32Array;
  public readonly localY: Float32Array;
  public readonly worldX: Float32Array;
  public readonly worldY: Float32Array;
  public readonly rotation: Float32Array;
  public readonly localRotation: Float32Array;
  public readonly overlayRotation: Float32Array;
  public readonly hidden: Uint8Array;

  // Combat / State arrays
  public readonly hp: Float32Array;
  public readonly armor: Float32Array;
  public readonly destroyed: Uint8Array;
  public readonly indestructible: Uint8Array;
  public readonly cooldown: Float32Array;

  // Fire Attributes
  public readonly fireDamage: Float32Array;
  public readonly fireRate: Float32Array;
  public readonly fireAccuracy: Float32Array;
  public readonly projectileSpeed: Float32Array;
  public readonly projectileLifetime: Float32Array;
  public readonly explosionDamage: Float32Array;
  public readonly explosionRadiusBlocks: Float32Array;
  public readonly targetingRange: Float32Array;
  public readonly fireTurningPower: Float32Array;

  // Weapon Specific
  public readonly seekerForwardFire: Uint8Array;

  // Ownership & Typing
  public readonly ownerShipId: Float64Array;
  public readonly ownerFaction: Uint8Array;
  public readonly typeIndex: Int32Array;

  // Movement
  public readonly thrustPower: Float32Array;
  public readonly canThrust: Uint8Array;
  public readonly turnPower: Float32Array;

  // Cached BlockType attributes
  public readonly categoryCode: Uint8Array;
  public readonly subcategoryCode: Uint8Array;
  public readonly dropRate: Float32Array;
  public readonly tier: Uint8Array;

  // Shielding
  public readonly isShielded: Uint8Array;
  public readonly shieldEfficiency: Float32Array;
  public readonly shieldHighlightColor: Int32Array;
  public readonly shieldSourceId: Int32Array;
  public readonly shieldEnergyDrain: Float32Array;
  public readonly shieldRadius: Float32Array;

  // Rendering color (RGBA floats 0–1)
  public readonly colorR: Float32Array;
  public readonly colorG: Float32Array;
  public readonly colorB: Float32Array;
  public readonly colorA: Float32Array;

  // Per-frame visibility (1 = visible)
  public readonly visible: Uint8Array;

  // Texture atlas UVs
  public readonly uvBaseX: Float32Array;
  public readonly uvBaseY: Float32Array;
  public readonly uvOverlayX: Float32Array;
  public readonly uvOverlayY: Float32Array;
  public readonly atlasKey: Int32Array;

  // Light ID
  public readonly lightId: Float64Array;

  constructor(capacity: number) {
    if (capacity <= 0 || !Number.isInteger(capacity)) {
      throw new Error("BlockStore capacity must be a positive integer");
    }

    this.capacity = capacity;

    // Allocation tracking
    this.allocated = new Uint8Array(capacity);

    // === New active-index tracking arrays ===
    this.activeIndices = new Uint32Array(capacity);
    this.blockToActivePos = new Int32Array(capacity).fill(-1);
    this.activeCount = 0;

    // Preallocate SOA arrays (unchanged from your original)
    this.localX = new Float32Array(capacity);
    this.localY = new Float32Array(capacity);
    this.worldX = new Float32Array(capacity);
    this.worldY = new Float32Array(capacity);
    this.rotation = new Float32Array(capacity);
    this.localRotation = new Float32Array(capacity);
    this.overlayRotation = new Float32Array(capacity);
    this.hidden = new Uint8Array(capacity);

    this.hp = new Float32Array(capacity);
    this.armor = new Float32Array(capacity).fill(0);
    this.destroyed = new Uint8Array(capacity);
    this.indestructible = new Uint8Array(capacity);
    this.cooldown = new Float32Array(capacity);

    this.fireDamage = new Float32Array(capacity);
    this.fireRate = new Float32Array(capacity);
    this.fireAccuracy = new Float32Array(capacity);
    this.projectileSpeed = new Float32Array(capacity);
    this.projectileLifetime = new Float32Array(capacity);
    this.explosionDamage = new Float32Array(capacity);
    this.explosionRadiusBlocks = new Float32Array(capacity);
    this.targetingRange = new Float32Array(capacity);
    this.fireTurningPower = new Float32Array(capacity);

    this.seekerForwardFire = new Uint8Array(capacity);

    this.ownerShipId = new Float64Array(capacity);
    this.ownerFaction = new Uint8Array(capacity);
    this.typeIndex = new Int32Array(capacity);

    this.categoryCode = new Uint8Array(capacity);
    this.subcategoryCode = new Uint8Array(capacity);
    this.dropRate = new Float32Array(capacity);
    this.tier = new Uint8Array(capacity);

    this.thrustPower = new Float32Array(capacity);
    this.canThrust = new Uint8Array(capacity);
    this.turnPower = new Float32Array(capacity);

    this.isShielded = new Uint8Array(capacity);
    this.shieldEfficiency = new Float32Array(capacity);
    this.shieldHighlightColor = new Int32Array(capacity);
    this.shieldSourceId = new Int32Array(capacity).fill(-1);
    this.shieldEnergyDrain = new Float32Array(capacity);
    this.shieldRadius = new Float32Array(capacity);

    this.colorR = new Float32Array(capacity).fill(1);
    this.colorG = new Float32Array(capacity).fill(1);
    this.colorB = new Float32Array(capacity).fill(1);
    this.colorA = new Float32Array(capacity).fill(1);

    this.visible = new Uint8Array(capacity).fill(1);

    this.uvBaseX = new Float32Array(capacity).fill(0);
    this.uvBaseY = new Float32Array(capacity).fill(0);
    this.uvOverlayX = new Float32Array(capacity).fill(-1);
    this.uvOverlayY = new Float32Array(capacity).fill(-1);
    this.atlasKey = new Int32Array(capacity).fill(-1);

    this.lightId = new Float64Array(capacity).fill(-1);

    this.allocated.fill(0);
  }

  allocateIndex(): number {
    let index: number;
    if (this.freeList.length > 0) {
      index = this.freeList.pop()!;
    } else {
      if (this.count >= this.capacity) return -1;
      index = this.count++;
    }
    this.allocated[index] = 1;

    // Add to active list
    this.activeIndices[this.activeCount] = index;
    this.blockToActivePos[index] = this.activeCount++;
    return index;
  }

  freeIndex(index: number): void {
    if (index < 0 || index >= this.capacity) {
      throw new Error(`Invalid block index: ${index}`);
    }
    if (!this.allocated[index]) return;

    this.allocated[index] = 0;

    // Remove from active list via swap-with-last (only affects list, not SOA data)
    const pos = this.blockToActivePos[index];
    const last = this.activeCount - 1;
    if (pos >= 0 && pos < this.activeCount) {
      if (pos !== last) {
        const movedIdx = this.activeIndices[last];
        this.activeIndices[pos] = movedIdx;
        this.blockToActivePos[movedIdx] = pos;
      }
      this.activeCount--;
      this.blockToActivePos[index] = -1;
    }

    // Reset all scalar fields (as before)...
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
    this.fireAccuracy[index] = 0;
    this.projectileSpeed[index] = 0;
    this.projectileLifetime[index] = 0;
    this.explosionDamage[index] = 0;
    this.explosionRadiusBlocks[index] = 0;
    this.targetingRange[index] = 0;
    this.fireTurningPower[index] = 0;
    this.seekerForwardFire[index] = 0;
    this.ownerShipId[index] = 0;
    this.ownerFaction[index] = 0;
    this.typeIndex[index] = 0;
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
    this.lightId[index] = -1;

    this.freeList.push(index);
  }

  isAllocated(index: number): boolean {
    return index >= 0 && index < this.capacity && this.allocated[index] === 1;
  }

  clear(): void {
    this.count = 0;
    this.freeList.length = 0;
    this.allocated.fill(0);
    this.activeCount = 0;
    this.blockToActivePos.fill(-1);
    // Zero all SOA arrays (same as your existing implementation)...
    this.localX.fill(0);
    this.localY.fill(0);
    this.worldX.fill(0);
    this.worldY.fill(0);
    this.rotation.fill(0);
    this.localRotation.fill(0);
    this.overlayRotation.fill(0);
    this.hidden.fill(0);
    this.hp.fill(0);
    this.armor.fill(0);
    this.destroyed.fill(0);
    this.indestructible.fill(0);
    this.cooldown.fill(0);
    this.fireDamage.fill(0);
    this.fireRate.fill(0);
    this.fireAccuracy.fill(0);
    this.projectileSpeed.fill(0);
    this.projectileLifetime.fill(0);
    this.explosionDamage.fill(0);
    this.explosionRadiusBlocks.fill(0);
    this.targetingRange.fill(0);
    this.fireTurningPower.fill(0);
    this.seekerForwardFire.fill(0);
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
    this.visible.fill(1);
    this.uvBaseX.fill(0);
    this.uvBaseY.fill(0);
    this.uvOverlayX.fill(-1);
    this.uvOverlayY.fill(-1);
    this.atlasKey.fill(-1);
    this.lightId.fill(-1);
  }
}
