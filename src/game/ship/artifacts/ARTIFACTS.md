# 🧪 ARTIFACT SYSTEM

The **Artifact System** provides a modular, extensible way to grant passive, ship-specific bonuses through collectible and equippable artifacts. Artifacts are designed to be:

- Globally unlockable via metacurrency
    
- Equipable to individual ships (3 slots per ship)
    
- Declaratively defined (`ArtifactDefinition`)
    
- Resolved at runtime into merged metadata (`ArtifactEffectMetadata`)
    
- Visually represented by `.png` assets in `public/assets/artifacts`
    

---

## 🧭 Overview

Each artifact defines a semantic payload (`ArtifactEffectMetadata`) and may affect:

- Combat behavior (e.g., missile targeting, revive)
    
- Energy, shield, movement, or construction stats
    
- Runtime modifiers applied per ship
    

Artifacts are managed in two layers:

|Layer|Responsibility|
|---|---|
|`PlayerArtifactsManager`|Global ownership, per-ship equip tracking|
|`ArtifactEffectResolver`|Per-ship metadata aggregation from equipped artifacts|

## 🗂️ File Structure

```
artifacts/
├── ARTIFACTS.md                          # ← You are here
├── helpers/
│   └── validateArtifacts.ts              # (TODO) Validation utilities
├── icons/
│   └── ArtifactIconSpriteCache.ts        # Loads .png icons by key
├── interfaces/
│   ├── ArtifactDefinition.ts             # Declarative authoring contract
│   ├── ArtifactEffectMetadata.ts         # Runtime effect payload
│   └── EquippedArtifact.ts               # Slot context (ship + artifact + slot)
├── registry/
│   ├── ArtifactRegistry.ts               # Central registry lookup
│   └── definitions/
│       ├── fortificationModule.ts        # Example: +health +shield
│       ├── heatSeekerTargettingModule.ts # Example: `heatSeekersTargetNearest: true`
│       └── unstableThruster.ts           # Example: `alwaysSuperPulse: true`
├── runtime/
│   └── ArtifactEffectResolver.ts         # Aggregates equipped artifact effects
└── ui/
    ├── ArtifactEquipUIController.ts      # Manages equip screen interactions
    ├── ArtifactCollectionUIController.ts # (Planned) Handles artifact grid logic
    ├── ArtifactCollectionUIRenderer.ts   # (Planned) Grid rendering logic
    ├── ArtifactSlotRenderer.ts           # Draws individual artifact icons
    └── ArtifactTooltipRenderer.ts        # Renders name, description, metadata

```

## 📦 Core Interfaces

### `ArtifactDefinition`

> Author-time declaration

```
interface ArtifactDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // sprite key (maps to .png file)
  category?: string;
  cost: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  metadata: ArtifactEffectMetadata;
}

```

### `ArtifactEffectMetadata`

> Runtime payload; consumed by ship behavior

```
interface ArtifactEffectMetadata {
  // Universal stats
  maxHealthBonus?: number;
  energyRegenRate?: number;
  entropiumPickupBonus?: number;
  ...

  // Behavior toggles
  reviveOnDeath?: boolean;
  heatSeekersTargetNearest?: boolean;
  alwaysSuperPulse?: boolean;

  // Constructive effects
  startingBlocks?: string[];
}

```


Merging behavior (inside `ArtifactEffectResolver`):

|Value Type|Merge Rule|
|---|---|
|`number`|Additive|
|`boolean`|Last-write-wins|
|`string[]`|Deduplicated union|
|`other`|Logged as a warning|

### `EquippedArtifact`

> Runtime binding of artifact to ship slot

```
interface EquippedArtifact {
  shipName: string;
  artifactId: string;
  slotIndex: 0 | 1;
}

```

## 🧠 Aggregation Logic

 `getAggregatedArtifactEffects(shipName: string): ArtifactEffectMetadata`

Resolves the two equipped artifact IDs (via `PlayerArtifactsManager`), looks up their definitions in the registry, and merges their `metadata` values.

This mirrors `getAggregatedSkillEffects()` for skill trees.

---

## 🧠 Runtime State Manager

### `PlayerArtifactsManager`

Singleton responsible for:

- Global unlock state (`Set<string>`)
    
- Equipped artifact slots per ship (`Map<shipName, [artifactId?, artifactId?]>`)
    
- Equip/unequip via `equipArtifact(shipName, slotIndex, artifactId)`
    
- Persistence via `toJSON()` / `fromJSON()`
    

Used by `Ship.getArtifactEffects()` to resolve metadata at runtime.

---

## 🖼️ Icon Sprite Cache

### `ArtifactIconSpriteCache`

Artifacts use pre-authored `.png` files stored in `public/assets/artifacts`.
```
// Loads and caches artifact_0_3.png
const img = await getArtifactIconSprite('artifact_0_3');
ctx.drawImage(img, x, y);

```

Powered by `loadImage()` from `imageCache.ts`. Fallback asset: `fallback.png`.

---

## 🎮 UI Architecture (WIP)

- **ArtifactEquipUIController**
    
    - Triggered from `ShipSelectionMenu`
        
    - Tracks selected ship + slot index
        
    - Renders full artifact collection for selection
        
- **ArtifactCollectionUIController**
    
    - Handles grid layout, cursor movement, gamepad focus
        
    - Maps `getUnlockedArtifacts()` to artifact slots
        
- **ArtifactSlotRenderer**
    
    - Renders a single artifact icon
        
    - May include selected/locked/equipped overlay indicators
        
- **ArtifactTooltipRenderer**
    
    - Renders name, description, and stat summary

### ✅ API Summary

|Method|Purpose|
|---|---|
|`getArtifactById(id)`|Lookup artifact definition|
|`getAllArtifacts()`|Enumerate registry|
|`getAggregatedArtifactEffects(ship)`|Per-ship metadata|
|`equipArtifact(ship, slot, id)`|Equip artifact|
|`getEquippedArtifacts(ship)`|Get current artifacts|
|`getUnlockedArtifacts()`|All available artifact IDs|
|`getArtifactIconSprite(key)`|Returns `HTMLImageElement`|

### ✅ Example

```
const ship = ...;
const modifiers = ship.getArtifactEffects();

if (modifiers.reviveOnDeath) {
  triggerReviveSequence(ship);
}

const icon = await getArtifactIconSprite('artifact_0_4');
ctx.drawImage(icon, x, y, 24, 24);

```

## 📌 Authoring Guidelines

1. Add artifact `.ts` file in `registry/definitions/`
    
2. Define `ArtifactDefinition` with unique `id`, `icon`, and `metadata`
    
3. Register it in `ArtifactRegistry.ts`
    
4. Use a `.png` image with matching name in `/public/assets/artifacts/`
    
5. Use the `icon` key in `ArtifactDefinition` without extension (e.g., `'artifact_0_4'`)