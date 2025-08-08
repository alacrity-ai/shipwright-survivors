# PASSIVES.md

> **Global Passives System**
> 
> A fully typed, data-driven passive tree that expresses persistent, account-wide upgrades, consumable by any gameplay subsystem via a single aggregated view.

---

## 1) Purpose & Non-Goals

### Purpose

- Replace the ad-hoc legacy passives with a **declarative**, **type-safe**, **JSON-authored** global passive tree.
    
- Decouple game logic from authoring: designers iterate in JSON; consumers read a **single aggregated metadata object**.
    
- Preserve strict typing to prevent “magic string” drift and runtime surprises.
    

### Non-Goals

- No ship-specific skill logic here (those remain in the ship skill subsystem).
    
- No “tier escalator” economy: **node cost lives in data**; there’s no implicit tier schedule.
    
- No per-run roguelike modifiers; this is **meta-progression**.
    

---

## 2) Design Tenets

- **Data first**: The passive tree is loaded entirely from JSON at runtime; code changes are not required for balancing.
    
- **Type safety**: Every effect key is declared in `PassiveNodeMetadata`. Unknown keys are rejected (or warned) during deserialization.
    
- **Single source of truth**: Consumers access the merged `PassiveNodeMetadata` via the **UnlockedPassiveAggregator**.
    
- **Ergonomic consumption**: Consumers never inspect nodes/graph; they only consult the aggregate bonuses.
    
- **Predictable merging**:
    
    - `number` → **sum**
        
    - `boolean` → **OR**
        
    - `string[]` → **set-union (unique)**
        
    - `string` → overwrite (rare, explicit)
        

---

## 3) Current Files

```
src/game/passives/
├── PASSIVES.md                             // This document
├── icons
│   └── passiveIconCache.ts                 // 24×24 canvas sprites; consistent with ship-skill cache
├── interfaces
│   ├── PassiveConnection.ts                // { from: {x,y}, to: {x,y} }
│   ├── PassiveNode.ts                      // { id, name, description, icon, nodeSize, cost, metadata }
│   ├── PassiveNodeMetadata.ts              // Typed passive keys and value types
│   ├── PassiveTree.ts                      // { gridSize, squares, connections, timestamp }
│   └── PositionedPassiveNode.ts            // { node, x, y, connectedTo[], isStarter? }
├── json
│   └── PassiveTreeDeserializer.ts          // JSON → PassiveTree (infers isStarter for 'root-node')
├── runtime
│   └── UnlockedPassiveAggregator.ts        // Unlocked nodes → aggregated PassiveNodeMetadata
└── ui
    ├── PassiveTreeTooltipRenderer.ts       // TODO
    ├── PassiveTreeUIController.ts          // TODO
    └── PassiveTreeUIRenderer.ts            // TODO

```

**Note**: The **PlayerGlobalPassiveManager** lives in `src/game/player/PlayerGlobalPassiveManager.ts` (outside this tree).  
It tracks unlock state and currency and feeds the Aggregator.

## 4) Data Model

### PassiveNode

- **Identity**: `id`, `name`, `description`, `icon`.
    
- **Economy**: `nodeSize: 'minor' | 'major'`, `cost: number`.
    
- **Payload**: `metadata: PassiveNodeMetadata` (typed effect bag).
    

### PositionedPassiveNode

- Adds `x`, `y` grid coordinates and `connectedTo: string[]`.
    
- `isStarter` is **not serialized**; we infer it in the deserializer:  
    `isStarter = (node.id === 'root-node')`.
    

### PassiveTree

- `gridSize: number`
    
- `squares: PositionedPassiveNode[]`
    
- `connections: PassiveConnection[]` (redundant with `connectedTo` but useful for rendering/validation)
    
- `timestamp: string (ISO 8601)`
    

### PassiveNodeMetadata (initial keys)

- **Offense**: `damage: number`, `fireRate: number`
    
- **Defense**: `armor: number`, `mitigation: number`
    
- **Movement**: `thrust: number`, `turnPower: number`
    
- **Utility**: `entropiumPickupBonus: number`, `blockDropRate: number`, `harvestRange: number`
    
- **Ability**: `abilityCooldown: number`, `abilityPower: number`
    
- **Capstones**: `slayer|voidwalker|atronach|incidentInvestigator|builder|trademaster|explorer|bossMastery: boolean`
    

> Extend **only** by adding to `PassiveNodeMetadata.ts`; the deserializer will warn or reject unknown keys depending on policy.

---

## 5) Serialization & Deserialization

