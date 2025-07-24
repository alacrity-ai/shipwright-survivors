# Block System (SOA Implementation)

This document details the **finalized, refactored SOA (Structure of Arrays) block system** for the engine. It describes the architecture, data flow, and integration between `BlockStore`, `BlockOrchestrator`, and `BlockSpatialGrid`. This supersedes all legacy `BlockInstance`/`CompositeBlockObject` structures.

---

## Problem Context

The prior system used:

- `BlockInstance` objects (1 per block), each storing mutable state (`hp`, `position`, etc.).
    
- `CompositeBlockObject` maps (`Map<CoordKey, BlockInstance>`) per ship.
    
- The `Grid` system, which stored `BlockInstance[]` in `Map` buckets.
    
- Per-frame allocations from `getAllBlocks()` or nested map traversal.
    

This caused:

- **Excessive GC churn** from temporary arrays and scattered object allocations.
    
- **Poor cache locality**, degrading CPU performance in heavy combat.
    
- **Duplicate data and lookup chains** (ship → map → block).
    
- **Complexity for systems like AoE effects and projectile collisions**, which needed broad-phase queries.
    

---

## High-Level Solution

The new system uses **centralized, cache-friendly SOA arrays** with three cooperating layers:

1. **`BlockStore`** – The **low-level state container**, holding all block fields as contiguous typed arrays.
    
2. **`BlockOrchestrator`** – The **coordination layer**, handling creation, destruction, per-ship lists, and transform updates.
    
3. **`BlockSpatialGrid`** – The **broad-phase spatial partitioner**, storing block indices directly (no objects) for efficient queries.
    

This yields:

- **Zero per-frame allocations** for iteration or querying.
    
- **Optimal cache locality** for SIMD/JIT-friendly loops.
    
- **Decoupled ownership**: ships just reference block indices (`Uint32Array`).
    
- **Scalable broad-phase performance** for AoE, projectiles, and AI.
    

---

## Core Components

### 1. `BlockStore`

Path: `src/game/blocks/system/BlockStore.ts`

**Responsibilities:**

- Central repository for **all live blocks**, indexed by a dense integer `0..capacity-1`.
    
- Provides **typed arrays** for every field:
    
    - Spatial: `localX`, `localY`, `worldX`, `worldY`, `rotation`, `localRotation`, `overlayRotation`
        
    - State: `hp`, `destroyed`, `indestructible`, `cooldown`
        
    - Ownership: `ownerShipId`, `ownerFaction`, `typeIndex`
        
    - Shielding: `isShielded`, `shieldEfficiency`, `shieldHighlightColor`, `shieldSourceId`
        
    - `hidden` (rendering/visibility flag)
        
- Manages a **free list** for recycling indices, no dynamic array growth.
    

**Removed Responsibility:**  
`BlockStore` no longer tracks spatial **cell keys**. The `BlockSpatialGrid` fully owns cell membership and key computation.

**Key Guarantees:**

- Arrays are preallocated to `capacity` and never resized.
    
- No transient object creation for block state.
    
- `allocateIndex()` and `freeIndex()` handle slot lifecycle.
    

---

### 2. `BlockOrchestrator`

Path: `src/game/blocks/system/BlockOrchestrator.ts`

**Responsibilities:**

- High-level API for **creating, destroying, and updating blocks**.
    
- Tracks per-ship block lists:
    
    - `Map<shipId, Uint32Array>` storing block indices.
        
    - Uses **swap-with-last removal** and **dynamic growth** (doubling capacity).
        
- Updates **world positions and rotations** for all blocks on a ship using `updateWorldPositions()`, hoisting `cos`/`sin` per ship.
    
- Provides `updateShipBlocks()`, combining position updates and spatial grid syncing in one call.
    
- Handles integration with `BlockSpatialGrid` for registration, deregistration, and rehoming.
    

**Legacy Compatibility:**  
Offers `getBlockInstanceView()` for debug/UI, returning a thin read-only object. It no longer exposes `cellKey` (removed).

---

### 3. `BlockSpatialGrid`

Path: `src/game/blocks/system/BlockSpatialGrid.ts`

**Responsibilities:**

- SOA-native **broad-phase spatial partitioner**.
    
- Uses **fixed-size cells** (`gridCellSize`, default `64` units).
    
- Maintains:
    
    - `cells: Map<number, Uint32Array>` – buffers of block indices per cell.
        
    - `cellCounts: Map<number, number>` – active count per cell.
        
    - `blockToCellKey: Int32Array` – reverse mapping for efficient rehoming.
        
- Supports:
    
    - `registerBlock()` – adds a block to the correct cell.
        
    - `deregisterBlock()` – removes a block on destruction.
        
    - `rehomeBlockIndex()` – efficiently moves a block if its cell changes.
        
    - `getBlocksInArea()` – returns a **merged list** of all block indices in a rectangular area (without allocating per-cell copies).
        

**Growth Strategy:**  
Each cell starts with `INITIAL_CELL_CAPACITY` (64) and doubles until `MAX_CELL_CAPACITY` (4096).

**Key Difference from Old Grid:**  
Blocks are **just indices**, not full objects. All field lookups come from `BlockStore`.

---

## Data Flow Overview

1. **Creation**
    
    - `BlockOrchestrator.createAndRegisterBlock()` allocates a slot via `BlockStore.allocateIndex()`, initializes its fields, updates world position, and calls `BlockSpatialGrid.registerBlock()`.
        
2. **Per-Frame Updates**
    
    - For each ship:
        
        - `updateShipBlocks(shipId, transform)` recalculates all world positions.
            
        - `syncSpatialGrid(shipId)` rehomes blocks whose cell has changed.
            
3. **Destruction**
    
    - `BlockOrchestrator.destroyBlock()` removes the index from its ship list, calls `BlockSpatialGrid.deregisterBlock()`, and frees the index via `BlockStore.freeIndex()`.
        
4. **Queries**
    
    - AoE, collision, and AI systems use `BlockSpatialGrid.getBlocksInArea()` or similar to retrieve **block indices**.
        
    - Systems then resolve actual positions, health, etc., by reading `BlockStore` arrays directly.
        

---

## Migration Notes

1. `BlockInstance` should be reduced to a **UI/debug adaptor** only.
    
2. All systems (combat, rendering, AI) must shift to **index-based access**:

```
const store = orchestrator.blockStore;
const blocks = grid.getBlocksInArea(x1, y1, x2, y2);
for (let i = 0; i < blocks.length; i++) {
  const idx = blocks[i];
  const hp = store.hp[idx];
  const x = store.worldX[idx];
  const y = store.worldY[idx];
  // process block...
}

```

1. Legacy per-ship `Map`s are **completely deprecated**—`Uint32Array` lists are authoritative.
    
2. Spatial queries no longer create intermediate arrays beyond the final `Uint32Array`.
    

---

## Performance Characteristics

- **Cache locality:** tight packing of SOA arrays allows vectorization and JIT optimization.
    
- **Minimal allocations:** all per-frame work reuses existing buffers.
    
- **Broad-phase scaling:** `BlockSpatialGrid` amortizes cost by cell partitioning; queries only visit relevant buckets.
    
- **Recycling:** `BlockStore`’s free list prevents fragmentation.
