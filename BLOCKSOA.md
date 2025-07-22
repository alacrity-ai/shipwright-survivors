# Block SOA Implementation

## Problem Statement

The current block system is fundamentally **object-oriented and map-heavy**, which is at odds with the rest of our engine’s SOA-driven, cache-friendly approach. Each block in the game is represented as a `BlockInstance` object, containing fields such as `position` (grid-relative), `hp`, `ownerShipId`, `ownerFaction`, `hidden`, and references to its `BlockType` (static definition from a registry).

Ships (`CompositeBlockObject`) own their blocks as:

- A `Map<CoordKey, { coord, block }>` for all blocks,
    
- `blockToCoordMap` and `blockIdMap` for lookups,
    
- Per-category convenience caches (turrets, engines, etc.),
    
- A cached `getAllBlocks()` list for iteration.
    

Every system (combat, rendering, spatial queries, AoE effects, AI) iterates blocks via `forEachBlock` or by allocating arrays from `getAllBlocks()`. This causes:

- **High GC churn** from transient arrays and object allocations,
    
- **Poor cache locality** due to scattered object references,
    
- **Duplicated work** when broad-phase systems (e.g., spatial grid) must still descend into per-ship maps,
    
- **Performance bottlenecks** in heavy scenarios with thousands of blocks.
    

The `Grid` system, which tracks blocks in spatial cells for collision and raycasting, also uses `BlockInstance[]` in nested `Map`s, amplifying these issues. Even though most other subsystems (projectiles, particles, AI) have moved to SOA, blocks remain a major outlier.

---

## High-Level Solution

Introduce a **global, SOA-based block management system** that stores _all_ block instances in preallocated, contiguous typed arrays. Blocks will no longer be full-fledged objects but indices into these arrays, with fields like `localX`, `localY`, `worldX`, `worldY`, `hp`, `ownerShipId`, `ownerFaction`, `typeIndex`, and `hidden`.

Ships will no longer _own_ blocks directly; instead:

- Each ship keeps a list (`Uint32Array` or `number[]`) of its block indices.
    
- The old `BlockInstance` interface will be reduced to a thin view/adaptor for debugging and UI during migration.
    

This centralization enables:

- Cache-friendly iteration over _all_ blocks for rendering, physics, and AoE checks.
    
- Simplified, allocation-free spatial queries.
    
- Fast bulk transforms (e.g., updating all world positions per ship via rotation/translation).
    
- Easy integration with instanced rendering pipelines and SIMD/JIT optimizations.
    

---

## Core Classes

The system will be divided into three cooperating components:

### 1. **`BlockStore`**

The low-level data container:

- Holds the SOA arrays (`localX`, `localY`, `worldX`, `worldY`, `hp`, `typeIndex`, etc.).
    
- Tracks `count` of active blocks.
    
- Manages a **free list** for recycling indices when blocks are removed.
    
- Provides raw, high-performance access for systems that can work directly on indices.
    

### 2. **`BlockOrchestrator`**

The coordination layer and public API:

- Handles creation, destruction, and updates of blocks (allocating/releasing indices in `BlockStore`).
    
- Synchronizes per-ship index lists (`shipId → Uint32Array of indices`).
    
- Drives bulk updates like `updateWorldPositions(shipId)` (hoisting `cos`/`sin` per ship).
    
- Exposes compatibility methods so legacy systems can still work with `BlockInstance`-like access until they are migrated.
    

### 3. **`BlockSpatialGrid`**

SOA-native spatial partitioning:

- Replaces the old `Grid`’s reliance on `BlockInstance[]`.
    
- Tracks **block indices directly** in each spatial cell (optionally segmented by faction).
    
- Supports efficient queries: `getBlocksInArea`, `getBlocksAlongRay`, `getBlocksInCell`, etc., without allocating arrays or descending into ship maps.
    

---

## Migration Plan

### Phase 1: Introduce the SOA Layer (Shadow Mode)

- Implement `BlockStore` and `BlockOrchestrator`.
    
- Mirror all `BlockInstance` creation and destruction into the SOA, so both systems are kept in sync.
    
- No consumer refactors yet; the SOA is passive and non-authoritative.
    

### Phase 2: Migrate Stateless, Performance-Critical Systems

- Move **rendering** to consume `BlockStore` arrays directly.
    
