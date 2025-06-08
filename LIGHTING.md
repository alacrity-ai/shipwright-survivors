✅ Phase-Based Implementation Plan
📦 Phase 1: Core Types
lights/types.ts

Define the shared LightInstance interface and optional subtypes (PointLightInstance, etc.)

Used by all higher modules.

🔧 Phase 2: Orchestration Layer
LightingOrchestrator.ts

Holds Map<string, LightInstance>

Owns update(dt) and render() lifecycle

Offers registerLight(...), removeLight(id), etc.

Accepts camera in constructor or as parameter to render()

🎨 Phase 3: Light Creation Helpers
lights/createPointLight.ts

Constructs a valid LightInstance

Auto-generates ID if not provided

Accepts config like { x, y, radius, color, intensity }

(Optional: createSpotLight.ts later if needed)

🖼️ Phase 4: Rendering Subsystem
LightingRenderer.ts

Accepts a WebGLRenderingContext and array of LightInstance

Does not mutate them—read-only render path

Manages GPU resources (buffers, shaders)

Draws radial glows using additive blending

Clears buffer with ambient color

⚙️ Phase 5: WebGL Primitives
webgl/initWebGLContext.ts

Wraps canvas.getContext('webgl'), configures blend mode, etc.

webgl/shaderUtils.ts

createShader, createProgram, error handling

webgl/bufferUtils.ts

Create VBO for a fullscreen or per-light quad

webgl/defaultShaders.ts

GLSL: vertex and fragment source for radial falloff lights

🔃 Integration Plan (Post-Implementation)
After implementing the above:

Inject LightingOrchestrator into MissionRuntimeScreen

Hook orchestrator.update(dt) and orchestrator.render() into the main game loop

Create sample lights via createPointLight(...)

See effect on lighting-canvas

✅ Summary: Implementation Order
Phase	File	Description
1	lights/types.ts	Shared interfaces for all lights
2	LightingOrchestrator.ts	Manages light instances
3	lights/createPointLight.ts	Builder utility for runtime light objects
4	LightingRenderer.ts	WebGL-based renderer
5	webgl/initWebGLContext.ts	Context and GL setup
webgl/shaderUtils.ts	Compile/link helpers
webgl/bufferUtils.ts	VBO utils
webgl/defaultShaders.ts	Radial falloff fragment/vertex shader