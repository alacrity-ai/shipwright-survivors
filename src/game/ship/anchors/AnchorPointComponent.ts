// ────────────────────────────────────────────────────────────────────────────────
// AnchorPointComponent: Holds a fixed SOA of anchor point positions for a ship.
// Provides methods to assign anchors to enemies (random or least-occupied) and
// to update positions when the ship moves. Rotation is ignored (anchors remain
// fixed relative to world axes, forming a + sign).
// ────────────────────────────────────────────────────────────────────────────────

export interface AnchorPointSOA {
  count: number;
  x: Float32Array;
  y: Float32Array;
  occupancy: Uint16Array; // How many enemies currently "own" this anchor
}

export class AnchorPointComponent {
  private readonly soa: AnchorPointSOA;
  private readonly baseOffsets: { x: number; y: number }[];

  constructor(private readonly ownerId: string) {
    const count = 5;

    this.soa = {
      count,
      x: new Float32Array(count),
      y: new Float32Array(count),
      occupancy: new Uint16Array(count),
    };

    // Base offsets (relative to ship center)
    this.baseOffsets = [
      { x: 0, y: 0 },     // Center
      { x: 0, y: -800 },  // Up (negative Y is up in most world coords)
      { x: 800, y: 0 },   // Right
      { x: 0, y: 800 },   // Down
      { x: -800, y: 0 },  // Left
    ];

    // Initialize positions to (0,0)
    for (let i = 0; i < count; i++) {
      this.soa.x[i] = this.baseOffsets[i].x;
      this.soa.y[i] = this.baseOffsets[i].y;
      this.soa.occupancy[i] = 0;
    }
  }

  /**
   * Updates anchor point world coordinates from the given ship transform.
   * Ignores rotation – anchors remain a static + pattern around the center.
   */
  public updateFromTransform(transform: { position: { x: number; y: number } }): void {
    const base = this.baseOffsets;
    const soa = this.soa;
    const cx = transform.position.x;
    const cy = transform.position.y;

    for (let i = 0; i < soa.count; i++) {
      soa.x[i] = cx + base[i].x;
      soa.y[i] = cy + base[i].y;
    }
  }

  /**
   * Assigns an anchor index to a requester.
   * Uses least-occupied strategy (ties broken randomly) for even distribution.
   */
  public getAnchorPointAssignment(): number {
    const occ = this.soa.occupancy;
    let minOcc = occ[0];
    let candidates: number[] = [0];

    for (let i = 1; i < occ.length; i++) {
      if (occ[i] < minOcc) {
        minOcc = occ[i];
        candidates.length = 0;
        candidates.push(i);
      } else if (occ[i] === minOcc) {
        candidates.push(i);
      }
    }

    // Pick randomly among equally free anchors
    const chosen = candidates.length > 1
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : candidates[0];

    occ[chosen]++; // Increment occupancy
    return chosen;
  }

  /** Releases an anchor slot (e.g., enemy died or disengaged). */
  public releaseAnchor(index: number): void {
    if (index >= 0 && index < this.soa.count && this.soa.occupancy[index] > 0) {
      this.soa.occupancy[index]--;
    }
  }

  /** Used by consumers to get anchor coordinates */
  public getAnchorX(index: number): number {
    return this.soa.x[index];
  }

  public getAnchorY(index: number): number {
    return this.soa.y[index];
  }


  /** Clears all occupancy (e.g., when resetting a level). */
  public resetOccupancy(): void {
    this.soa.occupancy.fill(0);
  }

  /** Returns how many anchors this ship has (fixed: 5). */
  public getAnchorCount(): number {
    return this.soa.count;
  }
}
