The **new Spatial Body System** is a **data-oriented, GC-neutral framework** designed to efficiently populate and render **large, non-interactable environmental objects**—ice chunks, meteors, magma orbs, nebulae—across a mission map.  
Its purpose is **visual enrichment and spatial structure**, not gameplay interaction, so its architecture is minimal yet performance-focused: a **Structure of Arrays (SOA)** core, **instancing-friendly data layout**, and **grid-based culling**.

---

## **Purpose**

1. **Populate maps with hundreds to thousands of large, static objects** (asteroid fields, drifting nebulae, magma spheres) without burdening the CPU or GC.
    
2. **Render all instances with a handful of instanced draw calls**, grouped by texture atlas, minimizing GPU overhead.
    
3. **Support declarative mission-level configuration** so designers can specify counts and types (e.g., “4 large ice chunks, 12 medium, 24 small”).
    
4. **Cull aggressively** so only spatial bodies near the camera are submitted for rendering.
    
5. Keep the system **self-contained and low-maintenance**, without the complexity of quest hooks, dialogues, or planet-style interaction logic.
    

---

## **System Architecture**

The system is composed of **five core layers**, each optimized for data-driven, allocation-free operation:

### **1. `SpatialBodyRegistry` (Definition Layer)**

- Central registry mapping **body type names** (e.g., `ice-04`) to their static **atlas UVs, scale, and atlas index**.
    
- Manages **texture atlas bookkeeping** (`AtlasInfo`) and ensures textures are lazily loaded into `WebGLTexture` handles.
    
- Example: all ice chunks (`ice-00` … `ice-04`) share `assets/spatialbodies/ice/atlas.png`, each with its **own normalized UV rectangle** and `baseScale`.
    

This allows the renderer to **batch draw calls per atlas**, while each instance references only lightweight numeric metadata (`atlasIndex`, `uMin/vMin/uMax/vMax`).

---

### **2. `SpatialBodyStore` (SOA Data Layer)**

- A **Structure of Arrays** container holding **every live spatial body**.
    
- Stores raw **numeric fields** per body:
    
    - Transform: `worldX`, `worldY`, `rotation`, `scale`
        
    - Atlas batching: `atlasIndex`, `uMin`, `vMin`, `uMax`, `vMax`
        
    - Activity bookkeeping: `allocated[]`, `activeIndices[]`, `bodyToActivePos[]`
        
- Allocation is **capacity-bound (5,000 by default)**, no dynamic arrays, and reuses freed slots via `freeList` to avoid GC churn.
    
- No object references—just **flat arrays for cache coherency**.
    

This structure is explicitly designed so the renderer can **stream contiguous buffers of attributes to WebGL2 instanced draws** without intermediate processing.

---

### **3. `SpatialBodyGrid` (Broad-Phase Culling)**

- A **fixed-size spatial partition** (default cell size: 512px) mapping world space to buckets of body indices.
    
- Stores only **indices** (no objects), uses **swap-with-last removal** for O(1) deregistration.
    
- Supports allocation-free queries via a shared `Uint32Array` output buffer:
    
    - `getBodiesInArea(cx, cy, radius, outBuffer)` efficiently finds all instances near the camera.
        
- Tuned for **static content** (re-homing exists but is rare since these bodies don’t move).
    

The grid ensures that the renderer only touches **nearby indices** rather than iterating all 5,000 potential entries.

---

### **4. `SpatialBodyOrchestrator` (Population Layer)**

- Handles **mission-driven population**:
    
    - Takes `SpatialBodySpawnConfig[]` (count + scale variance per type).
        
    - For each spawn, fetches its `SpatialBodyDefinition` (atlas + UVs), randomizes position, rotation, and jittered scale.
        
    - Allocates each instance in `SpatialBodyStore` and registers it into the grid.
        
- Designed to run only on **mission load/reset**, not every frame.
    

This allows level designers to define environments declaratively, without worrying about manual placement.

---

### **5. `SpatialBodyManager` (Singleton Facade)**

- Exposes the store, grid, and orchestrator through a **centralized API**.
    
- Ensures **one-time initialization** and provides `clear()` for mission resets.
    
- Mirrors the pattern used by `CollisionBoxManager` for architectural consistency.
    

---

## **How It’s Written (Key Characteristics)**

1. **Strictly SOA & Allocation-Free:**
    
    - All per-instance data lives in **typed arrays**, not objects.
        
    - Instances are tracked via **numeric indices**, never references.
        
    - Removal uses **swap-with-last** to avoid O(n) compaction.
        
2. **Instancing-Oriented:**
    
    - Each body carries precomputed **UVs and atlas index**, so no per-frame lookup.
        
    - The renderer (to be integrated via `SpatialBodyPass`) can directly bind per-instance attributes:
        
        - `aWorldPos`, `aScale`, `aRotation`, `aUVRect`, `aAtlasIndex`.
            
3. **Culling-First Design:**
    
    - Rendering code queries **only visible grid cells**, producing a **small set of active indices per frame**.
        
    - The store’s `activeIndices[]` combined with grid results yields minimal overdraw.
        
4. **Atlas-Centric Asset Handling:**
    
    - Each atlas is **loaded lazily** when first requested by a mission.
        
    - UV rectangles allow **many different shapes** to share a single GPU texture.
        

---

## **Intended Use**

1. **Mission setup:**
    
    - Missions declare a `spatialBodies` field (e.g., `iceSpatialBodyConfig`).
        
    - The orchestrator populates `SpatialBodyStore` with randomized positions and sizes.
        
2. **Rendering (future `SpatialBodyPass`):**
    
    - Queries `SpatialBodyGrid` for visible bodies.
        
    - Groups results by `atlasIndex`.
        
    - Issues **one draw call per atlas** using `gl.drawArraysInstanced`.
        
