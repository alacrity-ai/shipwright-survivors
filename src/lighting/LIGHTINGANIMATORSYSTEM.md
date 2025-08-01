# `LIGHTINGANIMATORSYSTEM.md`

## 💡 Lighting Animator System

### 🎯 Purpose

The **LightingAnimatorSystem** provides a **data-oriented**, **GC-neutral**, and **frame-driven** mechanism for applying temporal animations to the **intensity** and **radius** properties of point lights associated with ship blocks.

This system allows lights to:

- **Fade in** (e.g. glow-up on ship activation)
    
- **Fade out** (e.g. dimming during shutdown or death)
    
- **Pulse** periodically (e.g. ambient engine glow, warning indicators)
    

---

## 🧱 Architecture

```
[ Block Index ] → [ lightId: Float64 ] → [ lightIndex: Int → SOA ]
                                         ↘
                                   [ LightingAnimatorSystem ]

```

The system is tightly integrated with:

- `BlockStore` → source of `blockIndex → lightId` mapping
    
- `LightingOrchestrator` → owner of SOA light data and animation system
    

---

## 🔧 Core Classes

### `LightAnimatorSystem`

> `src/lighting/LightingAnimatorSystem.ts`

A singleton-owned component instantiated by `LightingOrchestrator`.

#### Features:

| Behavior      | Description                                                          |
| ------------- | -------------------------------------------------------------------- |
| `fadeLights`  | Schedules linear interpolation over time of intensity/radius values  |
| `pulseLights` | Schedules sine-based periodic oscillation of intensity/radius values |
| `update(dt)`  | Advances all animations based on delta time (in seconds)             |
| `clear()`     | Wipes all animations (called on orchestrator clear/destroy)          |

#### Backed by:

- `FadeAnimation[]` – contains mutable structs with index/duration/field state
    
- `PulseAnimation[]` – contains base value, amplitude, phase, and frequency
    
- All animations directly modify SOA fields in `LightSOA`
    

---

## 🧩 Supporting Interfaces

> `src/lighting/interfaces/LightAnimations.ts`

- `FadeAnimation` — from → to over duration (linear)
    
- `PulseAnimation` — base ± amplitude modulated by `sin(2π f t)`
    

Allocated via factory methods to allow for pooling in future if desired.

---

## 🔍 SOA Fields Mutated

| Field            | Description                                |
| ---------------- | ------------------------------------------ |
| `intensity`      | Brightness of the light                    |
| `radius`         | Radius of visual influence                 |
| `animationPhase` | Not modified (reserved for fadeMode logic) |

The system mutates only what the animation type requires (`intensity` or `radius`), in-place, per-frame.

---

## 📦 Block Helpers (Consumer API)

> Located in `src/game/blocks/system/helpers/blockAccessors.ts`

### `fadeBlockLightsTo(...)`

```
fadeBlockLightsTo(
  blocks: Uint32Array,
  from: number,
  to: number,
  duration: number,
  field: 'intensity' | 'radius'
): void
```

Schedules a fade animation on all lights associated with the given blocks. Lights without `lightId !== -1` are ignored.

---

### `pulseBlockLights(...)`

```
pulseBlockLights(
  blocks: Uint32Array,
  base: number,
  amplitude: number,
  frequency: number,
  field: 'intensity' | 'radius'
): void
```

Applies a pulsing sine animation to each light associated with the given blocks. These run indefinitely (until cleared or light is removed).

---

### `getLightIdsForBlocks(...)`

```
getLightIdsForBlocks(
  blocks: Uint32Array,
  lightIdsOut: Uint32Array
): Uint32Array
```

Resolves valid `lightId`s from the given block indices using `BlockStore.lightId[blockIndex]`.

> ⚠️ The `lightIdsOut` scratch buffer is reused internally by all helpers via a module-scoped array:  
> `const SCRATCH_LIGHT_IDS = new Uint32Array(512);`

## 🧪 Example Usage

```
import { getLeftSideShipBlocks, fadeBlockLightsTo, pulseBlockLights } from './helpers/blockAccessors';

const blocks = getLeftSideShipBlocks(shipId);

fadeBlockLightsTo(blocks, 0, 1, 1.0, 'intensity'); // fade-in
pulseBlockLights(blocks, 0.8, 0.2, 2.0, 'intensity'); // low-frequency glow
```

## Best Practices

| Guideline                                           | Rationale                                                   |
| --------------------------------------------------- | ----------------------------------------------------------- |
| ✅ Prefer `Uint32Array` for block sets               | Compatible with scratch buffer and fast indexing            |
| ✅ Avoid repeated calls in the same frame            | Avoid overriding animations before frame progresses         |
| ✅ Do not call in hot loops                          | Intended for events, triggers, or orchestration             |
| 🚫 Do not animate a light and remove it immediately | `lightId → index` map will become invalid mid-frame         |
| 🚫 Do not exceed `SCRATCH_LIGHT_IDS.length`         | Currently fixed at 512 — oversize slices silently truncated |

## 🧼 Lifecycle

- Animations are **cleared** when:
    
    - `LightingOrchestrator.clear()` is called (e.g. mission end)
        
    - `LightingOrchestrator.destroy()` is called
        

They are **updated** each frame via `LightingOrchestrator.update(dt)`.

---

## 🧩 Extension Possibilities

- Support for **easing curves** (e.g. cubicIn, easeOutQuad)
    
- **Tag-based batch animations** (e.g. pulse all lights tagged `"warning"`)
    
- **Amplitude modulation** or randomized pulsing (`Math.sin(...) * randomEnvelope`)
    
- **Exponential falloff fading**

## ✅ Summary

The Lighting Animator System allows animation of lights directly associated with game blocks in a **cache-local**, **low-GC**, and **time-evolving** manner. It abstracts all timing, resolution, and mutability into a reusable system integrated cleanly with your SOA lighting and block infrastructure.

Use it for expressive glow, pulsing effects, timed fades, or any scenario where temporal light behavior conveys gameplay or atmosphere.