- Replace `CompositeBlockObjectGrid` with `BlockSpatialGrid` for broad-phase queries.
    
- Update AoE damage and projectile collision to iterate block indices from `BlockStore` instead of calling `forEachBlock`.
    

### Phase 3: Transition Stateful Systems

- Gradually port combat, construction, destruction, and AI logic to write/read directly from `BlockStore`.
    
- For a time, keep `BlockInstance.hp`, `BlockInstance.position`, etc. in sync for legacy systems.
    

### Phase 4: Remove Legacy Structures

- Reduce `BlockInstance` to a thin index-based view (for debugging/UI only).
    
- Eliminate all per-ship `Map`s and `getAllBlocks()` allocations.
    
- Fully replace the old `Grid` with `BlockSpatialGrid`.
    

At the end of this process, **all block state lives in a centralized, SOA-driven system**, with zero per-frame allocations, near-optimal cache locality, and no duplicated per-ship containers.


# Fine Details

Existing Block Instance:

```
// src/game/interfaces/BlockInstance.ts

import type { BlockType } from '@/game/interfaces/types/BlockType';

import { Faction } from '@/game/interfaces/types/Faction';

interface CellRef {
  cellArr: BlockInstance[];
  index:   number;          // slot within cellArr
  cellKey: number;          // packed (cellX<<16)|cellY   — enables O(1) row lookup
}

export interface BlockInstance {
  id: string;             // UUID
  type: BlockType;       // reference to immutable block definition
  hp: number;            // current health
  ownerShipId: string;   // unique ID of the ship this block belongs to
  ownerShipNumericId: number;   // numeric ID of the ship this block belongs to (for flamethrower)
  ownerFaction: Faction;
  indestructible?: boolean; // if true, block cannot be destroyed
  cooldown?: number;     // used for turret/engine action delay
  rotation?: number;     // degrees: 0, 90, 180, 270
  position?: { x: number; y: number };  // relative position of the block within the ship
  isShielded?: boolean;  // is this block currently under the effects of a shield?
  shieldEfficiency?: number; // efficiency of the shield protecting this block
  shieldHighlightColor?: string;
  shieldSourceId?: string;
  hidden?: boolean;
  _cell?: CellRef;  // Transient Metadata
  _cellFaction?: { cellArr: BlockInstance[]; index: number; cellKey: number };
  destroyed: boolean;
}
```

