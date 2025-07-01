# 🚀 SHIP_SKILL_TREE.md

A technical overview of the **Starter Ship Skill Tree System**, which governs ship-specific upgrade graphs in Shipwright Survivors. This system enables deterministic skill layouts, grid-based visual structure, and strict semantic payloads affecting gameplay systems such as combat, construction, and passive unlocks.

---

## 🧭 Overview

Each **starter ship** is associated with a bespoke, declaratively defined **skill tree**—a directed acyclic graph (DAG) of upgradeable nodes with spatial coordinates and interconnections.

- Defined per ship (`/registry/definitions/*.ts`)
- Aggregated in `StarterShipSkillTreeRegistry`
- Resolved at runtime via `UnlockedShipSkillTreeResolver`

## 📦 Data Model

### `StarterShipSkillTree`

```
interface StarterShipSkillTree {
  shipId: string;                // e.g. 'vanguard'
  displayName: string;          // For UI
  gridSize: number;             // Grid layout size (e.g., 12x12)
  maxSelectableNodes: number;   // Current default: 5
  nodes: PositionedSkillNode[]; // Full node layout
}
```

### `PositionedSkillNode`


```
interface PositionedSkillNode {
  node: SkillNode;
  x: number;
  y: number;
  connectedTo: string[]; // Edges to other node IDs
  isStarter?: boolean;   // If true, may be unlocked first
}

```
---

### `SkillNode`

```
interface SkillNode {
  id: string;                  // Unique within the tree
  name: string;                // Display name
  description: string;         // Tooltip text
  icon: string;                // Icon key (see IconSpriteCache)
  category?: string;           // Optional UI grouping
  cost: number;                // In metacurrency
  nodeSize: 'major' | 'minor';// Visual weight
  metadata: ShipSkillEffectMetadata; // Semantic payload
}

```

---

### `ShipSkillEffectMetadata`

A strict schema defining every permissible gameplay effect applied via nodes:

```
interface ShipSkillEffectMetadata {
  // SW-1
  turretDamage?: number;
  turretProjectileSpeed?: number;
  turretCriticalChance?: number;
  turretPenetratingShots?: boolean;
  turretSplitShots?: boolean;

  // Vanguard
  igniteOnSeekerMissileExplosion?: boolean;
  seekerMissileExplosionRadius?: number;
  seekerMissileDamage?: number;
  doubleSeekerMissileShotChance?: number;
  timeFreezeOnSeekerMissileExplosion?: boolean;

  // Monarch
  explosiveLanceDamage?: number;
  explosiveLanceGrappling?: boolean;
  explosiveLanceLifesteal?: boolean;
  explosiveLanceElectrocution?: boolean;
  explosiveLanceFiringRate?: number;
  explosiveLanceRange?: number;

  // Halo
  haloBladeSplitBlades?: boolean;
  haloBladeDetonateOnHit?: boolean;
  haloBladeFreezeOnHit?: boolean;
  haloBladeDamage?: number;
  haloBladeSize?: number;
  haloBladeOrbitRadius?: number;

  // Godhand
  laserDamage?: number;
  laserBeamWidth?: number;
  laserEfficiency?: number;
  laserShieldPenetration?: boolean;
  laserTargeting?: boolean;

  // Universal
  startingBlocks?: string[]; // Block IDs to spawn with
}

```

---

## 🧠 Aggregation & Runtime Resolution

The selected nodes are tracked via `PlayerShipSkillTreeManager` and resolved through:
```
getAggregatedSkillEffects(shipId: string): ShipSkillEffectMetadata

```

This function:

- Loads the relevant `StarterShipSkillTree`
    
- Filters for selected nodes
    
- Merges all `metadata` fields into a final payload using:
    
    - **`number`** → additive
        
    - **`boolean`** → last-write-wins
        
    - **`string[]`** → union merge (deduplicated)
        
    - Other → logged as warnings
        

This output feeds into gameplay systems such as:

- `ShipFactory` (e.g., `startingBlocks`)
    
- `CombatService`, `WeaponBackends` (e.g., damage, crit, AoE)
    
- `ProjectileSystem`, `LanceSystem`, etc.

## 🧠 Runtime State Tracking: PlayerShipSkillTreeManager

This singleton tracks the player’s node selections per ship. It is the authoritative in-memory record for skill tree progression and node acquisition.

