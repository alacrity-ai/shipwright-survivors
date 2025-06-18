✅ Next Step: Use the Light Map in Your Shader
Add this to your fragment shader (e.g., entityPass.frag):

glsl
Copy
Edit
vec2 screenUV = gl_FragCoord.xy / vec2(textureSize(uLightMap, 0));
vec4 lightSample = texture(uLightMap, screenUV);
base.rgb *= lightSample.rgb;
Or to preserve unlit color and fade to black:

glsl
Copy
Edit
base.rgb = mix(base.rgb * 0.2, base.rgb, lightSample.r); // Grayscale lighting
You can also encode directional lighting or soft shadows using multiple channels in the lightTexture.

✨ Optional Enhancements
Once that's in place, you can:

Add dynamic colored lighting (per-light hue/intensity accumulation in LightingPass)

Add global ambient light with a floor value to prevent full-blackness

Add bloom/exposure/gamma via postprocessing (if you add a PostprocessPass after particles)

✅ TL;DR
Yes — you now have a centralized, modern WebGL2 rendering pipeline that can use a lighting texture.
You just need to read from uLightMap in your fragment shader to fully realize the lighting visuals.






# WebGL 2

Below is a revised and expanded **`README.md`** tailored for transitioning the `src/rendering/unified/` pipeline from **WebGL 1** to **WebGL 2**, with an emphasis on instancing, MRT, sampler arrays, and G-buffer readiness — all core to a scalable forward or deferred renderer.

---

### 📂 `src/rendering/unified/`

> Unified WebGL 2 rendering pipeline for _Shipwright Survivors_

This module orchestrates all WebGL-based rendering in _Shipwright Survivors_, replacing legacy canvas layering and context fragmentation with a **single, forward-compatible, high-efficiency WebGL2 pipeline**.

### Directory Structure

```
src/rendering/unified/
├── UnifiedSceneRendererGL.ts
├── components
│   ├── LightingRendererGL.ts
│   ├── MultiShipRendererGL.ts
│   ├── ParticleRendererGL.ts
│   └── UIBatchRendererGL.ts
└── shaders
    ├── common
    │   └── sharedLighting.glsl
    ├── lighting
    │   ├── beam.frag.glsl
    │   ├── beam.vert.glsl
    │   ├── light.frag.glsl
    │   ├── light.vert.glsl
    │   ├── post.frag.glsl
    │   └── post.vert.glsl
    ├── particles
    │   ├── particle.frag.glsl
    │   └── particle.vert.glsl
    └── ship
        ├── shipSprite.frag.glsl
        └── shipSprite.vert.glsl
```

## 🧠 Key Architectural Changes in WebGL 2

### ✅ 1. Single `WebGL2RenderingContext`

All rendering subsystems now consume a `WebGL2RenderingContext`, acquired via:
```
canvas.getContext('webgl2', { antialias: false, depth: false, alpha: false })
```

### ✅ 2. VAO + UBO Standardization

All vertex attribute state is managed with **VAOs (Vertex Array Objects)**. Shared uniforms (e.g., `camera`, `time`, `screenSize`) are stored in **UBOs (Uniform Buffer Objects)** bound to consistent binding points across all programs.

### ✅ 3. Lighting Pipeline (Offscreen FBO)

The `LightingRenderer` now renders all lights to a single RGBA8 texture using standard framebuffer attachments. It can optionally be extended to use:

- `GL_EXT_color_buffer_float` (for HDR lighting)
    
- `drawBuffers()` for MRT if deferred rendering is introduced
    

### ✅ 4. Ship Rendering with Instancing

Ships are drawn using **`gl.drawArraysInstanced()`** with per-block transforms and metadata packed into `vec4` buffers. All blocks of the same material can be batched together.

Lighting is applied per-fragment via a `sampler2D uLightingTex` using screen-space sampling (`gl_FragCoord.xy / uResolution`).

## 🎮 Runtime Frame Pipeline

### `UnifiedSceneRendererGL.renderFrame(...)` executes:

1. **Lighting Pass**
    
    - Renders point/beam lights to low-res framebuffer texture
        
    - Lighting texture used downstream for modulation
        
2. **Entity Pass**
    
    - Renders all ships using instanced drawing
        
    - Lighting texture sampled per-fragment
        
3. **Particle Pass**
    
    - Instanced quads using additive blending
        
4. **(Optional) UI Pass**
    
    - Batched quad rendering using alpha blending
        

---

## 🔧 Shader Strategy (WebGL 2)