Existing Grid:
```
// src/systems/physics/Grid.ts

import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { Faction } from '@/game/interfaces/types/Faction';

export interface RaycastHit {
  block: BlockInstance;
  point: { x: number; y: number };
}

export class Grid {
  private cells: Map<number, Map<number, BlockInstance[]>> = new Map();
  private factionCells: Map<Faction, Map<number, Map<number, BlockInstance[]>>> = new Map();
  private cellSize: number;

  private packKey = (x: number, y: number) => (x << 16) ^ (y & 0xFFFF);

  constructor(cellSize: number = 256) {
    this.cellSize = cellSize;
  }

  private getCellCoords(x: number, y: number): [number, number] {
    return [Math.floor(x / this.cellSize), Math.floor(y / this.cellSize)];
  }

  private getOrCreateCell(map: Map<number, Map<number, BlockInstance[]>>, cellX: number, cellY: number): BlockInstance[] {
    let row = map.get(cellX);
    if (!row) {
      row = new Map();
      map.set(cellX, row);
    }
    let cell = row.get(cellY);
    if (!cell) {
      cell = [];
      row.set(cellY, cell);
    }
    return cell;
  }

  private getFactionMap(faction: Faction): Map<number, Map<number, BlockInstance[]>> {
    let factionMap = this.factionCells.get(faction);
    if (!factionMap) {
      factionMap = new Map();
      this.factionCells.set(faction, factionMap);
    }
    return factionMap;
  }

  private getCellSources(excludeFaction?: Faction): Map<number, Map<number, BlockInstance[]>>[] {
    if (!excludeFaction) return [this.cells];
    const result: Map<number, Map<number, BlockInstance[]>>[] = [];
    for (const [faction, map] of this.factionCells) {
      if (faction !== excludeFaction) result.push(map);
    }
    return result;
  }

  addBlockToCell(block: BlockInstance): void {
    const { x, y } = block.position!;
    const [cx, cy] = this.getCellCoords(x, y);
    const key      = this.packKey(cx, cy);

    /* ── GLOBAL MAP ───────────────────────────────────────────── */
    const cell = this.getOrCreateCell(this.cells, cx, cy);
    if (!block._cell || block._cell.cellKey !== key) {
      cell.push(block);
      block._cell = { cellArr: cell, index: cell.length - 1, cellKey: key };
    }

    /* ── FACTION MAP ──────────────────────────────────────────── */
    const fMap  = this.getFactionMap(block.ownerFaction);
    const fCell = this.getOrCreateCell(fMap, cx, cy);

    // Avoid double‑push when global/faction share the same array reference
    if (fCell !== cell && (!block._cellFaction || block._cellFaction.cellKey !== key)) {
      fCell.push(block);
      block._cellFaction = { cellArr: fCell, index: fCell.length - 1, cellKey: key };
    }
  }

  removeBlockFromCell(block: BlockInstance): void {
    /* -------- global pointer -------- */
    const refGlobal = block._cell;
    if (refGlobal) {
      const { cellArr, index, cellKey } = refGlobal;
      const last = cellArr.pop()!;
      if (index < cellArr.length) {
        cellArr[index]      = last;
        last._cell!.index   = index;
      }
      block._cell = undefined;

      if (cellArr.length === 0) {
        const cx = cellKey >> 16, cy = cellKey & 0xFFFF;
        const row = this.cells.get(cx);
        row?.delete(cy);
        if (row?.size === 0) this.cells.delete(cx);
      }
    }

    /* -------- faction pointer -------- */
    const refFac = block._cellFaction;
    if (refFac) {
      const { cellArr, index, cellKey } = refFac;
      const last = cellArr.pop()!;
      if (index < cellArr.length) {
        cellArr[index]            = last;
        last._cellFaction!.index  = index;
      }
      block._cellFaction = undefined;

      if (cellArr.length === 0) {
        const cx = cellKey >> 16, cy = cellKey & 0xFFFF;
        const row = this.getFactionMap(block.ownerFaction).get(cx);
        row?.delete(cy);
        if (row?.size === 0) this.getFactionMap(block.ownerFaction).delete(cx);
      }
    }
  }

  /** Re‑homes a block if it has migrated to a different cell. */
  public rehomeBlock(block: BlockInstance): void {
    const { x, y } = block.position!;
    const [cx, cy] = this.getCellCoords(x, y);
    const newKey   = this.packKey(cx, cy);

    // Fast path: still inside the same spatial cell
    if (block._cell && block._cell.cellKey === newKey) {
      return;                                   // nothing to do
    }

    /* Cell transition → full detach/attach */
    this.removeBlockFromCell(block);            // O(1)
    this.addBlockToCell(block);                 // O(1)
  }

  // Additional Bulk Methods
  removeBlocksFromCells(blocks: BlockInstance[]): void {
    for (const block of blocks) {
      this.removeBlockFromCell(block);
    }
  }

  getBlocksInCell(x: number, y: number, excludeFaction?: Faction): BlockInstance[] {
    const [cellX, cellY] = this.getCellCoords(x, y);
    return this.getBlocksInCellByCoords(cellX, cellY, excludeFaction);
  }

  // Getters
  getBlocksInCellByCoords(cellX: number, cellY: number, excludeFaction?: Faction): BlockInstance[] {
    const sources = this.getCellSources(excludeFaction);
    const result: BlockInstance[] = [];
    for (const map of sources) {
      const row = map.get(cellX);
      if (!row) continue;
      const cell = row.get(cellY);
      if (cell) result.push(...cell);
    }
    return result;
  }

  getRelevantCells(pos: { x: number; y: number }): { x: number; y: number }[] {
    const centerX = Math.floor(pos.x / this.cellSize);
    const centerY = Math.floor(pos.y / this.cellSize);

    const cells = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        cells.push({ x: centerX + dx, y: centerY + dy });
      }
    }
    return cells;
  }

  getAllBlocksInCells(minX: number, minY: number, maxX: number, maxY: number, excludeFaction?: Faction): BlockInstance[] {
    const blocks: BlockInstance[] = [];
    const sources = this.getCellSources(excludeFaction);

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        for (const map of sources) {
          const row = map.get(cx);
          if (!row) continue;
          const cell = row.get(cy);
          if (cell) blocks.push(...cell);
        }
      }
    }

    return blocks;
  }

  getBlocksInArea(minX: number, minY: number, maxX: number, maxY: number, excludeFaction?: Faction): BlockInstance[] {
    const minCellX = Math.floor(minX / this.cellSize);
    const minCellY = Math.floor(minY / this.cellSize);
    const maxCellX = Math.floor(maxX / this.cellSize);
    const maxCellY = Math.floor(maxY / this.cellSize);
    return this.getAllBlocksInCells(minCellX, minCellY, maxCellX, maxCellY, excludeFaction);
  }

  getBlocksAlongRay(
    start: { x: number; y: number },
    end: { x: number; y: number },
    beamThickness: number = 0,
    excludeFaction?: Faction
  ): BlockInstance[] {
    const blocksHit: Set<BlockInstance> = new Set();

    const dx = end.x - start.x;
    const dy = end.y - start.y;

    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;

    const tDeltaX = Math.abs(this.cellSize / dx);
    const tDeltaY = Math.abs(this.cellSize / dy);

    let x = Math.floor(start.x / this.cellSize);
    let y = Math.floor(start.y / this.cellSize);

    const endX = Math.floor(end.x / this.cellSize);
    const endY = Math.floor(end.y / this.cellSize);

    const xOffset = dx > 0
      ? (x + 1) * this.cellSize - start.x
      : start.x - x * this.cellSize;
    const yOffset = dy > 0
      ? (y + 1) * this.cellSize - start.y
      : start.y - y * this.cellSize;

    let tMaxX = Math.abs(xOffset / dx);
    let tMaxY = Math.abs(yOffset / dy);

    const maxSteps = 500;
    let sideOffsets: [number, number][] = [[0, 0]];

    if (beamThickness > 0) {
      const radius = beamThickness / 2;
      const mag = Math.sqrt(dx * dx + dy * dy);
      const dirX = dx / mag;
      const dirY = dy / mag;
      const normalX = -dirY;
      const normalY = dirX;
      const cellRadius = Math.ceil(radius / this.cellSize);
      const seen = new Set<number>();
      sideOffsets = [];

      for (let i = -cellRadius; i <= cellRadius; i++) {
        const offsetX = Math.round(normalX * i);
        const offsetY = Math.round(normalY * i);
        const hash = (offsetX << 8) ^ offsetY;
        if (!seen.has(hash)) {
          seen.add(hash);
          sideOffsets.push([offsetX, offsetY]);
        }
      }
    }

    for (let steps = 0; steps < maxSteps; steps++) {
      for (const [ox, oy] of sideOffsets) {
        const cx = x + ox;
        const cy = y + oy;
        const blocks = this.getBlocksInCellByCoords(cx, cy, excludeFaction);
        for (const block of blocks) {
          blocksHit.add(block);
        }
      }

      if (x === endX && y === endY) break;

      if (tMaxX < tMaxY) {
        tMaxX += tDeltaX;
        x += stepX;
      } else {
        tMaxY += tDeltaY;
        y += stepY;
      }
    }

    return Array.from(blocksHit);
  }

  getFirstBlockAlongRay(
    origin: { x: number; y: number },
    target: { x: number; y: number },
    excludeFaction?: Faction
  ): RaycastHit | null {
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag === 0) return null;

    const rayDir = { x: dx / mag, y: dy / mag };
    const blocks = this.getBlocksAlongRay(origin, target, 0, excludeFaction);

    let closestHit: RaycastHit | null = null;
    let closestT = Infinity;

    for (const block of blocks) {
      const pos = block.position!;
      const half = this.cellSize / 2;
      const min = { x: pos.x - half, y: pos.y - half };
      const max = { x: pos.x + half, y: pos.y + half };

      const result = rayIntersectsAABB(origin, rayDir, min, max);
      if (result.hit && result.tmin >= 0 && result.tmin < closestT && result.tmin <= mag) {
        closestT = result.tmin;
        closestHit = {
          block,
          point: {
            x: origin.x + rayDir.x * result.tmin,
            y: origin.y + rayDir.y * result.tmin
          }
        };
      }
    }

    return closestHit;
  }

  clear(): void {
    this.cells.clear();
    this.factionCells.clear();
  }
}

function rayIntersectsAABB(
  rayStart: { x: number; y: number },
  rayDir: { x: number; y: number },
  boxMin: { x: number; y: number },
  boxMax: { x: number; y: number }
): { hit: boolean; tmin: number } {
  const invDirX = 1 / rayDir.x;
  const invDirY = 1 / rayDir.y;

  let t1 = (boxMin.x - rayStart.x) * invDirX;
  let t2 = (boxMax.x - rayStart.x) * invDirX;
  let t3 = (boxMin.y - rayStart.y) * invDirY;
  let t4 = (boxMax.y - rayStart.y) * invDirY;

  const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
  const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));

  return { hit: tmax >= Math.max(0, tmin), tmin };
}
```