```
// Internal mapping
private selectedNodeMap: Record<shipId: string, Set<nodeId: string>>
```

### 🔍 Core API

| Method                        | Purpose                                                                     |
| ----------------------------- | --------------------------------------------------------------------------- |
| `hasNode(shipId, nodeId)`     | Checks whether a node is acquired                                           |
| `getSelectedNodeIds(shipId)`  | Returns selected node IDs as array                                          |
| `getSelectedNodeSet(shipId)`  | Returns a `Set` of selected nodes for fast lookup                           |
| `getSelectedCount(shipId)`    | Returns number of acquired nodes for enforcement                            |
| `acquireNode(shipId, nodeId)` | Adds a node to the player’s selected list (bounded by `maxSelectableNodes`) |
| `resetTree(shipId)`           | Clears selections for one ship                                              |
| `resetAll()`                  | Clears all ship skill selections                                            |
| `destroy()`                   | Destroys singleton instance and resets state                                |

⚠️ Notes
acquireNode() enforces the max selection cap per tree, defined via StarterShipSkillTree.maxSelectableNodes.

Future UI systems may subscribe to a 'skill:acquired' event (currently a TODO comment) for real-time feedback or animation.

### Example

```
const manager = PlayerShipSkillTreeManager.getInstance();
manager.acquireNode('vanguard', 'ignite-explosion');

if (manager.hasNode('vanguard', 'ignite-explosion')) {
  console.log('Ignition node selected!');
}
```

This class is the single point of truth for selected skills, consumed downstream by aggregation logic, upgrade systems, and render layers.


## 🎨 Icon System

Icons are referenced by string key (e.g., `'icon-critical-hit'`) and resolved via:

```
/icons/StarterShipSkillIconSpriteCache.ts
```

Each icon key maps to a `HTMLCanvasElement` generated using deterministic drawing logic (e.g., gradient fills, symbol overlays) from submodules per ship family:

```
/icons/sw1/*.ts
/icons/vanguard/*.ts
```

Use `drawIconBase()` to create consistent backgrounds. Keep canvas dimensions consistent (e.g., `24x24`) to ensure alignment across UI.

## 🛠 Authoring Guidelines

### ✅ Defining a New Tree

1. **Create a new file** in `registry/definitions/`, e.g. `juggernaut.ts`
    
2. **Export a constant** of type `StarterShipSkillTree`
    
3. Ensure:
    
    - Unique `id` for each node
        
    - All `connectedTo[]` point to valid node IDs
        
    - At least one `isStarter` node

```
export const juggernautSkillTree: StarterShipSkillTree = {
  shipId: 'juggernaut',
  displayName: 'Juggernaut',
  gridSize: 12,
  maxSelectableNodes: 5,
  nodes: [ ... ]
};

```

**Register the tree** in `StarterShipSkillTreeRegistry.ts`:

```
import { juggernautSkillTree } from './definitions/juggernaut';

const internalRegistry: Record<string, StarterShipSkillTree> = {
  ...
  [juggernautSkillTree.shipId]: juggernautSkillTree,
};

```

### ✅ Adding New Metadata Keys

1. Add to `ShipSkillEffectMetadata`
    
2. Add runtime consumers (e.g., apply `laserTargeting` in beam AI)
    
3. Update `UnlockedShipSkillTreeResolver` if any new merging logic is needed
    

---

## 🧪 Validation (Optional)

You may implement a validator in `helpers/validateSkillTree.ts` to enforce:

- Unique node IDs
    
- No invalid `connectedTo` links
    
- No isolated non-starter nodes
    
- Grid coordinates within `[0, gridSize)`
    
- No cyclic paths
    

---

## 🔍 Debugging & Testing

- Use `getAggregatedSkillEffects(shipId)` in unit tests or console to inspect live payloads
    
- Use UI overlays to visualize `connectedTo[]` link structure
    
- Enable `console.warn` output in `UnlockedShipSkillTreeResolver` to catch misconfigured nodes

```
skills/
├── icons/              # Cached and procedural icon rendering
├── interfaces/         # Core typed contracts
├── registry/           # Static skill tree declarations
│   └── definitions/    # Per-ship layout and node definitions
├── runtime/            # Aggregation + resolution logic
└── helpers/            # Tree validation, utilities

```