All shader programs are written in **GLSL ES 3.00**:

Shared UBOs:

```
layout(std140) uniform CameraData {
  mat4 uProjectionMatrix;
  mat4 uViewMatrix;
  vec2 uScreenResolution;
  float uTime;
};

```

Sampler2D lighting texture

```
uniform sampler2D uLightingTex;
vec4 lightSample = texture(uLightingTex, gl_FragCoord.xy / uScreenResolution);

```

Instancing Attributes

```
in vec2 aInstancePos;
in float aRotation;
in vec3 aColor;

```

### Benefits

|Feature|Benefit|
|---|---|
|`drawArraysInstanced()`|Massive batching for ships, particles, overlays|
|`VAO` + `UBO`|Clean state management, fewer bugs, faster frame setup|
|`sampler2DArray` support|Multi-variant sprite sheets, block styles, damage masks|
|`MRT` capability|G-buffer future-readiness (deferred shading)|
|`gl_FragCoord` sampling|Pixel-perfect screen effects, lightmap use|
|GLSL ES 3.00|More expressive shaders, fewer workarounds, proper integer types|
## 🧾 Integration Contract

Call `renderer.renderFrame(...)` per frame with current game state:

```
renderer.renderFrame({
  lights: lightSystem.getVisibleLights(),
  ships: shipRegistry.getVisibleShips(),
  particles: particleSystem.getActiveParticles(),
});

```

### Lifecycle Support

|Method|Effect|
|---|---|
|`resize()`|Recreates framebuffers to match canvas resolution|
|`destroy()`|Frees VAOs, buffers, shaders, textures|
|`setLightingResolutionScale(scale: number)`|Dynamic light pass resolution tuning|

### Next step upgrades

|Upgrade|Effect|
|---|---|
|**Deferred rendering with MRT**|Split lighting into albedo + normals + emissive|
|**Postprocessing stack**|Bloom, CRT, glow, chromatic aberration|
|**GPU-based simulation (TF or compute)**|True GPU particles, wavefields, shield simulations|
|**Sampler2DArray-based sprite sheets**|Style batching and block-type compression|
|**Material system**|Per-block lighting coefficients, normal maps, specular highlights|

## 🧓 Legacy Rendering System — Overview

The original rendering architecture in _Shipwright Survivors_ employed a **multi-canvas, multi-context approach**, with **overlapping 2D and WebGL canvases**, each responsible for a discrete visual concern.

```
Canvas Stack (z-order):
- canvas: background     → 2D starfield
- canvas: lightinggl     → WebGL lighting FBO pass
- canvas: entitygl       → WebGL ship and particle rendering
- canvas: hud            → 2D UI/HUD overlays
- canvas: tooltip        → 2D hover elements
- canvas: cursor         → 2D mouse cursor/crosshair

```

## 🔩 Old System Characteristics

### 🎨 1. **Multiple Canvases, Multiple Contexts**

- WebGL: `lightinggl`, `entitygl`
    
- Canvas2D: `hud`, `tooltip`, `cursor`, etc.
    
- Each canvas had its own backing `RenderingContext` (2D or WebGL)
    
- Each canvas redrew independently
    

### 🔁 2. **Independent Render Loops**

- Each subsystem (`LightingRenderer`, `ShipRenderer`, `HUD`, `Particles`) often maintained its own draw loop or render call
    
- Order-of-operations was manually enforced via z-layering
    

### 🧠 3. **State Duplication**

- Projection and view matrices were recomputed per system
    
- WebGL contexts duplicated VAO/VBO/texture state across canvases
    
- No shared uniforms, no instancing

### Summary

```
|Dimension|Old System|
|---|---|
|**Rendering model**|Multi-canvas, layered z-index|
|**Contexts**|7–9 total: mix of 2D + WebGL|
|**Draw loop**|Decentralized, per system|
|**Lighting**|WebGL1, offscreen framebuffer|
|**Entities**|WebGL1, block-by-block draw|
|**Particles**|WebGL1, instanced, independent|
|**UI**|2D, canvas overlays|
|**Performance**|Degraded with overdraw, commits, blending|
|**Composability**|Poor — no postprocessing, no deferred lighting|
```


## Implementation

## 🧭 Phase 0: Foundation Setup

### 0.1 – Enable WebGL2 and Feature Detection

Update your canvas initialization to explicitly request a WebGL2 context:

```
canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false });

```

Create a fallback warning if unavailable (for diagnostic purposes, not support).

---

## 🏗️ Phase 1: Create UnifiedSceneRendererGL Shell