How blocks are being consumed:
Example Usage in Entity Rendering Pass:

```
// src/rendering/unified/passes/EntityPass.ts

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { Camera } from '@/core/Camera';
import type { InputManager } from '@/core/InputManager';
import { BLOCK_SIZE } from '@/config/view';
import { getDamageLevel, initializeUnifiedBlockAtlas, getBlockAtlasUVOffset } from '@/rendering/cache/BlockSpriteCache';
import { entityFrameBudgetMs } from '@/config/graphicsConfig';

import entityVertSrc from '../shaders/entityPass.vert?raw';
import entityFragSrc from '../shaders/entityPass.frag?raw';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { createQuadBuffer2 as createQuadBuffer } from '@/rendering/unified/utils/bufferUtils';

const FLOATS_PER_INSTANCE = 12; // 12 float attributes per block
const MAX_BLOCK_INSTANCES = 8192; // Conservative upper bound for blocks with overlays
const INSTANCE_BUFFER_SIZE = MAX_BLOCK_INSTANCES * FLOATS_PER_INSTANCE;

export class EntityPass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;

  private readonly blockAtlasTexture: WebGLTexture;

  private tileSize: [number, number];

  private frameBudgetMs: number = entityFrameBudgetMs;

  private ambientLight: [number, number, number] = [3.2, 3.2, 3.2];

  // ─── GC-Optimized Reusable Buffers ─────────────────────────────────────
  private readonly instanceData = new Float32Array(INSTANCE_BUFFER_SIZE);
  private instanceCount = 0;
  private dataIndex = 0;

  // Pre-allocated reusable objects to avoid allocations in hot paths
  private readonly tempColor = { r: 0, g: 0, b: 0 };
  private readonly tempTransform = { x: 0, y: 0, rotation: 0 };

  private readonly uniforms: {
    uBlockScale: WebGLUniformLocation | null;
    uLightMap: WebGLUniformLocation | null;
    uTime: WebGLUniformLocation | null;
    uCollisionColor: WebGLUniformLocation | null;
    uUseCollisionColor: WebGLUniformLocation | null;
    uAmbientLight: WebGLUniformLocation | null;
    uBlockColorIntensity: WebGLUniformLocation | null;

    uBlockAtlas: WebGLUniformLocation | null;
    uTileSize: WebGLUniformLocation | null;
  };

  constructor(
    gl: WebGL2RenderingContext,
    private readonly inputManager?: InputManager
  ) {
    this.gl = gl;
    this.program = createProgramFromSources(gl, entityVertSrc, entityFragSrc);

    const atlas = initializeUnifiedBlockAtlas(gl);
    this.blockAtlasTexture = atlas.texture;
    this.tileSize = [atlas.tileWidth, atlas.tileHeight];

    // ─── Camera Uniform Block ──────────────────────────────────────────────
    const blockIndex = gl.getUniformBlockIndex(this.program, 'CameraBlock');
    if (blockIndex !== gl.INVALID_INDEX) {
      gl.uniformBlockBinding(this.program, blockIndex, 0);
    }

    // ─── Geometry and Instance Buffers ─────────────────────────────────────
    this.quadBuffer = createQuadBuffer(gl);
    this.instanceBuffer = gl.createBuffer()!;
    this.vao = gl.createVertexArray()!;

    gl.bindVertexArray(this.vao);

    // ── Static Quad Geometry ──
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); // aVertex
    gl.vertexAttribDivisor(0, 0);

    // ── Instanced Block Data ──
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);

    const stride = 12 * 4;
    let offset = 0;

    // location = 1 → vec2 aPos
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(1, 1);
    offset += 8;

    // location = 2 → float aRotation
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(2, 1);
    offset += 4;

    // location = 3 → vec2 aBaseUV
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(3, 1);
    offset += 8;

    // location = 4 → vec2 aOverlayUV
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 2, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(4, 1);
    offset += 8;

    // location = 5 → float aUseOverlay
    gl.enableVertexAttribArray(5);
    gl.vertexAttribPointer(5, 1, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(5, 1);
    offset += 4;

    // location = 6 → vec3 aColor
    gl.enableVertexAttribArray(6);
    gl.vertexAttribPointer(6, 3, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(6, 1);
    offset += 12;

    // location = 7 → float aUseColor
    gl.enableVertexAttribArray(7);
    gl.vertexAttribPointer(7, 1, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(7, 1);
    // Total: 12 floats = 48 bytes

    gl.bindVertexArray(null);

    // ─── Uniforms ──────────────────────────────────────────────────────────
    this.uniforms = {
      uBlockScale: gl.getUniformLocation(this.program, 'uBlockScale'),
      uLightMap: gl.getUniformLocation(this.program, 'uLightMap'),
      uTime: gl.getUniformLocation(this.program, 'uTime'),
      uCollisionColor: gl.getUniformLocation(this.program, 'uCollisionColor'),
      uUseCollisionColor: gl.getUniformLocation(this.program, 'uUseCollisionColor'),
      uAmbientLight: gl.getUniformLocation(this.program, 'uAmbientLight'),
      uBlockColorIntensity: gl.getUniformLocation(this.program, 'uBlockColorIntensity'),

      uBlockAtlas: gl.getUniformLocation(this.program, 'uBlockAtlas'),
      uTileSize: gl.getUniformLocation(this.program, 'uTileSize'),
    };
  }

  setFrameBudget(ms: number): void {
    this.frameBudgetMs = ms;
  }

  /**
   * GC-free helper to parse hex color into RGB components
   * Reuses tempColor object to avoid allocations
   */
  private parseHexColor(hex: string): { r: number; g: number; b: number } {
    this.tempColor.r = parseInt(hex.slice(1, 3), 16) / 255;
    this.tempColor.g = parseInt(hex.slice(3, 5), 16) / 255;
    this.tempColor.b = parseInt(hex.slice(5, 7), 16) / 255;
    return this.tempColor;
  }

  /**
   * GC-free helper to add instance data to the buffer
   * Directly writes to Float32Array to avoid intermediate allocations
   */
  private addInstanceData(
    worldX: number, worldY: number,
    rotation: number,
    baseUVX: number, baseUVY: number,
    overlayUVX: number, overlayUVY: number,
    useOverlay: number,
    colorR: number, colorG: number, colorB: number,
    useColor: number
  ): void {
    // Bounds check to prevent buffer overflow
    if (this.dataIndex + FLOATS_PER_INSTANCE > INSTANCE_BUFFER_SIZE) {
      console.warn('EntityPass: Instance buffer overflow, skipping remaining blocks');
      return;
    }

    const data = this.instanceData;
    const idx = this.dataIndex;

    data[idx] = worldX;
    data[idx + 1] = worldY;
    data[idx + 2] = rotation;
    data[idx + 3] = baseUVX;
    data[idx + 4] = baseUVY;
    data[idx + 5] = overlayUVX;
    data[idx + 6] = overlayUVY;
    data[idx + 7] = useOverlay;
    data[idx + 8] = colorR;
    data[idx + 9] = colorG;
    data[idx + 10] = colorB;
    data[idx + 11] = useColor;

    this.dataIndex += FLOATS_PER_INSTANCE;
  }

  render(entities: CompositeBlockObject[], lightTexture: WebGLTexture, camera: Camera): void {
    const { gl } = this;
    const now = performance.now();
    const deadline = now + this.frameBudgetMs;
    const time = now / 1000;

    if (entities.length === 0) return;

    // ─── Reset Instance Data Buffer ────────────────────────────────────────
    this.dataIndex = 0;
    this.instanceCount = 0;

    // ─── Per-frame GL State ────────────────────────────────────────────────
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // ─── Shared Uniforms ───────────────────────────────────────────────────
    gl.uniform2f(this.uniforms.uBlockScale, BLOCK_SIZE, BLOCK_SIZE);
    gl.uniform1f(this.uniforms.uTime, time);
    gl.uniform3f(this.uniforms.uAmbientLight, ...this.ambientLight);
    gl.uniform1f(this.uniforms.uBlockColorIntensity, 1.0); // Or desired factor

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, lightTexture);
    gl.uniform1i(this.uniforms.uLightMap, 1);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.blockAtlasTexture);
    gl.uniform1i(this.uniforms.uBlockAtlas, 0);
    gl.uniform2f(this.uniforms.uTileSize, this.tileSize[0], this.tileSize[1]);

    // ─── Per-Instance Aggregation (GC-Optimized) ───────────────────────────
    for (const entity of entities) {
      const transform = entity.getTransform();
      
      // Reuse temp object to avoid allocation
      this.tempTransform.x = transform.position.x;
      this.tempTransform.y = transform.position.y;
      this.tempTransform.rotation = transform.rotation;

      const cosRot = Math.cos(this.tempTransform.rotation);
      const sinRot = Math.sin(this.tempTransform.rotation);

      const colorOverride = entity.getBlockColor?.();
      let colorR = 0, colorG = 0, colorB = 0, useColor = 0;

      if (colorOverride) {
        const color = this.parseHexColor(colorOverride);
        colorR = color.r;
        colorG = color.g;
        colorB = color.b;
        useColor = 1;
      }

      entity.forEachBlock((coord, block) => {
        if (performance.now() > deadline) return;
        if (block.hidden) return;

        const localX = coord.x * BLOCK_SIZE;
        const localY = coord.y * BLOCK_SIZE;
        const worldX = this.tempTransform.x + localX * cosRot - localY * sinRot;
        const worldY = this.tempTransform.y + localX * sinRot + localY * cosRot;
        const localRotation = (block.rotation ?? 0) * Math.PI / 180;
        const composedRotation = this.tempTransform.rotation + localRotation;

        const damageLevel = getDamageLevel(block.hp, block.type.armor ?? 1);
        const { baseUV, overlayUV } = getBlockAtlasUVOffset(block.type.id, damageLevel);

        // ─── Base layer ────────────────────────────────────────
        this.addInstanceData(
          worldX, worldY,
          composedRotation,
          baseUV[0], baseUV[1],
          0, 0, // no overlay UV
          0,    // aUseOverlay = false
          colorR, colorG, colorB,
          useColor
        );

        // ─── Overlay layer (if present) ────────────────────────
        if (overlayUV) {
          const overlayRotation = composedRotation; // optionally compute overlay-specific
          this.addInstanceData(
            worldX, worldY,
            overlayRotation,
            0, 0, // no baseUV
            overlayUV[0], overlayUV[1],
            1,    // aUseOverlay = true
            colorR, colorG, colorB,
            useColor
          );
        }
      });
    }

    // ─── Upload Instance Buffer ────────────────────────────────────────────
    this.instanceCount = this.dataIndex / FLOATS_PER_INSTANCE;
    
    if (this.instanceCount === 0) {
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
      gl.useProgram(null);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    
    // Use subarray to avoid copying unused portions of the buffer
    const usedData = this.instanceData.subarray(0, this.dataIndex);
    gl.bufferData(gl.ARRAY_BUFFER, usedData, gl.DYNAMIC_DRAW);

    // ─── Draw Call ─────────────────────────────────────────────────────────
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.instanceCount);

    // ─── Cleanup ───────────────────────────────────────────────────────────
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  setAmbientLight(value: [number, number, number]): void {
    this.ambientLight = value;
  }

  /**
   * Get current memory usage statistics for debugging
   */
  getMemoryStats(): { 
    bufferSize: number; 
    usedInstances: number; 
    utilization: number;
    estimatedMemoryKB: number;
  } {
    const estimatedMemoryKB = (INSTANCE_BUFFER_SIZE * 4) / 1024; // 4 bytes per float
    return {
      bufferSize: INSTANCE_BUFFER_SIZE,
      usedInstances: this.instanceCount,
      utilization: this.instanceCount / MAX_BLOCK_INSTANCES,
      estimatedMemoryKB
    };
  }

  destroy(): void {
    const { gl } = this;
    if (gl.isBuffer(this.instanceBuffer)) {
      gl.deleteBuffer(this.instanceBuffer);
    }
    if (gl.isProgram(this.program)) gl.deleteProgram(this.program);
    if (gl.isBuffer(this.quadBuffer)) gl.deleteBuffer(this.quadBuffer);
    if (gl.isVertexArray(this.vao)) gl.deleteVertexArray(this.vao);
    if (gl.isTexture(this.blockAtlasTexture)) gl.deleteTexture(this.blockAtlasTexture);
  }
}
```