3. **Performance targets:**
    
    - **5,000+ bodies** possible without frame drops.
        
    - Minimal JS object churn → predictable GC behavior.
        
    - All data ready for **GPU-driven batching**.


# Rendering

## **Primary Goals**

1. **Render all visible spatial bodies (ice chunks, meteors, magma, nebulae) via a single instanced pipeline**:
    
    - **One draw call per atlas** (not per object).
        
    - Per-instance attributes for position, scale, rotation, and UV rect.
        
    - Blended alpha for irregular edges.
        
2. **Integrate cleanly into `UnifiedSceneRendererGL`**, with visibility culled via `SpatialBodyGrid`.
    
3. **Minimize CPU and GC overhead**:
    
    - Preallocated `Float32Array` for per-instance data (160 KB for 5k bodies).
        
    - Preallocated scratch buffers for grid queries and atlas grouping.
        
    - Streaming GPU updates via `gl.bufferSubData`.
        

---

## **File Layout**

- `src/rendering/unified/passes/SpatialBodyPass.ts`
    
- Shaders: `src/rendering/unified/shaders/spatialBody.vert` and `spatialBody.frag`
    

---

## **Instanced Attributes**

Each instance supplies:

- `aWorldPos` (vec2): world-space center position
    
- `aScale` (float): uniform scale factor
    
- `aRotation` (float): rotation (radians)
    
- `aUVRect` (vec4): `(uMin, vMin, uMax, vMax)` for atlas sampling
    

Static quad vertices (`aPosition`) define a unit square `[-1,-1]..[1,1]`, rotated and scaled per instance.

**8 floats per instance** → `8 * 5000 = 40,000 floats (~160 KB)` per frame, easily streamable.

---

## **High-Level Flow**

### **1. Setup (constructor)**

- Compile shaders.
    
- Build:
    
    - Static quad buffer (`createQuadBuffer2`).
        
    - Dynamic instance buffer (`Float32Array` + GPU buffer).
        
    - VAO with attributes:
        
        - Location 0: `aPosition` (static quad)
            
        - Location 1: `aWorldPos` (vec2, per-instance)
            
        - Location 2: `aScale` (float, per-instance)
            
        - Location 3: `aRotation` (float, per-instance)
            
        - Location 4: `aUVRect` (vec4, per-instance)
            
- **Preload all atlas textures** into `loadedAtlases` at startup (avoiding async loads during render).
    
- Bind `CameraBlock` UBO (slot 0).
    
- Cache uniform location for `uAtlasUnit` and set to 0 for consistent sampler binding.
    

### **2. Render (render(camera))**

1. Query `SpatialBodyGrid.getBodiesInArea(center, radius)` with preallocated scratch buffer.
    
2. Bin indices into **per-atlas buffers** (no dynamic arrays).
    
3. For each atlas:
    
    - Fill `Float32Array` with per-instance data.
        
    - Bind preloaded atlas texture.
        
    - Upload buffer slice via `gl.bufferSubData`.
        
    - Issue a **single `gl.drawArraysInstanced`**.
        

### **3. Cleanup (destroy())**

- Delete VAO, buffers, shader program, and release atlas textures.


### Vertex Shader

```
#version 300 es
precision highp float;

layout(location=0) in vec2 aPosition;     // Unit quad [-1..1]
layout(location=1) in vec2 aWorldPos;     // World position
layout(location=2) in float aScale;       // Uniform scale
layout(location=3) in float aRotation;    // Radians
layout(location=4) in vec4 aUVRect;       // (uMin, vMin, uMax, vMax)

uniform mat4 uProjection;

out vec2 vUV;

void main() {
  float cosR = cos(aRotation);
  float sinR = sin(aRotation);
  vec2 rotated = vec2(
    aPosition.x * cosR - aPosition.y * sinR,
    aPosition.x * sinR + aPosition.y * cosR
  );
  vec2 scaled = rotated * aScale;

  vec4 worldPos = vec4(aWorldPos + scaled, 0.0, 1.0);
  gl_Position = uProjection * worldPos;

  vec2 uvLocal = (aPosition + 1.0) * 0.5;
  vUV = mix(aUVRect.xy, aUVRect.zw, uvLocal);
}

```


### Fragment Shader

```
#version 300 es
precision mediump float;

in vec2 vUV;
uniform sampler2D uAtlas;
out vec4 fragColor;

void main() {
  vec4 tex = texture(uAtlas, vUV);
  if (tex.a < 0.01) discard; // Alpha cutoff for soft edges
  fragColor = tex;
}

```

## Notes

- **One draw call per atlas** means the renderer scales to thousands of bodies with negligible CPU overhead.
    
- **No per-frame allocation**: all buffers (`scratchBuffer`, `atlasGroupBuffers`, `Float32Array`) are persistent.
    
- The **`uAtlasUnit` uniform** is fixed to `0` (TEXTURE0) to avoid redundant state changes.
    
- Integrated into `UnifiedSceneRendererGL` right after `PlanetPass`, before lighting and entities, so spatial bodies appear as background but overlaid on the sky.

### TODO:
Eventually:
**remove `uProjection` entirely and make the shader read the projection matrix directly from the `CameraBlock` UBO (like the entity pipeline)** so the CPU doesn’t have to set it every frame.


# Remaining TODOs

Add spatial bodies field to MissionDefinition.  
Engine Runtime needs to initialize the SpatialBodyManager. (And destroy it in destroy())
Something in the runtime, maybe mission manager should call SpatialBodyOrchestrator.populateConfig

Verify spatial bodies load into the map correctly with no errors
Verify they are rendering properly with no errors, scaling properly, UV Coordinates are correct, etc.
