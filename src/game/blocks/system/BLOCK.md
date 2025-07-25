# Block System (SOA Architecture)

This document describes the **finalized SOA (Structure of Arrays) block system**, which replaces all legacy `BlockInstance` and `CompositeBlockObject` patterns.  
It explains the **architecture**, **data flow**, and **integration points** across the three core subsystems:

1. `BlockStore` – central state container
    
2. `BlockOrchestrator` – ship-aware coordination and lifecycle manager
    
3. `BlockSpatialGrid` – broad-phase spatial partitioning
    

All three are exposed via the `BlockManager` singleton for global access.

---

## Why This Exists (Problem Context)

The legacy block framework relied on:

- One `BlockInstance` object per block (with mutable fields: `hp`, `position`, etc.)
    
- Per-ship nested maps (`Map<CoordKey, BlockInstance>`).
    
- A physics `Grid` storing per-cell `BlockInstance[]`.
    
- Iteration patterns like `getAllBlocks()` creating arrays every frame.
    

This caused:

- **Heavy GC churn** (temporary objects, array copies, nested structures).
    
- **Poor cache locality** (block state scattered across the heap).
    
- **Duplication of data and lookups** (ship → map → block, plus grid).
    
- **Performance bottlenecks** for combat and physics (especially AoE, raycasts, and broad-phase queries).
    

---

## High-Level Architecture

The new system is built around **dense, cache-friendly SOA arrays** and **index-based access**.  
Blocks are no longer objects; instead, every property (position, hp, faction, etc.) lives in its own contiguous typed array.

The system has **three cooperating layers**:

1. **`BlockStore`** – Fixed-capacity container for all block state, index-addressable.
    
2. **`BlockOrchestrator`** – High-level API for creation, destruction, ship block lists, and transform updates.
    
3. **`BlockSpatialGrid`** – Lightweight partitioner for fast spatial queries (AoE, collisions, AI).
    

All field lookups, updates, and queries happen through **indices** into the `BlockStore`.

---

## Core Components

### 1. `BlockStore`

**Path:** `src/game/blocks/system/BlockStore.ts`

The **raw data layer**:

- Stores **all active blocks** in preallocated typed arrays (`Float32Array`, `Uint8Array`, `Int32Array`).
    
- Identified by a dense integer index `0..capacity-1`.
    
- Manages allocation via a `Uint8Array` mask and a free list for recycling slots.
    
- Never resizes at runtime; capacity is fixed (set by `BlockManager`).
    

**Fields (one typed array per):**

- **Spatial / Transform:** `localX`, `localY`, `worldX`, `worldY`, `rotation`, `localRotation`, `overlayRotation`, `hidden`.
    
- **State / Combat:** `hp`, `destroyed`, `indestructible`, `cooldown`.
    
- **Ownership:** `ownerShipId`, `ownerFaction`, `typeIndex`.
    
- **Shielding:** `isShielded`, `shieldEfficiency`, `shieldHighlightColor`, `shieldSourceId`.
    

**Lifecycle Methods:**

```
const idx = store.allocateIndex();  // returns free index or -1 if full
store.freeIndex(idx);               // clears arrays and recycles slot
store.isAllocated(idx);             // quick validity check
store.clear();                      // full reset

```

`BlockStore` has **no awareness of ships or the grid**—it is a pure ECS-style data container.

---

### 2. `BlockOrchestrator`

**Path:** `src/game/blocks/system/BlockOrchestrator.ts`

The **coordination layer**, combining `BlockStore` and `BlockSpatialGrid` into a ship-aware API.

**Responsibilities:**

- Allocate and initialize blocks (`createBlock`, `createAndRegisterBlock`).
    
- Track per-ship block indices in dynamically sized `Uint32Array` lists:
    
    - Growth via doubling, capped by `MAX_SHIP_BLOCKS`.
        
    - Removal via swap-with-last for O(1) deletion.
        
- Compute **world positions and rotations** for all a ship’s blocks:
    
    - Hoists `cos`/`sin` per ship.
        
    - Updates `worldX`, `worldY`, and composed `rotation` in the store.
        
- Integrate with the spatial grid (`registerBlockWithGrid`, `syncSpatialGrid`).
    
- Bulk-update convenience method: `updateShipBlocks(shipId, transform)`.
    

**Usage Example:**

```
const manager = BlockManager.instance;
const orchestrator = manager.getBlockOrchestrator();
const transform = { position: { x: 100, y: 200 }, velocity: { x: 0, y: 0 }, rotation: 0 };

// Create and register a block
const blockIndex = orchestrator.createAndRegisterBlock({
  ownerShipId: 1,
  ownerFaction: 0,
  typeIndex: 2,
  localX: 0,
  localY: 0,
  blockTypeId: 'hull0'
}, transform);

// Update ship blocks (positions + grid) per frame
orchestrator.updateShipBlocks(1, transform);

```

### 3. `BlockSpatialGrid`

**Path:** `src/game/blocks/system/BlockSpatialGrid.ts`

A **broad-phase partitioner** for fast area/raycast queries.  
It stores **block indices only** (not full objects) for maximum performance.

**Key Mechanics:**

- Space is divided into fixed-size cells (`gridCellSize`, default 64).
    
- Each cell holds a dynamically grown `Uint32Array` buffer of block indices.
    
