# CONSUMERS.md

> **How to read global passive bonuses efficiently (hot paths, no GC churn).**  
> This document explains the consumer-side contract for the Global Passives system, including cache behavior, best-practice access patterns, and common pitfalls.

---

## 1) TL;DR

- Call **`UnlockedPassiveAggregator.getAggregatedPassives()`** in your hot path.  
    It returns a **stable object reference** that is **mutated in place** when passives change.
    
- You **do not** need to “refresh” anything between missions or after unlocks.  
    The aggregator uses a **versioned** cache; any unlock/clear/load bumps the version and **auto-invalidates** the cache on the next read.
    
- Treat the returned object as **read-only**. Do not mutate it.
    
- Prefer **nullish coalescing** (`?? 0`) to handle absent keys without allocations.
    
- Avoid holding long-lived references to **array-typed** fields; read them when needed (or snapshot explicitly in non-hot paths).
    

---

## 2) The Contract

### Stable reference, mutable contents

`UnlockedPassiveAggregator` maintains an internal cache object and **never replaces its reference**. When passives change, it **clears/repopulates** that same object. This lets your systems keep a local pointer without churn:

```
// Safe to capture once (reference is stable)
const PASSIVES = UnlockedPassiveAggregator.getAggregatedPassives();

// Each frame:
const dmgMul = 1 + (PASSIVES.damage ?? 0);
weapon.damage = baseDamage * dmgMul;

```

> If passives change (e.g., unlocks, loads, refunds), the next call to `getAggregatedPassives()` detects a **version bump** and repopulates the same object in place. Your `PASSIVES` reference remains valid.

### Automatic invalidation

The cache invalidates automatically (version increments) when:

- A node is **unlocked**: `PlayerGlobalPassiveManager.unlockNode(...)`
    
- The manager is **cleared** (e.g., switching save files): `clear()`
    
- You **refund all**: `refundAll()`
    
- A new **tree is set**: `setPassiveTree(...)`
    
- You **load** a saved state: `fromJSON(...)`
    

No extra work for consumers.

## 3) Hot-Path Usage Patterns (GC-neutral)

### Pattern A — Direct read per tick (simplest)

Use nullish coalescing for scalars; compute multipliers only when applying:
```
import { UnlockedPassiveAggregator } from '@/game/passives/runtime/UnlockedPassiveAggregator';

function updateWeapon(weapon: Weapon) {
  const P = UnlockedPassiveAggregator.getAggregatedPassives();

  // Multipliers: 1 + percentage
  const damageMul   = 1 + (P.damage   ?? 0);
  const fireRateMul = 1 + (P.fireRate ?? 0);

  weapon.damage     = weapon.baseDamage * damageMul;
  weapon.cooldown  /= fireRateMul; // faster fire rate ⇒ shorter cooldown
}

```

**Why it’s GC-neutral:**

- No array allocations.
    
- No object spreads.
    
- No temporary maps/sets.
    
- `P` is a shared, stable object.
    

---

### Pattern B — Cache derived scalars on version change

If you have expensive derivations or you want to avoid recomputation per tick, keep a tiny local cache keyed by the **manager version**:
```
import { PlayerGlobalPassiveManager } from '@/game/player/PlayerGlobalPassiveManager';
import { UnlockedPassiveAggregator } from '@/game/passives/runtime/UnlockedPassiveAggregator';

class WeaponRuntimePassivesView {
  private version = -1;
  // Derived scalars
  public damageMul = 1.0;
  public fireRateMul = 1.0;

  /** Call this at start of frame or before using. */
  public sync(): void {
    const v = PlayerGlobalPassiveManager.getInstance().getVersion();
    if (v === this.version) return;

    const P = UnlockedPassiveAggregator.getAggregatedPassives();
    this.damageMul   = 1 + (P.damage   ?? 0);
    this.fireRateMul = 1 + (P.fireRate ?? 0);

    this.version = v;
  }
}

// Usage in your system:
const passivesView = new WeaponRuntimePassivesView();

function updateWeapon(weapon: Weapon) {
  passivesView.sync(); // O(1) when unchanged
  weapon.damage    = weapon.baseDamage * passivesView.damageMul;
  weapon.cooldown /= passivesView.fireRateMul;
}

```

**Pros:** Only recomputes when something changed.  
**Cons:** Slightly more code.

---

### Pattern C — Boolean gates / Capstones

Booleans are OR-merged. Read as regular flags:

```
const P = UnlockedPassiveAggregator.getAggregatedPassives();
if (P.slayer) {
  // Enable boss-slayer behavior
}

```

### Pattern D — Array-typed fields

Arrays are deduplicated. The aggregator **may reuse** an existing array and push into it during recompute. Read them on demand; treat as read-only:

```
const P = UnlockedPassiveAggregator.getAggregatedPassives();
const tags = P.someStringArrayKey;
if (Array.isArray(tags)) {
  // Iterate directly; do not store long-lived references unless you snapshot outside hot paths
  for (let i = 0; i < tags.length; i++) {
    consume(tags[i]);
  }
}

```

