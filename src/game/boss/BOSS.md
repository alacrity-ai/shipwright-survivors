# **BOSS.md – Boss Encounter Architecture (Shipwright Survivors)**

## 🧭 Overview

The Boss subsystem provides a **modular, declarative, and orchestrated framework** for managing boss encounters in *Shipwright Survivors*. Each boss is defined by:

- A **static data declaration** in `BossRegistry`
- A dynamically instantiated **ship** loaded from JSON assets
- A **cutscene controller** for pre-fight presentation
- A combat-specific **finite state machine** (FSM) AI controller
- A declarative **orchestrator** for sequencing lifecycle phases

This design is centered around two pillars:

- **Composability** – Boss logic is constructed from discrete subsystems with clean interfaces.
- **Orchestration** – High-level sequencing (spawn, cutscene, AI, death) is driven declaratively.

---

## 🧩 Core Components

### 📌 `BossManager`

> 📁 `src/game/boss/BossManager.ts`

The **mission-scoped singleton** that owns all core boss systems. Created at mission start and destroyed on exit.

#### Responsibilities:

- Instantiates and holds:
  - `BossFactory`
  - `BossIntroCutsceneController` (stubbed)
  - `BossAIController` (stubbed)
  - `BossOrchestrator` (injects subsystems)
- Exposes safe public getters
- Coordinates per-tick `update(dt)` calls if needed
- Clears or destroys all systems cleanly

```
const bossManager = BossManager.initialize(shipFactory);
bossManager.getOrchestrator().runFullEncounter(...);
```

### 📌 `BossOrchestrator`

> 📁 `src/game/boss/BossOrchestrator.ts`

Declarative coordinator for **boss lifecycle sequencing**. Designed to abstract time-sensitive flow and reduce boilerplate in consumer systems (e.g. mission logic).

#### Example Flow:

```
await orchestrator.spawnBoss(def, { x, y });
await orchestrator.runIntroCutscene();
await orchestrator.activateAI();
await orchestrator.awaitDeath();
await orchestrator.runOutroCutscene();
```

#### Responsibilities:

- Calls into:
    
    - `BossFactory` to create the boss ship
        
    - `BossIntroCutsceneController` to play intro
        
    - `BossAIController` to activate FSM
        
- Emits or reacts to events (e.g. `boss:defeated`)
    
- Designed to support **replayable**, **scripted**, and **multi-phase** encounters
    

---

### 📌 `BossFactory`

> 📁 `src/game/boss/factories/BossFactory.ts`

Encapsulates the logic to **construct a boss ship** via the shared `ShipFactory`.

#### Responsibilities:

- Loads boss ship JSON from `BossDefinition`
    
- Calls `ShipFactory.createShip(...)` with appropriate flags
    
- Applies initial transform via `setTransform(...)`
    
- Will eventually attach `BossAIController`
    
- Returns `{ ship, aiController }` structure
    

> ⛳ Fully leverages internal construction animations, light setups, movement systems, and collision wiring.

---

### 📌 `BossRegistry`

> 📁 `src/game/boss/registry/BossRegistry.ts`

Declarative repository of all registered bosses.

Each boss is defined via a `BossDefinition`:

```
{
  id: 'flame_lord',
  name: 'The Flame Lord',
  shipJsonPath: 'boss/boss_00.json',
  initialState: 'Idle'
}
```

Provides:

- `get(id: string): BossDefinition`
    
- `getAll(): BossDefinition[]`
    

This enables content authors to introduce new bosses without modifying system code.

### 📌 `BossAIController` (WIP)

> 📁 `src/game/boss/ai/BossAIController.ts`

Controls **combat behavior** of the boss via a scripted FSM.

#### Responsibilities:

- Holds reference to the `Ship` instance
    
- Manages the **current FSM state** (`BossState`)
    
- Delegates per-frame `update(dt)`
    
- Transitions between states based on:
    
    - Timers
        
    - Health thresholds
        
    - Internal or external triggers
        

> Uses `IntentSystem` to control ship rotation and optionally movement/attacks.

---

### 📌 FSM State Scripts

> 📁 `src/game/boss/ai/fsm/`

Each boss state is defined in its own file, implementing:

```
interface BossState {
  name: string;
  enter(controller: BossAIController): void;
  update(dt: number, controller: BossAIController): void;
  exit(controller: BossAIController): void;
}
```


Examples:

- `BossState_Idle.ts` – Passive rotation or wait logic
    
- `BossState_FlameSweep.ts` – 120° cone attacks
    
- `BossState_Minefield.ts` – AoE hazard deployment
    

States coordinate lighting, telegraphs, and transition triggers.

---

### 📌 `BossIntroCutsceneController` (WIP)

> 📁 `src/game/boss/cutscenes/BossIntroCutsceneController.ts`

Handles the **presentation layer** for boss entrances.

#### Goals:

- Animate camera focus, arena energy pulsing, ambient shifts
    
- Deliver scripted dialogue bursts
    
- Signal combat readiness to player
    
- End with `await cutsceneController.play()` resolving



| File                   | Purpose                                     |
| ---------------------- | ------------------------------------------- |
| `BossDefinition.ts`    | Declarative registry entry                  |
| `BossSpawnContext.ts`  | Used by factory for instantiation           |
| `BossState.ts`         | FSM contract                                |
| `BossPhaseMetadata.ts` | Reserved for affix modifiers or tuning info |


### 🧪 Orchestration Usage (High-Level)

```
const manager = BossManager.initialize(shipFactory);
const orchestrator = manager.getOrchestrator();

const def = BossRegistry.get('flame_lord');
await orchestrator.spawnBoss(def, { x: 0, y: 0 });
await orchestrator.runIntroCutscene();
await orchestrator.activateAI();
await orchestrator.awaitDeath();
await orchestrator.runOutroCutscene();
```

## 🔄 Future Extension Points

- **Affix + Phase Modifiers** (`BossPhaseMetadata.ts`)
    
- **Procedural Boss Generator**
    
- **Death cutscene controller**
    
- **Event hooks for mission scripting** (`boss:spawned`, `boss:defeated`)
    
- **Multi-stage AI controllers** (e.g., chained FSMs or substates)
    
- **Dynamic arena styling based on boss archetype**

### 🧱 Current File Structure

```
src/game/boss/
├── BOSS.md
├── BossManager.ts
├── BossOrchestrator.ts
├── OVERVIEW.md
├── ai/
│   ├── BossAIController.ts
│   └── fsm/
│       ├── BossState_FlameSweep.ts
│       ├── BossState_Idle.ts
│       └── BossState_Minefield.ts
├── cutscenes/
│   └── BossIntroCutsceneController.ts
├── factories/
│   └── BossFactory.ts
├── interfaces/
│   ├── BossDefinition.ts
│   ├── BossPhaseMetadata.ts
│   ├── BossSpawnContext.ts
│   └── BossState.ts
└── registry/
    └── BossRegistry.ts

```


## ✅ Summary

The Boss subsystem is:

- **Extensible** – Easily define new bosses via data and scripts
    
- **Modular** – All responsibilities isolated and testable
    
- **Declarative** – Orchestration reads as a cinematic script
    
- **Future-proof** – FSM, affixes, and cutscenes can scale with complexity
    

Use `BossOrchestrator` for high-level control. Use `BossManager` for access to internals. Avoid direct calls to `BossFactory` outside of orchestration paths.
