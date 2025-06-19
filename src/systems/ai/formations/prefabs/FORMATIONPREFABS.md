## 🧠 `createHourGlassFormation` Design Intent

This helper generates a declarative `ShipFormationEntry` object for use in the `formations` field of a `WaveDefinition`. The purpose is to encapsulate reusable formation geometry, behavioral presets, and ship configuration logic under one ergonomic function call.

```
// src/systems/ai/formations/factories/createHourGlassFormation.ts

import type { ShipFormationEntry } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';

/**
 * Generates a scalable hourglass-shaped formation centered around the leader.
 */
export function createHourGlassFormation(
  formationId: string,
  leaderShipId: string,
  followerShipIds: [string, string, string, string, string, string],
  leaderAffixes: ShipAffixes = {},
  followerAffixes: ShipAffixes = {},
  distance: number = 1000,
  count: number = 1
): ShipFormationEntry {
  const layout = [
    { x: -distance, y: -distance },     // F0 - upper left
    { x: +distance, y: -distance },     // F1 - upper right
    { x: 0,         y: -2 * distance }, // F2 - top center
    { x: -distance, y: +distance },     // F3 - lower left
    { x: +distance, y: +distance },     // F4 - lower right
    { x: 0,         y: +2 * distance }  // F5 - bottom center
  ];

  const followers = followerShipIds.map((shipId) => ({
    shipId,
    affixes: followerAffixes
  }));

  return {
    formationId,
    layout,
    leader: {
      shipId: leaderShipId,
      affixes: leaderAffixes
    },
    followers,
    count
  };
}
```


### 🔍 Parameter Guide

|Parameter|Type|Purpose|Behavior / Notes|
|---|---|---|---|
|`formationId`|`string`|Unique ID of the formation (used internally by AI FSM registry).|Used as a logical identifier; not currently semantic (e.g., "hourglass", "v", "x", etc.).|
|`leaderShipId`|`string`|Ship ID of the leader unit, placed at the origin (0,0) of the formation.|Will serve as anchor point; all follower offsets are relative to this ship.|
|`followerShipIds`|`string[]`|Ship IDs of the follower units (one per formation slot).|Each is assigned to a specific offset in `layout` (by index). Length must match layout size.|
|`leaderAffixes`|`ShipAffixes?`|Optional attribute modifiers for the leader ship.|E.g., movement speed, shield efficiency, etc. See `ShipAffixes` interface.|
|`followerAffixes`|`ShipAffixes?`|Optional attribute modifiers for all follower ships.|Applied uniformly to each follower entry.|
|`distance`|`number`|Scalar multiplier applied to X/Y coordinates in the `layout`.|Controls the spacing between ships in the formation; e.g., `1000` means 1 block unit per offset.|
|`count`|`number`|Number of times this formation should be instantiated within the wave.|Duplicates the whole formation `count` times. Used by wave engine.|

### 📐 How Layout Is Constructed

In `createHourGlassFormation`, the formation geometry is defined using hardcoded relative positions centered on the leader. Here's how:

```
const layout = [
  { x: -1, y: -1 },  // top-left
  { x:  1, y: -1 },  // top-right
  { x: -0.5, y: 0 }, // mid-left
  { x:  0.5, y: 0 }, // mid-right
  { x: -1, y: 1 },   // bottom-left
  { x:  1, y: 1 }    // bottom-right
].map(pos => ({
  x: pos.x * distance,
  y: pos.y * distance
}));

```

This pattern defines an "hourglass" shape—narrow in the center, wider on top and bottom. The `distance` parameter acts as a scale multiplier.

### 🛠️ How Followers Are Generated

Each follower in `followerShipIds` is mapped to a `FormationShipSpec`, aligned index-wise to the `layout` array:

```
const followers = followerShipIds.map((shipId, i) => ({
  shipId,
  affixes: followerAffixes,
}));

```

This implies:

- The order in `followerShipIds` must exactly match the number and order of `layout` positions.
- Each follower takes on the same affix profile (unless future enhancements allow per-follower affix arrays).

### 🧩 Output Structure

The final object returned adheres to `ShipFormationEntry`:

```
return {
  formationId,
  layout,
  leader: {
    shipId: leaderShipId,
    affixes: leaderAffixes,
  },
  followers,
  count
};

```

This structure plugs directly into `WaveDefinition.formations`.

---

## 🧬 Guidelines for New Formation Generators

To create other formation generators (e.g., `createVFormation`, `createXFormation`, `createWedgeFormation`), follow this architectural schema:

1. **Define `layout`** as a relative geometry (unit-space grid), then scale via `.map(pos => ...)` using `distance`.
    
2. **Ensure `followerShipIds.length === layout.length`**.
    
3. **Use positional symmetry or asymmetry** to capture intended formation aesthetics.
    
4. **Use `formationId`** only for logical identification—it does not affect behavior.
