# **ARENA.md – Arena System Architecture (Shipwright Survivors)**

## **Overview**

The **Arena System** establishes a **modular, circular engagement zone** for gameplay encounters requiring constrained spatial dynamics. This system provides a reusable foundation for enforcing positional constraints, visual signaling, and phased activation logic across a variety of scenarios, independent of boss-specific behaviors.

### **Key Features:**

- **Deterministic, radial boundary enforcement.**
- **Decoupled visual and simulation responsibilities.**
- **Reusable across encounter types (bosses, gauntlets, rituals, etc.).**
- **GPU-accelerated rendering pipeline with shader-driven effects.**

---

## **Core Components**

### **1. ArenaManager**

> 📁 `src/game/arena/ArenaManager.ts`

- **Central simulation controller** for the arena’s lifecycle and state transitions.

- **Responsibilities:**
  - Stores arena metadata: `center`, `radius`, `state`, and `formProgress`.
  - Drives timed transitions between states:
    - `Idle` → `Forming` → `Pulsing`.
  - Exposes an imperative API:
    - `startForming(center, radius, duration)`
    - `startPulsing()`
    - `disable()`, `destroy()`
  - Emits `GlobalEventBus` event:  
    - `arena:spawn` (emitted during `startForming()`)

- **Lifecycle:**
  - Instantiated by game logic (e.g. level orchestrator).
  - Updated per simulation tick.
  - Tied to mission context; explicitly destroyed on level transition.

---

### **2. ArenaCollisionEnforcer**

> 📁 `src/game/arena/ArenaCollisionEnforcer.ts`

- **Physics-level enforcement** of the arena’s radial boundary.

- **Responsibilities:**
  - Subscribes to `arena:spawn` to receive current center and radius.
  - Each frame:
    - Checks player position against adjusted arena radius (1.85× visual radius).
    - Repositions player inward if they exit the bounds.
    - (Planned: future support for radial knockback or damage-on-wall-contact.)
  - Fully GC-neutral:
    - Reuses shared vectors.
    - Avoids per-frame allocations.

- **Lifecycle:**
  - Instantiated and owned by the system that manages arena state (e.g. `ArenaManager`).
  - `disable()` halts enforcement cleanly.
  - `destroy()` removes event listeners and nulls references.

---

## **Rendering Subsystem**

Rendering of the arena is managed by a **dedicated GPU pass**, coordinated via a rendering controller and designed to slot into the world-space framebuffer.

### **3. BossArenaRenderingController**

> 📁 `src/rendering/unified/controllers/BossArenaRenderingController.ts`  
(Note: Named “BossArena” for historical reasons; still applicable to generic arenas.)

- **Manages render-time state** for arena visuals.

- **Responsibilities:**
  - Subscribes to `arena:spawn` to track `center`, `radius`, `state`, and `formProgress`.
  - Exposes imperative control methods:
    - `setArena(center, radius)`
    - `startForming(duration)`
    - `startPulsing()`
  - Called by `UnifiedSceneRendererGL`:
    - `update(dt)` updates arena state (form progress, pulse animation).
    - `render()` queues draw call to `BossArenaPass`.

- **Lifecycle:**
  - Instantiated at startup by `UnifiedSceneRendererGL`.
  - Survives across scenes unless explicitly reset.

---

### **4. BossArenaPass**

> 📁 `src/rendering/unified/passes/fx/BossArenaPass.ts`

- **Low-level GPU rendering pass** for the arena’s circular boundary effect.

- **Responsibilities:**
  - Draws a **single instanced quad** centered on the arena’s world-space position.
  - Uniform-driven visual logic:
    - `uArenaCenter`, `uArenaRadius`
    - `uState` — 0 = idle, 1 = forming, 2 = pulsing
    - `uFormProgress` — [0.0 → 1.0] for formation animation
  - Integrates camera via `CameraMatrices` UBO.
  - Renders into `sceneFramebuffer`.
  - Uses `SRC_ALPHA, ONE_MINUS_SRC_ALPHA` blending for transparency.

---

### **5. Shaders**

> 📁 `src/rendering/unified/shaders/fx/bossArenaRenderer.vert|frag`

- **Vertex Shader: `bossArenaRenderer.vert`**
  - Transforms unit quad to scaled arena circle.
  - Projects to screen using `uViewMatrix` and `uProjectionMatrix`.

- **Fragment Shader: `bossArenaRenderer.frag`**
  - Implements ring glow, arc sweep effects, and time-driven pulses.
  - Driven by arena state uniforms and time.
  - Differentiates behavior across idle/forming/pulsing states.

---

## **Gameplay & Collision Semantics**

- **Player containment**:
  - Players are forcibly repositioned inside the arena if they stray beyond its bounds.
  - Future enhancement: differentiate by arena archetype (e.g., soft edge vs. damaging edge).

- **Arena scale**:
  - Radius is always defined in world units.
  - All positional enforcement and rendering derive from this single authoritative source.

---

## **Integration & Event Model**

- The `arena:spawn` event is emitted by `ArenaManager` and consumed by:
  - `ArenaCollisionEnforcer` (for simulation enforcement)
  - `BossArenaRenderingController` (for visual update)
  - Future: encounter-specific logic, e.g., hazard placement

---

## **Directory Overview**

```
src/
├── game/
│ └── arena/
│ ├── ArenaManager.ts ← Arena state + event emitter
│ └── ArenaCollisionEnforcer.ts ← Boundary clamping logic
├── rendering/
│ └── unified/
│ ├── controllers/
│ │ └── BossArenaRenderingController.ts ← Visual state & draw orchestration
│ ├── passes/
│ │ └── fx/
│ │ └── BossArenaPass.ts ← GPU draw call for ring effect
│ └── shaders/
│ └── fx/
│ ├── bossArenaRenderer.vert ← Vertex shader: transform quad
│ └── bossArenaRenderer.frag ← Fragment shader: visual logic
```

---

## **Future Extensions**

- **Arena archetypes**:
  - "Soft", "reflective", "hazardous" boundary styles.
  - Different telegraphing palettes for themed arenas (e.g., frost, void, flame).

- **Multi-arena support**:
  - Stackable or dynamically repositioned arenas for multi-phase encounters.

- **Spatial scripting**:
  - Spawn patterns, beam barriers, or enemy tethers relative to arena geometry.
