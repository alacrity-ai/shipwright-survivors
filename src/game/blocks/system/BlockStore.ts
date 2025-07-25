// src/game/blocks/system/BlockStore.ts

/**
 * BlockStore - Low-level, fixed-capacity SOA data container for block instances.
 * Provides dense, cache-friendly storage with zero runtime allocations.
 */
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
  public readonly hp: Float32Array;
  public readonly destroyed: Uint8Array;
  public readonly indestructible: Uint8Array;
  public readonly cooldown: Float32Array;

  // Ownership & Typing arrays
  public readonly ownerShipId: Int32Array;
  public readonly ownerFaction: Uint8Array; // 1=Player, 2=Enemy, 3=Neutral
  public readonly typeIndex: Int32Array;

  // Shielding arrays
  public readonly isShielded: Uint8Array; // 1 = shielded, 0 = not shielded
  public readonly shieldEfficiency: Float32Array;
  public readonly shieldHighlightColor: Int32Array;
  public readonly shieldSourceId: Int32Array;

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
  public readonly armor: Float32Array;   // cached max HP for damage tier math
  public readonly atlasKey: Int32Array;  // numeric key (usually typeIndex)

  constructor(capacity: number) {
    if (capacity <= 0 || !Number.isInteger(capacity)) {
      throw new Error("BlockStore capacity must be a positive integer");
    }

    this.capacity = capacity;

    // Allocation tracking
    this.allocated = new Uint8Array(capacity);

    // Preallocate all arrays to fixed capacity
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
    this.destroyed = new Uint8Array(capacity);
    this.indestructible = new Uint8Array(capacity);
    this.cooldown = new Float32Array(capacity);

    // Ownership & Typing
    this.ownerShipId = new Int32Array(capacity);
    this.ownerFaction = new Uint8Array(capacity);
    this.typeIndex = new Int32Array(capacity);

    // Shielding
    this.isShielded = new Uint8Array(capacity);
    this.shieldEfficiency = new Float32Array(capacity);
    this.shieldHighlightColor = new Int32Array(capacity);
    this.shieldSourceId = new Int32Array(capacity);

    // Rendering color (RGBA)
    this.colorR = new Float32Array(capacity).fill(1);
    this.colorG = new Float32Array(capacity).fill(1);
    this.colorB = new Float32Array(capacity).fill(1);
    this.colorA = new Float32Array(capacity).fill(1);

    // Per-frame culling mask (1 = visible, 0 = culled)
    this.visible = new Uint8Array(capacity).fill(1);

    // Rendering UVs (initialize to invalid or 0)
    this.uvBaseX = new Float32Array(capacity).fill(0);
    this.uvBaseY = new Float32Array(capacity).fill(0);
    this.uvOverlayX = new Float32Array(capacity).fill(-1);  // -1 signals "no overlay"
    this.uvOverlayY = new Float32Array(capacity).fill(-1);
    this.armor = new Float32Array(capacity).fill(0);
    this.atlasKey = new Int32Array(capacity).fill(-1);

    // Initialize defaults
    this.shieldSourceId.fill(-1);
    this.allocated.fill(0);
  }

  /**
   * Allocates a new block index, either from the free list or sequentially.
   * @returns Block index (0 to capacity-1) or -1 if at capacity
   */
  allocateIndex(): number {
    // Reuse a freed index first
    if (this.freeList.length > 0) {
      const index = this.freeList.pop()!;
      this.allocated[index] = 1;
      return index;
    }

    // If no free slots and at capacity, return -1
    if (this.count >= this.capacity) {
      return -1;
    }

    // Allocate next sequential index
    const index = this.count++;
    this.allocated[index] = 1;
    return index;
  }

  /**
   * Frees a block index, clearing its data and marking it unallocated.
   * @param index Block index to free
   */
  freeIndex(index: number): void {
    if (index < 0 || index >= this.capacity) {
      throw new Error(`Invalid block index: ${index}`);
    }

    // Mark as unallocated
    this.allocated[index] = 0;

    // Clear all fields
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

    this.ownerShipId[index] = 0;
    this.ownerFaction[index] = 0;
    this.typeIndex[index] = 0;

    this.isShielded[index] = 0;
    this.shieldEfficiency[index] = 0;
    this.shieldHighlightColor[index] = 0;
    this.shieldSourceId[index] = -1;

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

    // Recycle the index
    this.freeList.push(index);
  }

  /**
   * Checks whether a given index is currently allocated (active).
   * @param index Block index
   * @returns true if allocated, false otherwise
   */
  isAllocated(index: number): boolean {
    if (index < 0 || index >= this.capacity) return false;
    return this.allocated[index] === 1;
  }

  /**
   * Clears all data and resets the store to initial state.
   */
  clear(): void {
    this.count = 0;
    this.freeList.length = 0;
    this.allocated.fill(0);

    // Zero out all arrays
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

    this.ownerShipId.fill(0);
    this.ownerFaction.fill(0);
    this.typeIndex.fill(0);

    this.isShielded.fill(0);
    this.shieldEfficiency.fill(0);
    this.shieldHighlightColor.fill(0);
    this.shieldSourceId.fill(-1);

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
