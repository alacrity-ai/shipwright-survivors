# 🚀 Powerup System – Shipwright Survivors

### Version: 1.0  
### Last Updated: 2025-06-26  
### Owner: Gameplay Systems Team  

---

## 📘 Overview

The Powerup System introduces a modular, extensible framework for implementing **branching, unlockable upgrades** that affect player combat and strategy. Powerups are defined in a **tree-based structure**, allowing for authored and procedurally-scaling nodes.

This system supports:
- Exclusive branching logic
- Procedural upgrades
- Capstone triggers
- Dynamic metadata aggregation
- Extensible registry pattern
- Integration with UI menus and gameplay state

---

## 🧱 High-Level Architecture

```text
src/game/powerups/
├── registry/
│   ├── PowerupNodeDefinition.ts       # Core definition interface
│   ├── PowerupRegistry.ts             # Static registry and procedural synthesis
│   └── trees/                         # Individual authored trees
├── runtime/
│   ├── PlayerPowerupManager.ts        # Runtime acquisition tracker (singleton)
│   └── ActivePowerupEffectResolver.ts # Aggregates all effects from acquired nodes
├── utils/
│   └── PowerupTreeUtils.ts            # Validity rules, procedural indexing logic
├── ui/
│   └── PowerupSelectionMenu.ts        # WIP: Menu for choosing powerups
├── types/
│   └── PowerupMetadataTypes.ts        # Strong-typed metadata interface (optional)
└── POWERUPS.md                        # This file
```

## 🌳 PowerupNodeDefinition

Each node in a tree is a `PowerupNodeDefinition`. These nodes may be:

- **Root nodes**: no parentId
    
- **Standard child nodes**: referencing a parentId
    
- **Procedural nodes**: dynamically synthesized beyond authored branches

```
export interface PowerupNodeDefinition {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: string;
  parentId: string | null;
  metadata?: PowerupEffectMetadata;
  exclusiveBranchKey?: string;
  isProcedural?: boolean;
  scaling?: Partial<PowerupEffectMetadata>;
  capstoneAtLevel?: number;
}
```

## 🧠 Runtime State – `PlayerPowerupManager`

The singleton `PlayerPowerupManager` tracks which nodes have been acquired. It provides:

- `.getAll()` → All acquired IDs
    
- `.has(id)` → Whether player owns a node
    
- `.acquire(id)` → Marks a node as acquired
    
- `.reset()` → Clears state
    
- `.getCountByCategory(category)` → Useful for UI counters
    
- `.getProceduralDepth(id)` → Extracts `+N` from procedural node IDs
    
- `.destroy()` → Destroys singleton + resets `PowerupRegistry`
    

---

## 📚 Static Data – `PowerupRegistry`

The static registry loads all authored trees and supports **lazy procedural node synthesis**:

- `.get(id)` → Returns authored or synthetic node
    
- `.getAll()` → All statically authored nodes
    
- `.getChildren(id)` / `.getParent(id)` / `.getAllDescendants(id)`
    
- `.getExclusiveBranchKey(id)`
    
- `.getByCategory(category)`
    
- `.isProcedural(id)`
    
- `.destroy()` → Clears the registry for fresh runs
    

Procedural nodes (e.g. `rapid-fire-4`, `rapid-fire-5`, etc.) are synthesized on-demand based on their parent.


## 🧮 Effect Aggregation – `ActivePowerupEffectResolver`

This module computes the aggregate of all powerup metadata for the player:

```
getAggregatedPowerupEffects(): Record<string, number | boolean>
```

It:

- Merges metadata from all acquired nodes
    
- Walks up procedural ancestries to apply `scaling`
    
- Produces a flat object like:

```
{
  fireRateMultiplier: 1.65,
  baseDamageMultiplier: 1.8,
  criticalChance: 0.25
}
```
This object is consumed by combat systems, AI modifiers, visual effects, etc.

## 🧪 PowerupTreeUtils

Utility for querying eligible next upgrades:

```
getValidNextPowerups(): PowerupNodeDefinition[]

```

Rules:

- Roots: allowed only if no sibling in exclusiveBranchKey is owned
    
- Children: allowed if parent is acquired
    
- Procedural extensions: allowed only if player has deepest node and no further children exist
    

Also provides:

- `extractProceduralIndex(id)`
    
- `incrementProceduralId(baseId, index)`

## 🎨 UI & Icons

Each node includes an `icon: string` field. The system assumes these map to pre-cached sprites.

**TODO**: Implement a `PowerupIconCache` similar to `BlockSpriteCache`.

---

## 📐 Example Tree Definition

```
export const attackerTree: PowerupNodeDefinition[] = [
  {
    id: 'attacker-1',
    label: "Attacker's Arsenal",
    description: 'Increases damage and fire rate.',
    icon: 'icon-attackers-arsenal',
    category: 'offense',
    parentId: null,
    exclusiveBranchKey: 'attacker',
    metadata: { baseDamageMultiplier: 1.1, fireRateMultiplier: 1.05 }
  },
  {
    id: 'rapid-fire-2',
    label: 'Rapid Fire',
    description: 'Increases fire rate.',
    parentId: 'attacker-1',
    icon: 'icon-rapid-fire',
    category: 'offense',
    metadata: { fireRateMultiplier: 1.15 }
  },
  {
    id: 'rapid-fire-4',
    label: 'Hyper Burst +1',
    parentId: 'rapid-fire-3',
    icon: 'icon-hyper-burst-generic',
    category: 'offense',
    isProcedural: true,
    scaling: { fireRateMultiplier: 0.05 }
  }
];
```


## 🔁 Reset Lifecycle

To fully clear all state between game rounds:

`PlayerPowerupManager.destroy(); // Also clears PowerupRegistry`

This ensures:

- Fresh registry hydration
    
- Acquired state wiped
    
- No memory of procedural nodes across runs
    

---

## 🧩 Future Plans

- Implement `PowerupSelectionMenu.ts` (scrollable, mouse/controller aware)
    
- Add UI for visualizing branching structure
    
- Emit `powerup:acquired` events for passive updates
    
- Hook into combat + AI behavior
    
- Implement capstone effect triggers
    

---

## 🧼 Best Practices

- Keep each tree in its own file for clarity and maintainability
    
- Use concise but readable `id`s
    
- Always set `exclusiveBranchKey` for root-level forks
    
- Avoid duplicate IDs — registry will warn
    
- Define `scaling` only on `isProcedural: true` nodes
    
- Use `destroy()` lifecycle hooks during testing or between runs
    

---

## 🛠️ Dev Checklist

-  Define tree in `registry/trees/`
    
-  Add to `ALL_TREES` in `PowerupRegistry.ts`
    
-  Use `metadata` for statically defined buffs
    
-  Use `scaling` for procedural increments
    
-  Use `capstoneAtLevel` if applicable
    
-  Define icons in sprite cache (pending)
    
-  Implement UI menu interaction (WIP)