- A reverse map (`blockToCellKey`) tracks where each block currently lives for O(1) rehoming.
    

**APIs:**

```
grid.registerBlock(idx, worldX, worldY);
grid.deregisterBlock(idx);
grid.rehomeBlockIndex(idx, newWorldX, newWorldY);

const candidates = grid.getBlocksInArea(minX, minY, maxX, maxY);
// iterate:
for (let i = 0; i < candidates.length; i++) {
  const idx = candidates[i];
  const x = store.worldX[idx];
  const hp = store.hp[idx];
}

```

All field lookups (position, hp, etc.) come from the `BlockStore`.

---

## `BlockManager` – Global Access Point

**Path:** `src/game/blocks/system/BlockManager.ts`

A singleton that **constructs and exposes** the three subsystems:

```
BlockManager.initialize();
const manager = BlockManager.instance;

manager.getBlockStore();         // Raw SOA arrays
manager.getBlockSpatialGrid();   // Spatial partitioning
manager.getBlockOrchestrator();  // High-level API

```

## Data Flow Summary

1. **Creation**
    
    - Orchestrator allocates index from `BlockStore`, initializes fields, computes initial world position, registers block with `BlockSpatialGrid`.
        
2. **Per-Frame Update**
    
    - For each ship: `updateShipBlocks(shipId, transform)` updates world transforms for all blocks and rehomes them in the grid.
        
3. **Destruction**
    
    - Orchestrator removes the index from ship list, deregisters it from the grid, and frees it in `BlockStore`.
        
4. **Queries**
    
    - Spatial queries (AoE, raycasts, AI) call `BlockSpatialGrid` to retrieve candidate indices, then resolve positions/hp/etc. directly from `BlockStore`.
        

---

## Migration Notes

- **`BlockInstance` objects are deprecated**; they now exist only for UI/debug via `BlockOrchestrator.getBlockInstanceView(index)`.
    
- **All gameplay systems must switch to index-based access**. Example:

```
const store = BlockManager.instance.getBlockStore();
const grid = BlockManager.instance.getBlockSpatialGrid();

const indices = grid.getBlocksInArea(x1, y1, x2, y2);
for (let i = 0; i < indices.length; i++) {
  const idx = indices[i];
  if (store.destroyed[idx]) continue;
  const x = store.worldX[idx];
  const hp = store.hp[idx];
  // process...
}

```

- **No per-frame array allocations**: Always iterate directly over `Uint32Array` buffers.
    
- Legacy `Grid.ts` is fully obsolete. Use `BlockSpatialGrid` for all queries.
    

---

## Performance Characteristics

- **Zero garbage**: All storage is preallocated; free list recycling avoids allocations.
    
- **Optimal cache locality**: Each field is densely packed for SIMD/JIT-optimized iteration.
    
- **Scalable**: Can comfortably handle 100k+ blocks due to SOA layout and cell-based queries.
    
- **Fast updates**: Trig hoisting, O(1) grid rehoming, swap-with-last removals.


# What we've done so far:

1. CompositeBlockObject Refactor
We migrated CompositeBlockObject away from owning a Map<CoordKey, { coord, block: BlockInstance }> as its core state.
Instead:

It now relies on the global BlockManager and BlockOrchestrator for all block lifecycle management.

Each CompositeBlockObject (like Ship) is identified by numericId, and the orchestrator tracks which BlockStore indices belong to it.

Spatial data (localX, localY, rotations, hp, etc.) now live in a Structure-of-Arrays BlockStore, eliminating the heavy BlockInstance objects.

Provided helper APIs such as:

getBlockIndex(coord: GridCoord): number | undefined – lookup by coordinate.

getAllBlockIndices(): number[] – full flat view of this object’s blocks.

hasBlockAt(coord: GridCoord).

Ship still uses these for block placement/removal and validation logic.

This decouples the game’s "block data" from heavy per-object maps, making the system more cache-friendly and GC-neutral.

2. Ship Refactor
The Ship class now:

Stores only BlockStore indices in its subsystem containers:

shieldBlocks, engineBlocks, fuelTankBlocks, harvesterBlocks, haloBladeBlocks, heatSeekerBlocks, etc.

firingPlan is now an array of WeaponFiringPlanEntry objects that each store blockIndex, not BlockInstance.

Placement and removal:

Uses blockOrchestrator.createAndRegisterBlock() to allocate and grid-register blocks.

Uses blockOrchestrator.destroyBlock() or clearShip() for teardown.

Updates all subsystem indices, firing plan, fuel capacity, energy stats, and rasterization flags as part of each operation.

Flood-fill connectivity (isDeletionSafe):

Rebuilt to use the indices and the BlockStore’s localX/localY arrays rather than walking this.blocks.

loadFromJson now drives population entirely through the orchestrator and then triggers all state rebuilds (engine index, heat seekers, halos, etc.).

Removed all BlockInstance usage from ship internals, except transiently in BlockRegistry lookups (getBlockTypeByIndex) for stats.

3. Key Implications
Every downstream system (combat, rendering, AI, physics, serialization) that once iterated over Ship.blocks.values() or passed around BlockInstance objects will now break.

Consumers must:

Use BlockStore indices for all block references.

Resolve data through BlockStore (localX, localY, hp, rotation, typeIndex, etc.).

Only touch BlockInstance (if at all) at the very edge—likely only in debug tools or serialization.