# PROMPT

Instruction Manual for Generating BlockStore
This manual specifies how to implement BlockStore, the low-level, fixed-capacity data container for all block instances in the game. The AI must generate a TypeScript class that focuses solely on raw memory storage and index management, with no dynamic resizing or gameplay logic.

1. Purpose of BlockStore
BlockStore will serve as the central SOA (Structure-of-Arrays) container for all dynamic block state. It will hold typed arrays for every block attribute and manage allocation/recycling via a free list.

It is strictly mechanical: no ship transforms, no high-level getters, no orchestration. Its role is to be a dense, cache-friendly slab of memory.

2. Fixed Capacity Design
The BlockStore will be created with a fixed capacity, determined at initialization.

There is no growth or shrinkage. If the store is full, allocateIndex must throw or return -1 to signal capacity exhaustion.

This capacity is based on worst-case testing (e.g., thousands of blocks in extreme scenarios).

3. Data Layout
Each blockIndex (0 ≤ index < capacity) maps to a set of fields, stored in parallel typed arrays. These must match the old BlockInstance fields but converted to SOA for cache efficiency.

Fields to Store (as typed arrays):
Spatial / Transform

localX: Float32Array – X coordinate relative to ship origin.

localY: Float32Array – Y coordinate relative to ship origin.

