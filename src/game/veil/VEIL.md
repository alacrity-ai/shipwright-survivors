# `VEIL.md`

## Overview

The **Veil System** is a spatial mechanic layered over normal gameplay that introduces **environmental distortion effects** and **dynamic ship mutation** within designated regions of the world, referred to as _cloud regions_. It leverages a centralized registry (`CloudRegionRegistry`) to define these regions, a runtime manager (`CloudManager`) to track player ingress/egress and modulate visual/audio effects, and a mutator subsystem (`VeilShipMutator`) to procedurally alter nearby enemy ships during active veil engagement.

This document enumerates the architecture, control flow, behavioral semantics, and key extension points.

---

## 1. CloudRegionRegistry

### File

`src/game/clouds/CloudRegionRegistry.ts`

### Purpose

Defines and registers **named collections** of `CloudRegion` objects representing fog-affected areas in the world map. Each region is a circular zone with distinct front and back visual parameters (e.g., color, alpha, density) applied when the player enters the region.

### Schema: `CloudRegion`

```
type CloudRegion = {
  id: string;
  center: Vec2;
  radius: number;
  frontParams: CloudParams;
  backParams: CloudParams;
}
```

### Schema: `CloudParams`

```
type CloudParams = {
  speed?: number;
  density?: number;
  quantity?: number;
  scale?: number;
  alpha?: number;
  color?: [number, number, number];
}

```

### Example

```
CloudRegionRegistry.register('misty-basin', [
  {
    id: 'misty-01',
    center: { x: 16000, y: -2000 },
    radius: 8000,
    frontParams: { ... },
    backParams: { ... },
  },
  ...
]);

```

---

## 2. CloudManager

### File

`src/systems/fx/CloudManager.ts`

### Purpose

This runtime component receives a reference to the player's ship and the relevant `CloudRegion[]`. On each frame, it:

- Determines which (if any) cloud region the player occupies.
    
- Computes a **fade-in factor** (`alphaFactor`) based on proximity to the region's center (100% opacity when within 50% of radius).
    
- Interpolates cloud front/back parameters using exponential smoothing (`lerp`) and emits them via `setCloudParamsFront/Back`.
    
- Flags whether the player is “in cloud” via perceptual alpha thresholds (ε = 0.001).
    
- Plays introductory dialogue the first time a region is entered.
    

### Key Behavioral Logic

```
if (distanceToCenter <= region.radius * 0.5)
  alphaFactor = 1.0;
else
  alphaFactor = falloff based on linear interpolation

```

### Dialogue Integration

Plays a single introductory line when first entering any Veil region:

```
"Be careful Shipwright. Strange things happen in the Veil..."

```

### Public API

- `isShipInCloud(): boolean` – returns true if front cloud alpha exceeds epsilon.
    
- `getRegionCoords(): {x, y, radius}[]` – used for rendering overlays (e.g., minimap).
    

---

## 3. VeilShipMutator

### File

`src/game/veil/VeilShipMutator.ts`

### Purpose

While the player is inside a cloud region (as reported by `CloudManager.isShipInCloud()`), this system will periodically (every `MUTATE_INTERVAL_SECONDS`) mutate a nearby enemy ship by dynamically placing a procedurally generated set of blocks onto it.

The mutation is **non-instantaneous** and **incremental**, occurring over time at `BLOCKS_PER_SECOND` rate.

### Mutation Constraints

- **Search radius**: `FETCH_RADIUS = 3200`
    
- **Max target size**: `SHIP_SIZE_LIMIT = 50` blocks
    
- **Blocks to add**: Random number between `MINIMUM_RANDOM_BLOCKS` and `MAXIMUM_RANDOM_BLOCKS`
    
- **Block types**: Cycled from a ring buffer seeded via `getRandomBlockInTier(BLOCK_TIER)`
    

### Selection Criteria for Candidate Ships