### 1.1 – Structure Setup

```
src/rendering/unified/
├── UnifiedSceneRendererGL.ts
├── CameraUBO.ts
├── passes/
│   ├── LightingPass.ts
│   ├── EntityPass.ts
│   └── ParticlePass.ts
├── shaders/
│   ├── shared.glsl
│   ├── lightingPass.vert
│   ├── lightingPass.frag
│   ├── entityPass.vert
│   ├── entityPass.frag
│   ├── particlePass.vert
│   ├── particlePass.frag
│   └── common.glsl

```

Each pass owns:

- Its shader(s)
    
- Its own VAO/VBO setup
    
- Uniform block bindings
    

The `UnifiedSceneRendererGL` coordinates the passes.

## 🧱 Phase 2: Establish Shared Render Context and Resources

### 2.1 – Shared Frame Lifecycle

`UnifiedSceneRendererGL.render()` will:

1. Clear the screen
    
2. Invoke `LightingPass.renderToFBO()`
    
3. Bind the default framebuffer
    
4. Invoke `EntityPass.render(lightingTexture)`
    
5. Invoke `ParticlePass.render()`
    

### 2.2 – Shared Camera Matrices (UBO)

Create a single UBO for camera projection and view matrices:

```
layout(std140) uniform CameraMatrices {
  mat4 uProjectionMatrix;
  mat4 uViewMatrix;
};

```

Bind to the same uniform block index across all shaders.

---

## 💡 Phase 3: Refactor LightingRenderer into LightingPass

### Key Changes:

- Convert to WebGL2
    
- Use MRT-ready FBO for future extensibility
    
- Render to a framebuffer and expose the light texture
    
- Remove all blending/postprocessing logic from the outside

```
lightingPass.renderToFBO(): WebGLTexture

```

Also:

- Move projection/view logic to shared UBO
    
- Convert shaders to GLSL ES 3.00 with `#version 300 es`
    
- Remove redundant GL state setup
    

---

## 🚀 Phase 4: Refactor MultiShipRendererGL into EntityPass

### Goals:

- Remove all GL state setup (vao, blend, shader use) from render loop
    
- Refactor to use VAO per block or per shared VBO
    
- Move all shader code into `entityPass.vert` and `entityPass.frag`
    
- Add uniform sampler for `uLightMap` if you want deferred lighting
    
- Use batch draw if possible for blocks (instancing or texture atlases later)

```
entityPass.render(lightingTexture: WebGLTexture): void

```

## 🎇 Phase 5: Refactor ParticleRendererGL into ParticlePass

### Refactor Strategy:

- Move to WebGL2: remove `ANGLE_instanced_arrays` and use native `gl.vertexAttribDivisor`
    
- Share camera UBO
    
- Keep instance buffer and draw strategy
    
- Convert shaders to `#version 300 es`
    
- Defer blend setup to centralized controller

```
particlePass.render(): void

```

## 🔄 Phase 6: Centralized Render Loop

Implement inside `UnifiedSceneRendererGL`:

```
render(scene: SceneData): void {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  lightingPass.renderToFBO(scene.lights);
  entityPass.render(lightingPass.getLightTexture(), scene.ships);
  particlePass.render(scene.particles);
}

```

## 🧪 Phase 7: Integrate and Profile

1. Plug `UnifiedSceneRendererGL` into `GameLoop.render()`
    
2. Remove all other GL canvas renderers (`LightingRenderer`, `MultiShipRendererGL`, `ParticleRendererGL`)
    
3. Profile:
    
    - Frame time consistency
        
    - Commit length in Chrome DevTools
        
    - GPU overdraw
        
4. Add debug overlays for FBO textures if needed
    

---

## 🧹 Phase 8: Cleanup and Optimization

- Use `gl.drawBuffers()` with MRT for future HDR or normal maps
    
- Add batching to `EntityPass`
    
- Enable dynamic resolution scaling using `setResolutionScale` at runtime
    
- Factor out common code into `GLResourceManager` (VAO/UBO/shader cache)

| Component                | Refactored Into | Notes                                  |
| ------------------------ | --------------- | -------------------------------------- |
| `MultiShipRendererGL`    | `EntityPass`    | Shared UBOs, no independent GL state   |
| `ParticleRendererGL`     | `ParticlePass`  | Native instancing, consolidated camera |
| `LightingRenderer`       | `LightingPass`  | FBO + MRT ready, no screen composite   |
| `UnifiedSceneRendererGL` | New top-level   | Coordinates all, owns draw loop        |