worldX: Float32Array – Cached world X coordinate (set externally).

worldY: Float32Array – Cached world Y coordinate.

rotation: Float32Array – Local rotation in radians (or degrees if consistent).

hidden: Uint8Array – 0 or 1 (block visibility).

Combat / State

hp: Float32Array – Current hit points.

destroyed: Uint8Array – 0 or 1 (destruction flag).

indestructible: Uint8Array – 0 or 1 (invulnerable).

cooldown: Float32Array – Turret/engine action delay.

Ownership & Typing

ownerShipId: Int32Array – Numeric ship ID owning this block.

ownerFaction: Uint8Array – Enum (1=Player, 2=Enemy, 3=Neutral).

typeIndex: Int32Array – Index into the BlockType registry.

Shielding

isShielded: Uint8Array – 0 or 1 (shielded).

shieldEfficiency: Float32Array – Efficiency multiplier.

shieldHighlightColor: Int32Array – Packed RGB or palette index.

shieldSourceId: Int32Array – Numeric ID of shield generator, or -1.

Grid Integration

cellKey: Int32Array – Packed (cellX<<16)|cellY for fast spatial queries.

4. State Tracking
capacity: number – Fixed size of all arrays.

count: number – Number of active (allocated) blocks.

freeList: number[] – Recycled indices for destroyed blocks.