- Source of truth: `public/assets/passives/player-passives.json`.
    
- `PassiveTreeDeserializer.fromJSON(json)`:
    
    - Parses and validates basic structure.
        
    - Coerces node fields and nodeSize (`major|minor`).
        
    - Validates metadata value **types** (`number|boolean|string|string[]`).
        
    - **Infers** `isStarter` when `id === 'root-node'`.
        
    - Builds `PassiveTree` instance.
        

**Schema shape (informal recap):**

```
{
  "gridSize": 51,
  "squares": [
    {
      "x": 22, "y": 17,
      "metadata": {
        "id": "damage-3",
        "name": "Enhanced Damage",
        "description": "...",
        "icon": "icon-damage",
        "nodeSize": "minor",
        "cost": 10,
        "metadata": { "damage": 0.05 }
      }
    }
  ],
  "connections": [{ "from": {"x":19,"y":31}, "to": {"x":17,"y":29} }],
  "timestamp": "2025-08-08T01:49:32.132Z"
}

```

---

## 6) Runtime Flow

```
JSON file → PassiveTreeDeserializer → PassiveTree
                 │
                 ▼
      PlayerGlobalPassiveManager
   (currency, unlock node IDs, refund)
                 │
                 ▼
     UnlockedPassiveAggregator.getAggregatedPassives()
                 │
                 ▼
        Consumer systems (read-only):
  - weapons (damage, fireRate)
  - movement (thrust, turnPower)
  - defense (armor, mitigation)
  - economy/loot (blockDropRate, entropiumPickupBonus, harvestRange)
  - abilities (abilityCooldown, abilityPower)
  - capstone gates/behaviors (booleans)

```

#### Consumer Usage Example

```
import { UnlockedPassiveAggregator } from '@/game/passives/runtime/UnlockedPassiveAggregator';

const P = UnlockedPassiveAggregator.getAggregatedPassives();
if (P.damage)   weapon.damage *= (1 + P.damage);
if (P.fireRate) weapon.fireInterval *= (1 / (1 + P.fireRate));
if (P.thrust)   ship.thrust *= (1 + P.thrust);

if (P.slayer) { /* enable slayer-specific behavior */ }

```

## 7) Iconography

- File: `src/game/passives/icons/passiveIconCache.ts`
    
- **24×24** canvas; stylistically congruent with ship skill tree.
    
- Initial keys:
    
    - `icon-damage` (red)
        
    - `icon-armor` (blue)
        
    - `icon-thrust` (orange)
        
    - `icon-blockDropRate` (purple)
        
    - `icon-harvest` (green)
        
    - `icon-ability` (light powder purple)
        
    - `icon-fallback` (registered + warning on miss)
        
- Extend by adding drawer functions and mapping keys in `initializePassiveIconCache()`.
    

---

## 8) Validation Policy

- **Structural** (required): enforce presence and types for tree, squares, node fields, connections, timestamp.
    
- **Metadata value type** (required): only `number|boolean|string|string[]`.
    
- **Metadata key allowlist** (recommended next step): compare keys to `PassiveNodeMetadata` and:
    
    - **Strict mode**: throw on unknown keys (release builds).
        
    - **Lenient mode**: warn and skip (iteration builds).
        

---

## 9) Economy

- Currency: **Cores** via `PlayerMetaCurrencyManager`.
    
- Unlock: `PlayerGlobalPassiveManager.unlockNode(nodeId)` checks affordability, subtracts cost, records unlock.
    
- Refund: `refundAll()` sums node costs and re-credits currency. (Developer utility; expose carefully in UI.)
    

---

## 10) Performance Considerations

- Aggregation currently **stateless** and recomputed on call.  
    If queried every frame by many systems:
    
    - Add a **dirty flag** in `PlayerGlobalPassiveManager` (set on unlock/refund/clear).
        
    - `UnlockedPassiveAggregator` caches the last aggregate and recomputes only when dirty.
        
- Data structures:
    
    - `unlocked: Set<string>` for O(1) membership.
        
    - Optionally keep a transient `Map<string, PassiveNode>` lookup at tree load time.
        

---

## 11) Migration Plan (Legacy → Global)

- Keep `PlayerPassiveManager` (legacy) alive during transition.
    
- Introduce feature flags or consumer-level toggles to swap from legacy bonus sourcing to `UnlockedPassiveAggregator`.
    
- One system at a time (weapons → movement → defense → economy → abilities).
    
- Remove legacy tiers and metadata tables once parity is achieved.
    
