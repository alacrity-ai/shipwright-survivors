// src/game/entities/collisionbox/CollisionBoxStore.ts

export class CollisionBoxStore {
  public readonly capacity: number;
  public count: number = 0;
  private freeList: number[] = [];
  private readonly allocated: Uint8Array;

  // Active indices
  public readonly activeIndices: Uint32Array;
  public activeCount: number = 0;
  private readonly boxToActivePos: Int32Array;

  // Local-space extents (always centered on 0,0 for the box itself)
  public readonly localX1: Float32Array;
  public readonly localY1: Float32Array;
  public readonly localX2: Float32Array;
  public readonly localY2: Float32Array;

  // Pivot offset from ship origin to AABB center (in pixels, local space)
  public readonly pivotOffsetX: Float32Array;
  public readonly pivotOffsetY: Float32Array;

  // Cached half-width/half-height (for broad-phase checks)
  public readonly halfWidth: Float32Array;
  public readonly halfHeight: Float32Array;

  // World-space center transform (derived each frame using pivot offset)
  public readonly worldX: Float32Array;
  public readonly worldY: Float32Array;
  public readonly rotation: Float32Array; // radians

  // World-space rotated corner coordinates (OBB corners)
  public readonly worldX1: Float32Array;
  public readonly worldY1: Float32Array;
  public readonly worldX2: Float32Array;
  public readonly worldY2: Float32Array;
  public readonly worldX3: Float32Array;
  public readonly worldY3: Float32Array;
  public readonly worldX4: Float32Array;
  public readonly worldY4: Float32Array;

  // Ownership (ship ID linkage)
  public readonly shipNumericId: Float64Array;

  constructor(capacity: number) {
    if (capacity <= 0 || !Number.isInteger(capacity)) {
      throw new Error("CollisionBoxStore capacity must be a positive integer");
    }

    this.capacity = capacity;
    this.allocated = new Uint8Array(capacity);
    this.activeIndices = new Uint32Array(capacity);
    this.boxToActivePos = new Int32Array(capacity).fill(-1);

    // Local extents (will always be centered)
    this.localX1 = new Float32Array(capacity);
    this.localY1 = new Float32Array(capacity);
    this.localX2 = new Float32Array(capacity);
    this.localY2 = new Float32Array(capacity);

    // Pivot offsets (relative to ship origin)
    this.pivotOffsetX = new Float32Array(capacity);
    this.pivotOffsetY = new Float32Array(capacity);

    this.halfWidth = new Float32Array(capacity);
    this.halfHeight = new Float32Array(capacity);

    this.worldX = new Float32Array(capacity);
    this.worldY = new Float32Array(capacity);
    this.rotation = new Float32Array(capacity);

    this.worldX1 = new Float32Array(capacity);
    this.worldY1 = new Float32Array(capacity);
    this.worldX2 = new Float32Array(capacity);
    this.worldY2 = new Float32Array(capacity);
    this.worldX3 = new Float32Array(capacity);
    this.worldY3 = new Float32Array(capacity);
    this.worldX4 = new Float32Array(capacity);
    this.worldY4 = new Float32Array(capacity);

    this.shipNumericId = new Float64Array(capacity);

    this.allocated.fill(0);
  }

  /**
   * Allocates a new collision box for a ship.
   * Centers the local extents around the AABB centroid
   * and stores the pivot offset relative to the ship's origin.
   */
  allocateIndex(
    shipId: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    worldX = 0,
    worldY = 0,
    rotation = 0
  ): number {
    let index: number;
    if (this.freeList.length > 0) {
      index = this.freeList.pop()!;
    } else {
      if (this.count >= this.capacity) return -1;
      index = this.count++;
    }

    this.allocated[index] = 1;

    // Register in active list
    this.activeIndices[this.activeCount] = index;
    this.boxToActivePos[index] = this.activeCount++;

    this.shipNumericId[index] = shipId;

    // Compute true width and height (x2/y2 already include far edge)
    const width = x2 - x1;
    const height = y2 - y1;

    const halfW = width / 2;
    const halfH = height / 2;

    // Pivot offset: center of the AABB relative to ship origin.
    // Subtract 0.5 block to counter the inclusive far edge (x2/y2).
    const BLOCK_SIZE = 32; // must match the block grid size
    const cx = x1 + halfW - (BLOCK_SIZE * 0.5);
    const cy = y1 + halfH - (BLOCK_SIZE * 0.5);
    this.pivotOffsetX[index] = cx;
    this.pivotOffsetY[index] = cy;

    // Store half extents
    this.halfWidth[index] = halfW;
    this.halfHeight[index] = halfH;

    // Recenter local extents around (0,0) for rotation
    this.localX1[index] = -halfW;
    this.localY1[index] = -halfH;
    this.localX2[index] = +halfW;
    this.localY2[index] = +halfH;

    // Initialize world center and corners
    this.worldX[index] = worldX;
    this.worldY[index] = worldY;
    this.rotation[index] = rotation;

    this.worldX1[index] = worldX;
    this.worldY1[index] = worldY;
    this.worldX2[index] = worldX;
    this.worldY2[index] = worldY;
    this.worldX3[index] = worldX;
    this.worldY3[index] = worldY;
    this.worldX4[index] = worldX;
    this.worldY4[index] = worldY;

    return index;
  }

  /**
   * Frees a collision box entry.
   */
  freeIndex(index: number): void {
    if (index < 0 || index >= this.capacity) {
      throw new Error(`Invalid collision box index: ${index}`);
    }
    if (!this.allocated[index]) return;

    this.allocated[index] = 0;

    // Remove from active list (swap with last)
    const pos = this.boxToActivePos[index];
    const last = this.activeCount - 1;
    if (pos >= 0 && pos < this.activeCount) {
      if (pos !== last) {
        const movedIdx = this.activeIndices[last];
        this.activeIndices[pos] = movedIdx;
        this.boxToActivePos[movedIdx] = pos;
      }
      this.activeCount--;
      this.boxToActivePos[index] = -1;
    }

    // Reset fields
    this.shipNumericId[index] = 0;

    this.localX1[index] = 0;
    this.localY1[index] = 0;
    this.localX2[index] = 0;
    this.localY2[index] = 0;

    this.pivotOffsetX[index] = 0;
    this.pivotOffsetY[index] = 0;

    this.halfWidth[index] = 0;
    this.halfHeight[index] = 0;

    this.worldX[index] = 0;
    this.worldY[index] = 0;
    this.rotation[index] = 0;

    this.worldX1[index] = 0;
    this.worldY1[index] = 0;
    this.worldX2[index] = 0;
    this.worldY2[index] = 0;
    this.worldX3[index] = 0;
    this.worldY3[index] = 0;
    this.worldX4[index] = 0;
    this.worldY4[index] = 0;

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
    this.boxToActivePos.fill(-1);

    this.localX1.fill(0);
    this.localY1.fill(0);
    this.localX2.fill(0);
    this.localY2.fill(0);

    this.pivotOffsetX.fill(0);
    this.pivotOffsetY.fill(0);

    this.halfWidth.fill(0);
    this.halfHeight.fill(0);

    this.worldX.fill(0);
    this.worldY.fill(0);
    this.rotation.fill(0);

    this.worldX1.fill(0);
    this.worldY1.fill(0);
    this.worldX2.fill(0);
    this.worldY2.fill(0);
    this.worldX3.fill(0);
    this.worldY3.fill(0);
    this.worldX4.fill(0);
    this.worldY4.fill(0);

    this.shipNumericId.fill(0);
  }
}
