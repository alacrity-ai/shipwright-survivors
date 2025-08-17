# AetherGL: A Modular, Data-Driven Rendering Framework

**Status:** Draft (Design & Implementation Strategy)  
**Author(s):** Rendering Engineering Team  
**Purpose:** Replace `UnifiedSceneRendererGL` with a declarative, configurable rendering pipeline that enables modularity, data-driven orchestration, and editor integration.

---

## 1. Problem Statement

The legacy `UnifiedSceneRendererGL` was designed as a monolithic orchestrator, hardcoding the sequence and setup of passes. While performant, it suffers from:

- **High change cost**: New passes require editing the central renderer.
    
- **Hidden coupling**: Ordering and resource dependencies exist only as comments/call order.
    
- **Limited reusability**: Each scene shares the same pipeline, forcing conditional code paths.
    
- **Designer friction**: Requires code changes for visual experimentation or event theming.
    

**AetherGL** resolves these limitations by externalizing pipeline definition into JSON and introducing a factory + render-graph executor model.

---

## 2. Core Concepts

### 2.1 Render Graph

- A **directed acyclic graph (DAG)** of render passes.
    
- Each node (pass) declares:
    
    - **Inputs:** Textures, buffers, UBOs it consumes.
        
    - **Outputs:** Targets it writes to.
        
    - **Params:** JSON-deserialized configuration (fog density, blur radius, etc.).
        

### 2.2 Pass

- A modular, self-contained rendering unit (e.g., `SpritePass`, `LightingPass`).
    
- Implements a common interface:
    

```
export interface RenderPass {
  id: string;
  init(gl: WebGL2RenderingContext, resources: ResourceRegistry): void;
  render(gl: WebGL2RenderingContext, resources: ResourceRegistry, params: any): void;
  getDependencies(): string[]; // e.g. ["lightingBuffer"]
}

```

### 2.3 Resource Registry

- Manages **FBOs, textures, and buffers**.
    
- Ensures no duplicate allocations.
    
- Enforces correct read/write separation (ping-ponging).
    

### 2.4 AetherGLRenderer

- Orchestrator built via the factory.
    
- Responsibilities:
    
    1. Validate graph → ensure acyclicity & resource completeness.
        
    2. Initialize passes & resources.
        
    3. Execute passes in topological order each frame.
        
    4. Route parameters to passes.
        

---

## 3. JSON Specification

Example JSON describing a pipeline:

```
{
  "name": "GalaxySceneRenderer",
  "resources": {
    "lightingBuffer": { "type": "FBO", "format": "rgba16f", "scale": 0.5 },
    "mainColor": { "type": "FBO", "format": "rgba8", "scale": 1.0 }
  },
  "passes": [
    { "type": "BackgroundPass", "id": "bg", "outputs": ["mainColor"], "params": { "layers": 3 } },
    { "type": "LightingPass", "id": "lights", "inputs": ["mainColor"], "outputs": ["lightingBuffer"], "params": { "safeMode": false } },
    { "type": "SpritePass", "id": "sprites", "inputs": ["lightingBuffer"], "outputs": ["mainColor"] },
    { "type": "PostProcessPass", "id": "post", "inputs": ["mainColor"], "outputs": ["screen"], "params": { "effect": "bloom" } }
  ]
}

```

---

## 4. Implementation Plan

### 4.1 Phase 1 – Bootstrapping

- Create `src/rendering/aethergl/` parallel to `unified/`.
    
- Add:
    
    - `AetherGLRenderer.ts`
        
    - `AetherFactory.ts`
        
    - `interfaces/RenderPass.ts`
        
    - `resources/ResourceRegistry.ts`
        
    - `validation/GraphValidator.ts`
        

Goal: Mirror `UnifiedSceneRendererGL` with static JSON equivalent.

### 4.2 Phase 2 – Resource & Pass Registration

- Implement **Pass Registry**: map `type` strings → constructors.
    
- Implement **Resource Registry**: create/lookup FBOs & textures on demand.
    
- Stub minimal passes (`SpritePass`, `BackgroundPass`, `LightingPass`, `PostProcessPass`).
    

### 4.3 Phase 3 – Validation & Debugging

- Build `GraphValidator`:
    
    - Ensure acyclic pass order.
        
    - Ensure all `inputs` exist.
        
    - Ensure output collisions are resolved.
        

### 4.4 Phase 4 – Substitution

- Create a JSON file equivalent of the existing unified pipeline.
    
