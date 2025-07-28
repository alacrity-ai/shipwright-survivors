# WebGL2 Transition Plan for Galaxy Map

The current Galaxy Map rendering system uses **WebGL1** with **per-planet draw calls** and legacy GLSL attributes.  
While functional, it incurs **redundant state changes, CPU overhead, and lacks instancing support**, limiting scalability (e.g., 50+ planets or moons).

This plan outlines a **drop-in upgrade path to WebGL2** that:

1. Retains the **existing logic, camera, and planet data flow**.
    
2. Minimizes disruption to controller logic.
    
3. Adds **instancing and modern GLSL 300 es shader support** for efficiency.
    

---

## Core Goals

1. **Upgrade Shaders** to GLSL 300 es syntax (required for WebGL2).
    
2. **Switch Attributes to `in`/`out`** qualifiers and use **VAOs (Vertex Array Objects)**.
    
3. **Introduce Per-Planet Instancing** to reduce N draw calls down to 1 (for all planets).
    
4. **Preserve Hover Scaling & Rotation** by supplying per-instance uniforms or attributes.
    
5. **Ensure Compatibility** with existing camera and interaction code.
    

---

## Implementation Steps

### 1. Context Upgrade

- Change the context acquisition:
    
```
this.gl = this.canvasManager.getWebGLContext('polygon', { contextType: 'webgl2' }) as WebGL2RenderingContext;

```
    
- Update type annotations (`WebGL2RenderingContext` everywhere).
    

### 2. GLSL 300 es Shaders

Refactor `defaultShaders.ts` to **modern syntax**:

```
#version 300 es
precision highp float;

layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec3 instanceOffset;
layout(location = 3) in float instanceScale;
layout(location = 4) in vec3 instanceColor;
layout(location = 5) in float instanceAlpha;

uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float time;  // for rotation animation

out vec3 vNormal;
out vec3 vColor;
out float vAlpha;

void main() {
    float rotation = time * 0.3; // could also pass per-instance rotation speed
    mat4 rotationY = mat4(
        cos(rotation), 0.0, sin(rotation), 0.0,
        0.0,           1.0, 0.0,           0.0,
       -sin(rotation), 0.0, cos(rotation), 0.0,
        0.0,           0.0, 0.0,           1.0
    );
    mat4 modelMatrix = rotationY;
    modelMatrix[3].xyz = instanceOffset; // translate
    modelMatrix[0][0] *= instanceScale;
    modelMatrix[1][1] *= instanceScale;
    modelMatrix[2][2] *= instanceScale;

    vNormal = normalize(normal);
    vColor = instanceColor;
    vAlpha = instanceAlpha;

    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}

```

Fragment Shader:

```
#version 300 es
precision highp float;

in vec3 vNormal;
in vec3 vColor;
in float vAlpha;

uniform vec3 lightPosition;
uniform vec3 lightColor;
uniform vec3 ambientColor;

out vec4 fragColor;

void main() {
    vec3 lightDir = normalize(lightPosition);
    float diff = max(dot(vNormal, lightDir), 0.0);
    vec3 ambient = ambientColor * vColor;
    vec3 diffuse = lightColor * vColor * diff;
    fragColor = vec4(ambient + diffuse, vAlpha);
}

```

### 3. VAO + Instancing Setup

In `GalaxyMapRenderer.initialize()`:

- Replace manual `bindBuffer` calls with a **VAO**:
    
```
this.vao = gl.createVertexArray();
gl.bindVertexArray(this.vao);

```
    
- Create **instance buffer** for per-planet attributes:
    
```
this.instanceBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
gl.bufferData(gl.ARRAY_BUFFER, MAX_PLANETS * (3+1+3+1) * 4, gl.DYNAMIC_DRAW);

```
    
    Attributes (per-instance):
    
    - `vec3 offset` (planet position)
        
    - `float scale` (base + hover)
        
    - `vec3 color`
        
    - `float alpha`
        
- Enable divisor-based instancing:
    
```
const stride = (3+1+3+1) * 4;
let offset = 0;
gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, offset); offset += 3*4;
gl.enableVertexAttribArray(2);
gl.vertexAttribDivisor(2, 1); // 1 per instance
// Repeat for scale, color, alpha...

```
    

### 4. Per-Frame Attribute Updates

In `GalaxyMapRenderer.render()`:

- Before drawing, pack all planet instance data into a Float32Array:
    
