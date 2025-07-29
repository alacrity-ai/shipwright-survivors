// src/game/spatialbodies/SpatialBodyStore.ts

/**
 * A GC-neutral, SOA-based container for static world "spatial bodies"
 * like ice asteroids, magma orbs, meteors, or nebulae.
 *
 * Uses a shared texture atlas per body group:
 * - Each instance stores UVs (normalized 0–1) into the atlas.
 * - Each instance also stores an atlasIndex so the renderer can group
 *   draw calls by bound atlas texture.
 */
export class SpatialBodyStore {
  public readonly capacity: number;
  public count: number = 0;

  private readonly allocated: Uint8Array;
  private readonly freeList: number[] = [];

  // Active indices (for iteration or culling)
  public readonly activeIndices: Uint32Array;
  public activeCount: number = 0;
  private readonly bodyToActivePos: Int32Array;

  // SOA fields for transforms
  public readonly worldX: Float32Array;
  public readonly worldY: Float32Array;
  public readonly rotation: Float32Array;  // radians
  public readonly scale: Float32Array;     // baseScale * variance

  // Atlas batching + UVs
  public readonly atlasIndex: Uint16Array; // Which atlas this instance uses
  public readonly uMin: Float32Array;
  public readonly vMin: Float32Array;
  public readonly uMax: Float32Array;
  public readonly vMax: Float32Array;

  constructor(capacity: number) {
    if (capacity <= 0 || !Number.isInteger(capacity)) {
      throw new Error('SpatialBodyStore capacity must be a positive integer');
    }
    this.capacity = capacity;

    this.allocated = new Uint8Array(capacity);
    this.activeIndices = new Uint32Array(capacity);
    this.bodyToActivePos = new Int32Array(capacity).fill(-1);

    this.worldX = new Float32Array(capacity);
    this.worldY = new Float32Array(capacity);
    this.rotation = new Float32Array(capacity);
    this.scale = new Float32Array(capacity);

    this.atlasIndex = new Uint16Array(capacity);
    this.uMin = new Float32Array(capacity);
    this.vMin = new Float32Array(capacity);
    this.uMax = new Float32Array(capacity);
    this.vMax = new Float32Array(capacity);

    this.allocated.fill(0);
  }

  /**
   * Allocates and initializes a new spatial body instance.
   * All UV and atlas batching information must be provided up front.
   * Returns the allocated index or -1 if capacity is exceeded.
   */
  allocateInstance(
    atlasIndex: number,
    uMin: number,
    vMin: number,
    uMax: number,
    vMax: number,
    x: number,
    y: number,
    scale: number,
    rotation: number
  ): number {
    let index: number;
    if (this.freeList.length > 0) {
      index = this.freeList.pop()!;
    } else {
      if (this.count >= this.capacity) return -1;
      index = this.count++;
    }

    this.allocated[index] = 1;

    // Register into active list
    this.activeIndices[this.activeCount] = index;
    this.bodyToActivePos[index] = this.activeCount++;

    // Set transform
    this.worldX[index] = x;
    this.worldY[index] = y;
    this.scale[index] = scale;
    this.rotation[index] = rotation;

    // Set atlas + UVs
    this.atlasIndex[index] = atlasIndex;
    this.uMin[index] = uMin;
    this.vMin[index] = vMin;
    this.uMax[index] = uMax;
    this.vMax[index] = vMax;

    return index;
  }

  /**
   * Frees a spatial body instance and removes it from active lists.
   */
  freeInstance(index: number): void {
    if (index < 0 || index >= this.capacity || !this.allocated[index]) return;

    this.allocated[index] = 0;

    // Remove from active list (swap with last for O(1) removal)
    const pos = this.bodyToActivePos[index];
    const last = this.activeCount - 1;
    if (pos >= 0 && pos < this.activeCount) {
      if (pos !== last) {
        const movedIdx = this.activeIndices[last];
        this.activeIndices[pos] = movedIdx;
        this.bodyToActivePos[movedIdx] = pos;
      }
      this.activeCount--;
      this.bodyToActivePos[index] = -1;
    }

    // Reset fields
    this.worldX[index] = 0;
    this.worldY[index] = 0;
    this.rotation[index] = 0;
    this.scale[index] = 0;
    this.atlasIndex[index] = 0;
    this.uMin[index] = 0;
    this.vMin[index] = 0;
    this.uMax[index] = 0;
    this.vMax[index] = 0;

    this.freeList.push(index);
  }

  isAllocated(index: number): boolean {
    return index >= 0 && index < this.capacity && this.allocated[index] === 1;
  }

  /**
   * Clears all instances and resets the store.
   */
  clear(): void {
    this.count = 0;
    this.freeList.length = 0;
    this.allocated.fill(0);
    this.activeCount = 0;
    this.bodyToActivePos.fill(-1);

    this.worldX.fill(0);
    this.worldY.fill(0);
    this.rotation.fill(0);
    this.scale.fill(0);
    this.atlasIndex.fill(0);
    this.uMin.fill(0);
    this.vMin.fill(0);
    this.uMax.fill(0);
    this.vMax.fill(0);
  }
}