- Load via `AetherFactory`.
    
- Run golden-frame comparison between `UnifiedSceneRendererGL` and `AetherGLRenderer`.
    

### 4.5 Phase 5 – External Tooling

- Define JSON schema for validation in-editor.
    
- Build serialization hooks for external editors.
    
- Integrate hot-reload (reload pipeline JSON at runtime).
    

---

## 5. Migration Strategy

1. Copy existing passes → wrap them in `RenderPass` interface.
    
2. Hardcode pipeline JSON to replicate current renderer.
    
3. Swap `UnifiedSceneRendererGL` with `AetherGLRenderer` behind a flag.
    
4. Run regression tests to confirm no visual/performance changes.
    
5. Begin incremental adoption of modular configuration.
    

---

## 6. Best Practices

- **Pass immutability**: Passes declare inputs/outputs once during init.
    
- **Parameter isolation**: Never mutate global state; always consume `params`.
    
- **Resource locality**: Resource allocation centralized in registry, never in passes.
    
- **Schema validation**: JSON must pass schema + DAG validation before execution.
    
- **Debugability**: Each pass logs timings and resource usage with its `id`.
    

---

## 7. Future Extensions

- **Multi-camera pipelines** (e.g., minimap render).
    
- **Conditional passes** (runtime toggles for quality tiers).
    
- **Dynamic resource scaling** (auto-res based on FPS budget).
    
- **Pass compositors** (multi-target outputs composited automatically).
    
- **Editor-first design**: Live UI to build and serialize pipeline JSON.


# Additional Info

## 1. Philosophy

AetherGL replaces `UnifiedSceneRendererGL` with a **modular, JSON-driven render graph**.  
Goals:

- **Data-driven pipelines** → defined in `pipeline.json`, not hardcoded.
    
- **Pass modularity** → each pass encapsulated and interchangeable.
    
- **Extensibility** → new passes require _only_ registration and JSON schema update.
    
- **Tooling-first** → external editor can emit pipeline JSON; hot-reload supported.
    
- **Validation** → pipelines checked against schema and graph validator before use.
    

---

## 2. High-Level Overview

```
pipeline.json → PipelineFactory → RenderGraphExecutor → AetherGLRenderer
         ↘ ParamStore         ↘ ResourceManager

```

1. **JSON schema** defines resources, passes, parameters, and connections.
    
2. **PipelineFactory** parses JSON, validates with schema, constructs render graph.
    
3. **PassRegistry** maps `type` → concrete pass class.
    
4. **RenderGraphExecutor** orders passes, executes them each frame.
    
5. **ResourceManager** ensures FBO/texture allocations are centralized.
    
6. **ParamStore** exposes runtime param overrides (debug UI, gameplay hooks).
    

---

## 3. Major Components

### 3.1 Core

- **`AetherGLRenderer.ts`**  
    Entry point for consumers (e.g., `GalaxyMapSceneManager`).
    
    - Owns GL context, camera UBO, and pipeline instance.
        
    - Calls `RenderGraphExecutor.render()` each frame.
        
- **`PipelineFactory.ts`**
    
    - Input: parsed JSON (validated against `pipeline.schema.ts`).
        
    - Output: a fully wired `AetherGLRenderer`.
        
    - Responsibilities:
        
        - Instantiate passes via `PassRegistry`.
            
        - Allocate resources via `ResourceManager`.
            
        - Bind pass dependencies.
            
- **`PassRegistry.ts`**
    
    - Static registry mapping `"SpritePass"` → `SpritePassAdapter`.
        
    - Allows decoupling JSON `type` strings from class constructors.
        
- **`RenderGraphExecutor.ts`**
    
    - Performs **topological sort** of passes.
        
    - Enforces execution order.
        
    - Calls `pass.render()` with the appropriate `resources` and `params`.
        
- **`ResourceManager.ts`**
    
    - Central allocator of FBOs, textures, and buffers.
        
    - Prevents duplication.
        
    - Example: JSON may request `"lightingBuffer"`, `ResourceManager` ensures one instance reused across passes.
        
- **`ParamStore.ts`**
    
    - Runtime overrides for pass parameters.
        
    - Supports debug sliders, gameplay events, or scripted control.
        
    - Example: change `"fogDensity"` live without touching JSON.
        
- **`interfaces.ts`**
    
    - Defines `RenderPass`, `PassParams`, `ResourceHandle`, etc.
        
    - Every adapter must conform.
        