Indices [0, count) must remain dense and contiguous (except for slots recycled via free list).

5. API Surface
The BlockStore class must implement:

Initialization

constructor(capacity: number) – Preallocates all arrays to capacity.

Allocation

allocateIndex(): number

Returns a free slot from freeList if available, otherwise the next sequential index (count++).

If at capacity and no free slots, returns -1 (or throws).

Deallocation

freeIndex(index: number): void

Marks the block as free, zeroes/clears its fields, and pushes the index into freeList.

Access

Expose all typed arrays as public readonly properties so systems can read/write directly:

ts
Copy
Edit
store.hp[index] = 50;
const x = store.worldX[index];
Provide count so consumers can iterate [0, count).

Clearing

clear(): void – Resets count to 0, empties freeList, and zeroes all arrays.

6. Performance Constraints
Zero allocations during runtime (beyond the constructor).

No dynamic resizing — the entire memory slab is preallocated.

No closures or callbacks for iteration; systems must use raw array access.

Cache-friendly, densely packed data for SIMD/JIT-friendly loops.

7. Out of Scope
No ship transforms (cos, sin, etc.).

No accessors like getWorldPosition, getTypeIndex.

No orchestration (BlockOrchestrator) or BlockSpatialGrid.

No compatibility layer for BlockInstance.

BlockStore is purely a data container — nothing more.

AI’s Deliverable
Generate a TypeScript class BlockStore that:

Implements all arrays and fields listed above.

Uses a fixed, preallocated capacity only (no growth).

Provides allocateIndex, freeIndex, clear, and raw array exposure.

Ensures zero allocations during gameplay.