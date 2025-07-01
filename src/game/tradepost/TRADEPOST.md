# 🛰 TradePost System

The **TradePost system** enables players to exchange in-game resources (blocks in their queue) for more advanced components or unlockable ships. It is a modular, registry-driven architecture designed to support drop-in definitions, runtime stock tracking, and purchase interactions.

---

## 🗂 Directory Overview

```
src/game/tradepost/
├── TradePostItemsList.ts # Component responsible for rendering grid of trade entries
├── TradePostMenu.ts # Main controller and rendering window for the trade UI
├── helpers
│   └── createTradePostInstance.ts # Factory for stateful TradePostInstance objects
├── interfaces
│   ├── PurchaseableItem.ts # Definition for tradable items (block or ships)
│   ├── TradePost.ts # Static tradepost definition with item quantities
│   └── TradePostInstance.ts # Runtime instance interface with quantity tracking
└── registry
    ├── TradePostRegistry.ts # Central registry for all defined tradeposts
    └── definitions # Definitions grouped by mission
        ├── mission1TradePost0.ts
        ├── mission2TradePost0.ts
        ├── mission2TradePost1.ts
        └── mission3TradePost0.ts
```

---

## 🧾 Interfaces

### ### `PurchaseableItem`
```ts
export type PurchaseableItem =
  | { type: 'block'; id: string; wants: string[]; label?: string }
  | { type: 'ship'; id: string; wants: string[]; label?: string };
```

- Describes a tradable item.
- The wants field is a multiset of block type IDs the player must provide.

---

### `TradePostItemEntry`

```ts
export interface TradePostItemEntry {
  item: PurchaseableItem;
  quantity: number; // Quantity in stock
}
```

- Represents a single entry in a tradepost, including the item and its available quantity.

---

### `TradePost`

```ts
export interface TradePost {
  id: string;
  items: TradePostItemEntry[];
  metaData?: Record<string, unknown>;
}
```

- Defines a static, immutable tradepost definition.
- The `items` array contains all entries available for purchase.
- `metaData` is an optional extensibility hook for future features like themed tradeposts.

---

### `TradePostInstance`

```ts
export interface TradePostInstance {
  id: string;

  getRemainingQuantity(index: number): number;
  canAfford(index: number): boolean;
  executeTransaction(index: number): boolean;
  getAvailableItems(): { entry: TradePostItemEntry; index: number }[];
  getAllEntries(): TradePostItemEntry[];
  getOriginalDefinition(): TradePost;
}
```

- Stateful, runtime-bound object
- Tracks per-item quantity depletion, affordability, and fulfills transactions via `PlayerResources` and `PlayerShipCollection`

---

## 🧱 TradePost Definitions

Located under registry/definitions/, each definition exports a TradePost object, for example:

```
export const mission1TradePost0: TradePost = {
  id: 'mission1-tradepost-0',
  items: [
    {
      item: {
        type: 'block',
        id: 'turret-mk2',
        wants: ['turret-mk1', 'turret-mk1', 'turret-mk1']
      },
      quantity: 2
    }
  ]
};
```

Each item:

- Defines what the merchant offers
- Specifies what the merchant wants (required blocks)
- Tracks available quantity

---

## 🧭 TradePostRegistry
Located in registry/TradePostRegistry.ts, the registry handles:

Validation (duplicate detection)

Retrieval (getById, getAll)

Instance creation:

```
TradePostRegistry.getInstanceById('mission1-tradepost-0');
```

## 🔄 Trade Logic

Implemented in `helpers/createTradePostInstance.ts`:

- ✅ `canAfford(index)`:
    
    - Compares block inventory (as multiset) to desired components.
        
- 🔁 `executeTransaction(index)`:
    
    - If affordable:
        
        - Removes blocks from player inventory.
            
        - Adds a new block to the queue _or_ unlocks a ship blueprint.
            
        - Decrements quantity.
            
- 📦 `getAvailableItems()`:
    
    - Filters currently affordable + in-stock entries.
        

This file is **not** responsible for UI—it purely performs logic and state transitions.


## 🖼 TradePostMenu Behavior

The menu is opened when a player interacts with a planet offering trade. It features:

- CRT-style window with stylized header
    
- Up to **3 rows of offerings**, with:
    
    - [ Purchase Button ] [ Item Icon ] | [ Required Block Icons + xN ]
        
- Items the player **cannot afford** will gray out:
    
    - Purchase button is disabled
        
    - Missing required blocks shown at reduced opacity
        
- Tooltips:
    
    - Hovering item or block displays a label
        
- "End Transmission" button to close
    

---

## 🧪 Example Interaction

- TradePost offers:
    
    - `turret-mk2`, wants 3x `turret-mk1`
        
- Player has:
    
    - 3x `turret-mk1` in their `PlayerResources` queue
        
- Player clicks "Purchase":
    
    - `turret-mk1` blocks are removed from queue
        
    - `turret-mk2` is added
        
    - `quantity--` is applied to stock


    