> If a system must hold a snapshot for a long time, copy **outside** the hot path (e.g., on version change).

---

## 4) Do / Don’t

**Do**

- ✅ Use `getAggregatedPassives()` freely in hot code; it’s O(1) when unchanged.
    
- ✅ Use `?? 0` for numbers and `?? false` for booleans to avoid branches.
    
- ✅ Compute multipliers locally (`1 + pct`) and keep them as scalars if reused heavily.
    
- ✅ Treat arrays and the aggregate object as **immutable** from the consumer perspective.
    

**Don’t**

- ❌ Don’t mutate the returned aggregate object or its arrays.
    
- ❌ Don’t hold long-lived references to arrays if their membership matters over time—re-read on demand or snapshot on version change.
    
- ❌ Don’t do `P.damage || 0` (breaks valid `0` values)—use `P.damage ?? 0`.
    
- ❌ Don’t allocate temporary objects in inner loops (e.g., object spreads, `map/filter/reduce`) in tight hot paths.
    

---

## 5) Mid-Run vs. Between-Missions Behavior

### Unlocking **during** a mission

- If your UX allows spending Cores mid-mission, calling `unlockNode(id)` bumps the manager’s version.
    
- The **next** `getAggregatedPassives()` call will see the version change and **auto-recompute**.
    
- Consumers using Pattern A will see new values immediately on the next tick.  
    Consumers using Pattern B will **sync** when they notice the version change.
    

### Unlocking **between** missions (load/save, clear, tree swap)

- `clear()`, `fromJSON()`, and `setPassiveTree()` all bump the version.
    
- No special handling required by consumers; they’ll either read the new values directly or refresh on next `sync()`.
    

**Answer to “Do we need to do anything?”**  
**No.** The cache invalidates automatically. Consumers either read lazily each tick or detect version changes and update their derived scalars.

---

## 6) Example Snippets by Subsystem

### Movement

```
const P = UnlockedPassiveAggregator.getAggregatedPassives();
ship.maxThrust  = baseThrust  * (1 + (P.thrust    ?? 0));
ship.turnPower  = baseTurnPow * (1 + (P.turnPower ?? 0));

```

### Shields / Mitigation

```
const P = UnlockedPassiveAggregator.getAggregatedPassives();
const flatArmor     = P.armor      ?? 0;
const pctMitigation = P.mitigation ?? 0;

incomingDamage = Math.max(0, incomingDamage - flatArmor);
incomingDamage *= (1 - pctMitigation);

```

### Loot / Economy

```
const P = UnlockedPassiveAggregator.getAggregatedPassives();
loot.blockDropChance *= (1 + (P.blockDropRate ?? 0));
pickup.harvestRange  += (P.harvestRange ?? 0);
currency.pickupBonus *= (1 + (P.entropiumPickupBonus ?? 0));

```

### Abilities

```
const P = UnlockedPassiveAggregator.getAggregatedPassives();
ability.cooldownSec *= (1 / (1 + (P.abilityCooldown ?? 0)));
ability.power       *= (1 + (P.abilityPower ?? 0));

```


---

## 7) Troubleshooting & Profiling

- If you observe allocations in hot paths, search for:
    
    - Array creation (`[]`, `.map/.filter/.reduce`) each frame.
        
    - String concatenations or template strings in loops.
        
    - Object spreads `{ ...P }` in hot code.
        
- Validate version usage:
    
    - If using Pattern B, make sure you’re reading manager’s `getVersion()` and only recomputing on change.
        
- Use a perf HUD to sample **frame time spikes** when passives change; a one-frame recompute is expected and bounded by number of unlocked nodes.
    

---

## 8) Optional Utilities (if you want even less boilerplate)

A tiny helper to centralize version tracking per system:

```
import { PlayerGlobalPassiveManager } from '@/game/player/PlayerGlobalPassiveManager';
import { UnlockedPassiveAggregator } from '@/game/passives/runtime/UnlockedPassiveAggregator';
import type { PassiveNodeMetadata } from '@/game/passives/interfaces/PassiveNodeMetadata';

export class PassiveSnapshot {
  private version = -1;
  private _P: PassiveNodeMetadata = UnlockedPassiveAggregator.getAggregatedPassives();

  public get P(): PassiveNodeMetadata { return this._P; }

  /** Call before using .P in a frame */
  public sync(): void {
    const v = PlayerGlobalPassiveManager.getInstance().getVersion();
    if (v !== this.version) {
      this._P = UnlockedPassiveAggregator.getAggregatedPassives();
      this.version = v;
    }
  }
}

```

Usage:

```
const snap = new PassiveSnapshot();

function updateSystem() {
  snap.sync();
  const P = snap.P;
  // read P.* as needed
}

```

## 9) Summary

- **Just read `getAggregatedPassives()`**. It’s cheap and auto-coherent.
    
- Use **`??`**, not `||`.
    
- Avoid modifying the aggregate; treat arrays as read-only.
    
- If you need derived scalars, **cache them on version change**.
    
- Nothing special is required for mid-mission or between-missions unlocks; the **versioned cache** handles it.