- Write a small adapter to **translate old saves** (if needed) into unlocked node IDs approximating former totals.
    

---

## 12) Testing Strategy

- **Deserializer tests**
    
    - Valid tree parses.
        
    - Missing/invalid fields throw.
        
    - Unknown metadata keys (strict vs lenient).
        
    - `root-node` → `isStarter: true`.
        
- **Manager tests**
    
    - Affordability, unlock, double-unlock prevention.
        
    - Refund totals, clear vs refund semantics.
        
    - Persistence: `toJSON()/fromJSON()` roundtrip.
        
- **Aggregator tests**
    
    - Numeric summation, boolean OR, array union behavior.
        
    - Mixed types resilience and warnings.
        
    - Caching correctness (once implemented).
        
- **Icon cache tests**
    
    - Initialize idempotency, fallback resolution, missing key warnings.
        

---

## 13) Roadmap (Near-Term)

- **UI**
    
    - `PassiveTreeUIRenderer.ts`: grid, nodes, edges, hover/selection.
        
    - `PassiveTreeTooltipRenderer.ts`: name, description, cost, effect table, “Unlocked/Locked” state, capstone badges.
        
    - `PassiveTreeUIController.ts`: navigation (mouse + gamepad), selection logic, unlock flow with currency checks.
        
- **Validation hardening**
    
    - Enable **strict metadata key allowlist**.
        
    - Graph integrity checks (all `connectedTo` refs exist; connections symmetrical or policy-checked).
        
- **Performance**
    
    - Aggregation cache + dirty flags.
        
    - Prebuilt `id → node` map on tree load.
        
- **Content tooling**
    
    - Export sanity checks in the editor (icon key exists, cost ≥ 0, duplicate ID detection).
        
- **Telemetry (optional)**
    
    - Unlock funnel analytics, capstone reach rates, heatmaps for node popularity.
        

---

## 14) Open Questions

- Should `connections` be **authoritative** and `connectedTo` derived, or vice-versa? (Currently both are supported; we should pick one canonical source.)
    
- Do we need per-node **unlock prerequisites** beyond graph adjacency (e.g., “requires N nodes in hemisphere” or “requires capstone X”)? If so, extend `PassiveNode` with a `requirements` clause.
    
- Balance policy for **stacking percentages**: we presently **sum**. If diminishing returns are desired, standardize a transform (e.g., `effective = 1 - Π(1 - value)`).
    

---

## 15) Developer Recipes

**Loading the tree and initializing systems**

```
import { PassiveTreeDeserializer } from '@/game/passives/json/PassiveTreeDeserializer';
import { PlayerGlobalPassiveManager } from '@/game/player/PlayerGlobalPassiveManager';
import { initializePassiveIconCache } from '@/game/passives/icons/passiveIconCache';

async function initGlobalPassives() {
  initializePassiveIconCache();
  const json = await (await fetch('/assets/passives/player-passives.json')).text();
  const tree = PassiveTreeDeserializer.fromJSON(json);
  PlayerGlobalPassiveManager.getInstance().setPassiveTree(tree);
}

```

**Unlocking a node**

```
const ok = PlayerGlobalPassiveManager.getInstance().unlockNode('damage-3');
if (!ok) { /* show error toast / insufficient cores / already unlocked */ }

```

**Reading bonuses**

```
import { UnlockedPassiveAggregator } from '@/game/passives/runtime/UnlockedPassiveAggregator';
const P = UnlockedPassiveAggregator.getAggregatedPassives();
applyBonusesToWeapon(P);

```

## 16) Icon Guidelines

- Keep geometry bold and readable at **24×24**.
    
- Use the established color motifs:
    
    - damage/red, armor/blue, thrust/orange, blockDropRate/purple, harvest/green, ability/light-purple.
        
- Register new icons in `initializePassiveIconCache()`.
    
- Always provide a reasonable fallback (`icon-fallback`) and warn on misses.
    

---

## 17) Future Extensions

- **Capstone clusters** (8 hemispheres × 4 nodes): define boolean gates and special behaviors.
    
- **Conditional passives** (e.g., “while shields > 90%”): requires extending `PassiveNodeMetadata` and a runtime evaluator.
    
- **Loadout presets** (batched unlock templates for QA/balance passes).
    
- **Localization** for `name`/`description` strings (key indirection instead of literal).
    

---

**Status**: Core interfaces, deserializer, aggregator, and icon cache are scaffolded.  
**Next up**: UI renderer/controller/tooltip + strict metadata key validation + aggregation caching.