## 🧠 **System Overview: Modular Block-Based Ships**

Ships are constructed from a grid of discrete `BlockInstance`s placed relative to a central **origin block** (cockpit at `(0, 0)`). Each block is an instance of a statically defined `BlockType`, which determines its behavior (e.g. thrust, fire), cost, and durability.

All block types are **procedurally drawn** at app load and **rasterized into canvases** for efficient reuse. Ships are rendered by compositing these block sprites based on their relative positions and an optional rotation angle.

---

## 📁 **Created Files and Their Purpose**

### 🔧 `src/game/blocks/BlockType.ts`

- **Defines the structure of a block type** (e.g., turret, hull, engine)
    
- Includes metadata like `armor`, `cost`, `behavior`, and `sprite` ID
    

---

### 🔧 `src/game/blocks/BlockRegistry.ts`

- **Global registry of all block types**
    
- Provides lookup methods like `getBlockType(id)` and `getAllBlockTypes()`
    
- Defines canonical set of types: `cockpit`, `hull`, `turret`, `engine`, `fin`
    

---

### 🔧 `src/game/blocks/BlockInstance.ts`

- Represents a **runtime, per-ship instance** of a block
    
- Stores mutable data: current `hp`, cooldowns, etc.
    
- Wraps a reference to the immutable `BlockType`
    

---

### 🔧 `src/game/ship/Ship.ts`

- Core ship model: a **sparse grid** of `BlockInstance`s keyed by `(x,y)` coordinates relative to the cockpit
    
- Provides methods to `placeBlock`, `removeBlock`, `getAllBlocks()`, and lookup at any coordinate
    
- Origin is always `(0,0)` for transforms and rendering
    

---

### 🔧 `src/rendering/BlockSpriteCache.ts`

- Rasterizes each `BlockType` into a **cached `Canvas`** at app load
    
- Procedural drawing for each block (e.g. draw cockpit as square with a circle, engine with glow, etc.)
    
- Provides `getBlockSprite(id)` for runtime rendering
    

---

### 🔧 `src/rendering/ShipRenderer.ts`

- **Renders a full ship** to the `entity-canvas` layer
    
- Applies global position and optional rotation
    
- Iterates over blocks and draws each using the cached sprite from `BlockSpriteCache.ts`
    

---

## ✅ System Benefits

- Highly modular and expressive (new block types are just data + a draw function)
    
- Efficient (pre-rasterized once; re-used at runtime)
    
- Deterministic layout (grid-locked positioning; cockpit origin)
    
- Future extensible (damage overlays, animations, multi-tile blocks)