---

### 3.2 Passes vs. Adapters

- **Passes (`/passes`)**
    
    - Contain the _core GL logic_ for rendering.
        
    - Examples: `SpritePass.ts`, `LightingPass.ts`, `PostProcessPass.ts`.
        
    - Should be _stateless_ except for shader programs and VAOs.
        
- **Adapters (`/adapters`)**
    
    - Bridge JSON → Pass.
        
    - Responsibilities:
        
        - Deserialize params.
            
        - Bind inputs/outputs to resources.
            
        - Call underlying pass with correct uniforms & FBO targets.
            
    - Example: `SpritePassAdapter.ts` wires JSON-defined texture inputs and calls `SpritePass.draw()`.
        

This two-layer approach ensures passes remain reusable even if pipeline JSON evolves.

---

### 3.3 Schema

- **`pipeline.schema.ts`**
    
    - JSON schema used for runtime validation.
        
    - Ensures all passes declare valid `inputs`, `outputs`, and `params`.
        
    - Prevents invalid pipelines (cyclic graphs, missing resources).
        
- **`examples/baseline.pipeline.json`**
    
    - Mirrors the legacy `UnifiedSceneRendererGL`.
        
    - Serves as test fixture: if baseline renders identically, migration succeeded.
        

---

### 3.4 Shaders

- Organized by **pass type** (`backgroundPass.frag`, `spritePass.vert`, etc.).
    
- Naming convention:
    
    - `<passName>.frag`, `<passName>.vert`.
        
    - Nested folders for categories: `/fx`, `/scene`, `/postprocess`, `/debug`.
        
- Passes load shaders via helper utils and should not embed GLSL inline.
    

---

### 3.5 Controllers

- **`BossArenaRenderingController.ts`**, **`SpecialFxController.ts`**
    
    - Higher-order controllers that orchestrate pass params across frames.
        
    - Example: trigger shockwave effect → updates ShockwavePass params via ParamStore.
        

---

### 3.6 Bus

- **`SpriteRenderRequestBus.ts`**
    
    - Pub-sub mechanism for batching sprite render requests before `SpritePass`.
        
    - Keeps sprite submission decoupled from scene logic.
        

---

### 3.7 Utils & Helpers

- **`buffer/RenderableBlockBuffer.ts`** → shared buffer for ship/block meshes.
    
- **`helpers/GLSpriteResolver.ts`** → resolves texture atlases for sprite passes.
    
- **`helpers/hexToRgbaVec4.ts`** → convenience utility.
    
- **`utils/createGradientRampAtlas.ts`** → builds LUTs for postprocess.
    
- **`utils/PostProcessEffectInterpolator.ts`** → smooth transitions between PP effects.
    
- **`utils/bufferUtils.ts`** → boilerplate for VAO/VBO creation.
    

---

## 4. Pipeline Lifecycle

1. **Load JSON**
    
    - Read `baseline.pipeline.json` (or scene-specific variant).
        
    - Validate with schema.
        
2. **Factory Build**
    
    - Instantiate passes via adapters.
        
    - Allocate all declared resources.
        
    - Bind graph order.
        
3. **Initialization**
    
    - Each pass loads shaders, compiles programs, prepares VAOs.
        
4. **Frame Render**
    
    - `RenderGraphExecutor` executes passes in order.
        
    - Inputs pulled from `ResourceManager`.
        
    - Params pulled from `ParamStore`.
        
5. **Output**
    
    - Final pass outputs to `"screen"` (default swapchain FBO).
        

---

## 5. Debugging & Tooling

- **Hot Reload**
    
    - Re-parse pipeline JSON at runtime.
        
    - Swap passes/resources with minimal disruption.
        
- **Validation Levels**
    
    - Compile-time: JSON schema.
        
    - Runtime: GraphValidator ensures DAG validity.
        
    - Render-time: Logs timings & resources per pass.
        
- **Editor Integration**
    
    - External editor modifies pipeline graph visually.
        
    - Saves to `.pipeline.json`.
        
    - Engine hot-reloads file.

## 6. Migration Plan

1. Implement adapters for **all existing passes**.
    
2. Create baseline JSON matching current pipeline.
    
3. Replace `UnifiedSceneRendererGL` with `AetherGLRenderer` behind feature flag.
    
4. Run regression test → visual output identical.
    
5. Incrementally introduce new passes, scene-specific pipelines.