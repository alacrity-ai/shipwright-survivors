// src/lighting/LightRegistry.ts
/*
Not needed for now
LightRegistry (optional idea) could refer to:
A prefab cache of light configuration templates, not instances.

For example:

ts
Copy
Edit
registry.registerPrefab('muzzle-flash', { radius: 60, color: '#ffffaa', intensity: 1.5 })
const muzzle = registry.instantiate('muzzle-flash', { x: 300, y: 200 })
However, unless you foresee dynamic prefab spawning via string keys, this can be skipped for now. We’ll exclude it from the initial implementation plan.

*/