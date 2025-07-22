

## **Unit Test Cases**

### **BlockStore** (`src/game/blocks/system/BlockStore.ts`)

1. **Index Allocation and Reuse**
    
    - Allocates indices sequentially up to `capacity`.
        
    - Reuses freed indices from `freeList` in LIFO order.
        
    - Returns `-1` if allocating beyond `capacity`.
        
2. **Freeing and Clearing**
    
    - `freeIndex()` zeroes out all fields and recycles the index.
        
    - After `clear()`, all arrays are zeroed and `count` is reset to `0`.
        
3. **Field Integrity**
    
    - After `allocateIndex()`, all state fields default to zero or `-1` (for `shieldSourceId`).
        
    - Ensure mutating values at an index does not affect others.
        
4. **isAllocated() Accuracy**
    
    - Returns `true` for active indices, `false` for freed or out-of-range indices.
        
5. **Capacity Edge Cases**
    
    - Handles `capacity = 1` correctly.
        
    - Throws error if initialized with `0` or a non-integer capacity.
        

---

### **BlockSpatialGrid** (`src/game/blocks/system/BlockSpatialGrid.ts`)

1. **Block Registration**
    
    - `registerBlock()` correctly assigns a block to its cell.
        
    - `blockToCellKey` is updated properly.
        
2. **Rehoming Behavior**
    
    - Moving a block across cell boundaries rehomes it; moving within the same cell is a no-op.
        
    - Old cell count decrements, new cell count increments.
        
3. **Deregistration**
    
    - `deregisterBlock()` removes a block and clears its `blockToCellKey`.
        
    - Deregistering twice is a no-op (should not crash).
        
4. **Cell Growth**
    
    - Cells expand when capacity is exceeded (doubling strategy).
        
    - Growth stops at `MAX_CELL_CAPACITY`.
        
5. **Querying**
    
    - `getBlocksInArea()` returns correct merged results for:
        
        - A single cell
            
        - Multiple adjacent cells
            
        - Empty cells (returns empty array)
            
6. **Clear Operation**
    
    - `clear()` resets `cells`, `cellCounts`, and `blockToCellKey` without residuals.
        

---

### **BlockOrchestrator** (`src/game/blocks/system/BlockOrchestrator.ts`)

1. **Block Creation**
    
    - `createBlock()` populates all `BlockStore` fields with defaults and initial HP.
        
    - Respects per-ship maximum (`MAX_SHIP_BLOCKS`)—fails gracefully when exceeded.
        
    - Ensures indices are added to `shipBlocks` arrays.
        
2. **World Transform Updates**
    
    - `updateWorldPositions()` correctly computes `worldX`, `worldY`, and `rotation` given a ship transform.
        
3. **Ship Block Management**
    
    - `ensureShipBlocks()` initializes arrays as needed.
        
    - `getShipBlocks()` and `getShipBlocksView()` reflect accurate counts.
        
4. **Ship Clearing**
    
    - `clearShip()` deregisters and frees all indices for that ship.
        
    - Confirm freed indices are recycled and available for reallocation.
        
5. **Destruction**
    
    - `destroyBlock()` removes index from ship, deregisters it from grid, and frees it in `BlockStore`.
        
6. **Spatial Grid Integration**
    
    - `syncSpatialGrid()` calls `rehomeBlockIndex()` for every block.
        
    - `registerBlockWithGrid()` (via `createAndRegisterBlock()`) delegates grid insertion correctly.
        
7. **Legacy View**
    
    - `getBlockInstanceView()` returns a consistent snapshot of a block’s fields.
        
    - Returns `null` for invalid or freed indices.
        

---

## **Integration Test Cases**

### **Ship Construction and Stress Tests**

1. **Basic Ship Creation**
    
    - Create a ship with 10 blocks using a real `BlockRegistry` entry (to fetch armor/HP).
        
    - Verify:
        
        - Each block is allocated and tracked in `shipBlocks`.
            
        - Each block is registered in the `BlockSpatialGrid`.
            
        - World positions match expected local transforms after `updateShipBlocks()`.
            
2. **Capacity Stress Test**
    
    - Create blocks until `BlockStore.capacity` is reached.
        
    - Verify:
        
        - `createBlock()` returns `-1` when over capacity.
            
        - No memory leaks (indices are correctly managed).
            
        - Performance remains stable for near-capacity operations.
            
3. **Ship Removal and Recycling**
    
    - Build multiple ships, populate with blocks, then `clearShip()` one or more.
        
    - Confirm:
        
        - Freed indices re-enter the `freeList` and can be reallocated for a new ship.
            
        - Grid entries are cleared (`blockToCellKey` is `0` for freed blocks).
            
4. **Dynamic Block Removal and Addition**
    
    - Add 100 blocks to a ship, destroy half, and add 50 new ones.
        
    - Verify:
        
        - Indices from destroyed blocks are reused.
            
        - `shipBlocksView()` reflects the updated set accurately.
            
5. **Spatial Grid Validation**
    
    - After `updateShipBlocks()` on a moving ship, confirm:
        
        - Blocks are rehomed into new cells as the ship moves.
            
        - `getBlocksInArea()` returns correct sets for queries overlapping ship bounds.
            
        - No duplicate or stale entries remain in grid cells.
            
6. **Multi-Ship Interaction**
    
    - Create two ships in overlapping regions.
        
    - Confirm `getBlocksInArea()` returns both ships’ blocks.
        
    - Destroy one ship and verify:
        
        - Its blocks are removed from all grid cells.
            
        - The other ship’s blocks remain unaffected.
            
7. **Transform and Rotation Check**
    
    - Apply multiple rotations and translations to a ship.
        
    - Ensure world positions match the expected rotated/translated local offsets.