```
!ship.isVeilMutated?.() &&
!this.mutatingShips.has(ship) &&
ship.getBlockCount() <= SHIP_SIZE_LIMIT

```

### Mutation Process

1. **Pick** a random eligible ship in radius.
    
2. **Mark** it as mutated via `setMutated(true)` and change its color.
    
3. **Create** a mutation job with randomly chosen block types.
    
4. **Auto-place** blocks one by one using `autoPlaceBlock()` per frame.
    
5. **Remove** the job once all blocks are placed.
    

### Internal Loop

```
for (const [ship, job] of this.mutatingShips.entries()) {
  job.elapsed += dt;
  const blocksToAdd = floor(job.elapsed * BLOCKS_PER_SECOND);
  ...
}

```

---

## 4. Visual and Audio Integration

- `setCloudParamsFront` and `setCloudParamsBack` are hooks into the rendering layer, dynamically altering cloud density, motion, and tinting in response to proximity.
    
- `reportDialogueLine` triggers narrative audio/text feedback when veil is entered.
    
- Block mutations visually alter enemy ships mid-combat, enhancing the "glitchy" or "distorted reality" tone of the Veil.
    

---

## ✦ Veil Integration in Missions (`cloudRegions`)

Each `MissionDefinition` can specify one or more **Veil cloud regions** by referencing pre-registered `CloudRegion[]` definitions from the centralized `CloudRegionRegistry`.

These cloud regions define fog-like environmental zones (aka the “Veil”) that dynamically affect rendering, ship behavior, and game mechanics such as enemy ship mutation. This system is optional and only enabled for missions that explicitly provide the `cloudRegions` field.

### ✅ Field Definition

```
interface MissionDefinition {
  ...
  cloudRegions?: CloudRegion[];
}

```

### ✅ Usage Example

```
import { CloudRegionRegistry } from '@/game/clouds/CloudRegionRegistry';

export const missionRegistry: Record<string, MissionDefinition> = {
  mission_002: {
    id: 'mission_002',
    name: 'Starfield Gauntlet',
    ...
    cloudRegions: CloudRegionRegistry.get('misty-basin'),
  },
  ...
};

```

In this example, the mission `"Starfield Gauntlet"` will include three circular Veil zones (e.g., `'misty-01'`, `'misty-02'`, `'misty-03'`) as defined in the `misty-basin` group. These are retrieved at runtime from the `CloudRegionRegistry`.

### 🔗 Runtime Behavior

When the mission loads:

- The `CloudManager` is instantiated with the `cloudRegions` for this mission.
    
- Visual fog layers and post-processing are activated in those areas.
    
- The `VeilShipMutator` begins monitoring ship proximity and initiates dynamic mutations inside those regions.
    
- Introductory dialogue is optionally played when first entering the Veil.
    

### 🧩 Authoring New Veil Zones

1. Define new `CloudRegion[]` in `CloudRegionRegistry.ts`.
    
2. Register with a unique string key.
    
3. Reference via `CloudRegionRegistry.get('your-key')` in the mission's `cloudRegions` field.


---

## 5. Extension Points

- **New Veil Zones**: Add new entries to `CloudRegionRegistry` and assign to maps via unique keys (e.g., `'frozen-gorge'`).
    
- **Dynamic Difficulty**: Vary `BLOCK_TIER` or increase `BLOCKS_PER_SECOND` over time or by difficulty level.
    
- **Mutator Effects**: Extend `autoPlaceBlock` or integrate with other visual FX systems to give visual/audio feedback during mutations.
    
- **Boss Triggers**: Mutator can be made to occasionally trigger a miniboss spawn upon completing a certain number of mutations.
    

---

## Summary

The Veil system provides a highly extensible framework for:

- Region-based environmental effects
    
- Diegetic gameplay augmentation
    
- Emergent difficulty scaling via procedural ship mutation
    

Its implementation adheres to clean separation of concerns (registry vs manager vs mutator) and is amenable to both visual tuning and systemic expansion.