```
const instanceData = new Float32Array(planets.length * 8);
let i = 0;
for (const planet of planets) {
  const hoverState = this.hoverStates.get(planet.id);
  const scale = hoverState?.currentScale ?? planet.scale;
  const color = missionUnlocked(planet.missionId) ? planet.color : [0.25,0.25,0.25];
  const alpha = missionUnlocked(planet.missionId) ? 1.0 : 0.3;

  instanceData.set(planet.position, i); i += 3;
  instanceData[i++] = scale;
  instanceData.set(color, i); i += 3;
  instanceData[i++] = alpha;
}
gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
gl.bufferSubData(gl.ARRAY_BUFFER, 0, instanceData);

```
    
- Draw all planets in a single call:
    
```
gl.bindVertexArray(this.vao);
gl.drawElementsInstanced(gl.TRIANGLES, this.sphere.indices.length, gl.UNSIGNED_SHORT, 0, planets.length);

```
    

### 5. Maintain Hover Scaling & Rotation

- Hover scaling remains identical—only the **scale field in instance buffer** changes.
    
- Rotation speed can be:
    
    - **Global** (simple uniform, current implementation).
        
    - Or **per-instance** (add `float rotationSpeed` to buffer, compute `time * speed` in shader).
        

### 6. Cleanup & Destruction

- Delete buffers, VAO, and program in `destroy()`:
    
    ts
    
    CopyEdit
    
    `gl.deleteBuffer(this.instanceBuffer); gl.deleteVertexArray(this.vao);`
    

---

## Effort & Disruption Assessment

- **Controller Layer (`GalaxyMapController`)**: **No changes needed**.  
    All hover/click logic, camera transitions, and audio remain intact.
    
- **Renderer (`GalaxyMapRenderer`)**: **Moderate refactor (~150–200 lines changed)**:
    
    - Replace WebGL1 context and shaders.
        
    - Introduce VAO + instancing.
        
    - Convert shaders to GLSL 300 es.
        
- **Shaders**: **Full rewrite** for GLSL 300 es (about 50–60 lines each).
    
- **Helpers & Camera**: **Unchanged** (all math and interaction works the same).
    

Total estimated effort: **~0.5–1 day** for a clean migration (assuming familiarity with WebGL2 instancing).

---

## Benefits

1. **Performance Scaling** – All planets rendered with a **single draw call**.
    
2. **Future Flexibility** – Enables:
    
    - Procedural planet textures (via texture arrays).
        
    - Orbiting moons or dozens of extra objects without CPU cost.
        
    - Particle or atmosphere effects layered via additional passes.
        
3. **Modern Shader Features** – Can use UBOs, SSBOs, and more complex lighting (e.g., PBR).


## Additional Notes:


You **would not need to significantly rewrite the helpers** (e.g., `matrixUtils`, `vectorUtils`, `lookAt`, `screenToWorldRay`, `raySphereIntersect`).

Those modules already operate on **Float32Array-based Mat4/Vec3 math** and are **agnostic to WebGL1 vs WebGL2**. They just produce matrices and vectors, and those work identically in WebGL2.

The **actual migration work is concentrated in two areas**:

1. **Shaders**
    
    - WebGL2 mandates GLSL `#version 300 es`, so:
        
        - Replace `attribute` → `in`, `varying` → `out/in`.
            
        - Switch to `out vec4 fragColor` instead of `gl_FragColor`.
            
        - If you add instancing, you define **per-instance attributes** (position, scale, color, alpha) using `gl.vertexAttribDivisor`.
            
2. **Renderer (`GalaxyMapRenderer`)**
    
    - Replace the old `bindBuffer` per-draw setup with:
        
        - **VAO (Vertex Array Object)** for persistent attribute configuration.
            
        - An **instance buffer** to batch per-planet data.
            
        - One `drawElementsInstanced()` instead of a draw loop.
            
    - Optionally pack rotation speed per-instance (if you want per-planet rotation rates).
        

---

### What doesn’t need to change:

- **Matrix math (`matrixUtils`)**  
    Your perspective, translate, rotate, scale, `lookAt`, and `normalFromMat4` functions already output the correct formats (`Float32Array`) for uniforms. WebGL2 still uses `uniformMatrix4fv` for these.
    
- **Ray casting (`screenToWorldRay` and `raySphereIntersect`)**  
    These just work with your existing `viewMatrix` and `projectionMatrix`. No API changes.
    
- **Camera (`GalaxyMapCamera`)**  
    No change. Its output is consumed by the shaders the same way.
    

So, **you’re not refactoring the math pipeline at all**.  
The migration is basically:

- Switch to WebGL2 context.
    
- Update shader language.
    
- Implement a VAO + instanced rendering pipeline in the `GalaxyMapRenderer`.