## Player Ability Subsystem

_Architectural companion to_ `PlayerAbilityManager.ts` **&** `AbilityRegistry.ts`

---

### 1 Purpose & Scope

The ability subsystem encapsulates _capability gating_ for the player profile.  
It provides:

|Layer|Responsibility|
|---|---|
|**AbilityRegistry** (`registry/AbilityRegistry.ts`)|Immutable catalogue of every discrete ability available in the game.|
|**PlayerAbilityManager** (`PlayerAbilityManager.ts`)|Runtime state-keeper that records which abilities the active profile has unlocked, plus serialization for save-data persistence.|
### 2 Static Domain Model – AbilityRegistry

```
export interface AbilityDef {
  name: string;          // UI label
  description: string;   // Tooltip copy
  iconKey: string;       // Sprite-cache lookup
}

export const AbilityRegistry = {
  'pulse':            { /* … */ },
  'attach-block':     { /* … */ },
  'attach-all-blocks':{ /* … */ },
  'roll-blocks':      { /* … */ },
  'combine-blocks':   { /* … */ },
  'jump-cast':        { /* … */ },
} as const;

export type AbilityKey = keyof typeof AbilityRegistry;
export function getAbility<K extends AbilityKey>(key: K) {
  return AbilityRegistry[key];
}

```

_Design notes_

- The **registry key itself** (`'pulse'`, `'jump-cast'`, …) is the canonical ID—no redundant `id` field is stored.
    
- `AbilityKey` is a compiler-verified literal-union, enabling exhaustive switch statements and autocomplete accuracy.

### 3 Runtime State – PlayerAbilityManager

```
export class PlayerAbilityManager {
  private unlocked = new Set<AbilityKey>();

  public unlock(k: AbilityKey): void      { this.unlocked.add(k); }
  public revoke(k: AbilityKey): void      { this.unlocked.delete(k); }
  public has(k: AbilityKey): boolean      { return this.unlocked.has(k); }
  public list() { return [...this.unlocked].map(getAbility); }

  // Persistence
  public toJSON(): string                 { return JSON.stringify([...this.unlocked]); }
  public fromJSON(json: string): void {
    const arr = JSON.parse(json);
    if (Array.isArray(arr))
      this.unlocked = new Set(arr.filter((k): k is AbilityKey => k in AbilityRegistry));
  }
}

export const abilities = PlayerAbilityManager.getInstance();

```

_Key invariants_

- **Singleton** – mirrors the pattern used by `PlayerFlagManager`, `PlayerSettingsManager`, etc.
    
- **O(1) lookups** – backed by an ES `Set`.
    
- **Deterministic serialization** – round-trips to a canonical JSON array of IDs (e.g., `["pulse","jump-cast"]`)

### 4 Consumption Patterns

#### 4.1 Unlocking an ability
```
import { abilities } from '@/game/player/PlayerAbilityManager';

if (playerMetUnlockCriteria) {
  abilities.unlock('roll-blocks');
}

```

### 4.2 Feature gating
```
if (abilities.has('pulse')) {
  afterburnerController.triggerPulse();
} else {
  ui.flashLockedIcon('pulse');
}

```

### 4.3 Rendering unlocked abilities in a menu
```
for (const ability of abilities.list()) {
  drawAbilityRow({
    icon : AbilityIconSpriteCache.get(ability.iconKey),
    name : ability.name,
    desc : ability.description,
  });
}

```

### 4.4 Persisting with the player profile
```
// save
localStorage.setItem('player-abilities', abilities.toJSON());

// load
abilities.fromJSON(localStorage.getItem('player-abilities') ?? '[]');

```

### 5 Best-Practice Guidelines

1. **Source of truth** – add new abilities **only** in `AbilityRegistry.ts`; the manager adjusts automatically.
    
2. **No runtime mutation of registry** – it is a const-asserted record; treat it as read-only metadata.
    
3. **Granularity** – keep abilities atomic. If two UI buttons should unlock together, model them as one ability, not two interdependent ones.
    
4. **Save-game compatibility** – never delete an `AbilityKey` that has shipped; instead, mark obsolete abilities as deprecated in code and treat them as no-ops at runtime.
    
5. **Unit tests** – validate that every `AbilityKey` maps to a sprite in `AbilityIconSpriteCache` to pre-empt missing-asset regressions.
    

---

### 6 Extending the System

- Add a new ability by inserting another entry in `AbilityRegistry`; the literal-union `AbilityKey` updates automatically.
    
- Optional: introduce an _AbilityUnlockCondition_ service if unlock logic becomes sufficiently complex (e.g., dependency graphs, meta-currency costs).
