# CollisionBox System

The **CollisionBox System** provides a lightweight, high-performance mechanism for handling _ship-level_ collision interactions, specifically **enemy-to-enemy spacing and overlap prevention**.  
Unlike the block-level collision system (which handles damage and player interactions at fine granularity), this system uses **precomputed ship-wide bounding boxes** for broad-phase collision resolution, ensuring that enemy ships remain visually separated without incurring expensive per-block checks.

---

## Overview

The system consists of four primary components:

1. **`CollisionBoxStore`**
    
    - A **Structure-of-Arrays (SOA)** store for all active collision boxes.
        
    - Stores local-space extents (`localMinX`, `localMaxX`, etc.), cached `halfWidth`/`halfHeight`, world position (`worldX`, `worldY`), rotation (radians), and the owning `shipNumericId`.
        
    - Designed for _GC neutrality_ and _cache-friendly iteration_.
        
2. **`BoxSpatialGrid`**
    
    - A **broad-phase spatial partitioning grid** that maps collision boxes into fixed-size cells for fast overlap queries.
        
    - Avoids full O(n²) comparisons by limiting checks to nearby cells.
        
    - Uses allocation-free query buffers for maximum performance.
        
3. **`CollisionBoxOrchestrator`**
    
    - High-level API for lifecycle, transforms, and spatial queries.
        
    - Provides ship-centric operations such as:
        
        - `createCollisionBox` / `createAndRegisterCollisionBox`
            
        - `updateWorldTransform` / `updateAndSync`
            
        - `destroyCollisionBox`
            
        - `getBoxIndexByShipId`, `getWorldCorners`, `getCollisionBoxesInArea`
            
    - Handles ship-to-box mapping internally.
        
4. **`CollisionBoxManager`**
    
    - Singleton entry point, mirroring the `BlockManager` pattern.
        
    - Exposes:
        
        - `getCollisionBoxStore()`
            
        - `getBoxSpatialGrid()`
            
        - `getCollisionBoxOrchestrator()`
            
    - Initializes and clears all state in one place.
        

---

## Lifecycle and Usage by Consumers

### 1. **Box Creation (Ship Spawn)**

When a ship is spawned:

1. Compute its **static local AABB** by scanning its block grid (min/max `x`/`y` in block coordinates × `BLOCK_SIZE`).
    
2. Call:

```
const collisionBoxManager = CollisionBoxManager.getInstance();
const orchestrator = collisionBoxManager.getCollisionBoxOrchestrator();

const boxIndex = orchestrator.createAndRegisterCollisionBox(
  {
    shipNumericId: ship.id,
    localMinX: minX,
    localMinY: minY,
    localMaxX: maxX,
    localMaxY: maxY,
  },
  { x: ship.position.x, y: ship.position.y },
  ship.rotation
);

```

This allocates a new entry in the `CollisionBoxStore`, sets its transform, and registers it with the `BoxSpatialGrid`.


### 2. **Transform Updates (Each Frame)**

Each ship must update its collision box each frame to remain spatially accurate:

```
const boxIndex = orchestrator.getBoxIndexByShipId(ship.id);
if (boxIndex !== undefined) {
  orchestrator.updateAndSync(boxIndex, ship.position, ship.rotation);
}

```

- `updateAndSync`:
    
    - Updates the world position and rotation.
        
    - Computes rotated corner coordinates.
        
    - Rehomes the box in the `BoxSpatialGrid`.
        

---

### 3. **Collision Resolution (Enemy-to-Enemy Spacing)**

The **Box Collision System** (to be implemented) will:

1. Iterate over all active collision boxes (`store.activeIndices`).
    
2. Use `BoxSpatialGrid.getBoxesInArea` to find nearby boxes.
    
3. Perform **simple SAT (Separating Axis Theorem) or circle-proxy** intersection tests (simplified, no damage).
    
4. Resolve overlaps by **pushing both ships apart equally**, maintaining even spacing.
    

This avoids card-deck stacking and keeps enemy formations visually clean.


### 4. **Cleanup (Ship Destruction)**

When a ship is destroyed:

```
const boxIndex = orchestrator.getBoxIndexByShipId(ship.id);
if (boxIndex !== undefined) {
  orchestrator.destroyCollisionBox(boxIndex);
}

```

This:

- Deregisters the box from the grid.
    
- Frees its slot in `CollisionBoxStore`.
    
- Removes the ship → box mapping.
    

---

## Performance Considerations

- The system is **completely GC-neutral**.  
    No dynamic allocations occur during update, transform, or queries (aside from initial store/grid growth).
    
- Uses **broad-phase partitioning** to avoid unnecessary pairwise checks.  
    With thousands of ships, per-frame costs remain near-linear.
    
- Designed for **low-frequency collisions (spacing only)**, avoiding costly physics engines.
    


## CompositeBlockObject Integration

The `CompositeBlockObject` class now **automatically manages its collision box lifecycle**, ensuring that every ship has a ship-level bounding volume kept in sync without manual intervention by consumers.

### Automatic Registration

- Upon deserialization via `loadFromJson`, after all blocks are created and synchronized with the `BlockOrchestrator`, the ship’s **local-space AABB** (derived from its blocks) is computed.
    
- The ship then invokes:
    

```
this.collisionBoxOrchestrator.createAndRegisterCollisionBox(
  {
    shipNumericId: this.numericId,
    localX1: minX,
    localY1: minY,
    localX2: maxX,
    localY2: maxY,
  },
  this.transform.position,
  this.transform.rotation ?? 0
);

```

- This ensures that every ship enters the `CollisionBoxStore` and `BoxSpatialGrid` immediately upon creation, with its world transform correctly initialized.
    

### Per-Frame Synchronization

- The ship’s collision box is automatically updated during `updateBlockPositions()`, which is already called whenever the ship’s transform changes.
    
- This call:
    

```
const boxIndex = this.collisionBoxOrchestrator.getBoxIndexByShipId(this.numericId);
if (boxIndex !== undefined) {
  this.collisionBoxOrchestrator.updateAndSync(
    boxIndex,
    this.transform.position,
    this.transform.rotation ?? 0
  );
}

```


keeps the collision box’s **position, rotation, rotated corners, and spatial grid cell** synchronized with the ship each frame, with no additional work by systems or AI controllers.

### Automatic Teardown

- When a ship is destroyed via `destroy()`, the class now:
    
    - Looks up its collision box index using `getBoxIndexByShipId`.
        
    - Deregisters it from the `BoxSpatialGrid`.
        
    - Frees the SOA slot from `CollisionBoxStore`.
        
    - Removes the ship → box mapping.
        
- This guarantees there are no lingering collision volumes once a ship is dead or removed from the game.
    

### Benefits of Integration

- Consumers (AI, spacing systems, collision systems) no longer need to **manually register, update, or clean up collision boxes**.
    
- Ships are always spatially represented at the OBB level, even before any combat or AI systems interact with them.
    
- All updates remain **GC-neutral**, since they piggyback on existing per-frame transform updates.


---

## Integration Summary

1. On ship spawn: `createAndRegisterCollisionBox`.
    
2. Each frame: `updateAndSync` (from the ship’s transform).
    
3. In a dedicated `BoxCollisionSystem`: use `BoxSpatialGrid` to find overlaps and push ships apart.
    
4. On destruction: `destroyCollisionBox`.
    

This system operates **independently** of the block SOA, relying solely on ship-level AABBs for efficiency.
