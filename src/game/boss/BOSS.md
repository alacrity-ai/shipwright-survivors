# **BOSS.md – Boss Encounter Architecture (Shipwright Survivors)**

## 🧭 Overview

The Boss subsystem provides a **modular, declarative, and orchestrated framework** for managing boss encounters in *Shipwright Survivors*. Each boss is composed of:

- A static declaration in `BossRegistry`
- A dynamically instantiated `Ship` loaded from a JSON blueprint
- A per-boss **FSM controller**, derived from `BaseBossAIController`
- A dedicated **cutscene controller** for pre-fight presentation
- A high-level **orchestrator** that sequences spawn, intro, combat, and outro phases

This system is designed for:

- **Composability** – Subsystems operate with clear boundaries and no global coupling
- **Scriptability** – Fight flow is driven by declarative orchestration, not imperative code
- **Scalability** – New bosses require no architectural rewrites

---

## 🧩 Core Components

### 📌 `BossManager`

> 📁 `src/game/boss/BossManager.ts`

The **mission-scoped singleton** owning all boss systems. Constructed at mission start, destroyed on exit.

#### Responsibilities:

- Instantiates and retains:
  - `BossFactory`
  - `BossOrchestrator`
  - `BossIntroCutsceneController`
- Delegates per-frame updates
- Clears all subsystems on exit

```
const bossManager = BossManager.initialize(shipFactory);
await bossManager.getOrchestrator().runFullEncounter(...);
```

### 📌 `BossOrchestrator`

> 📁 `src/game/boss/BossOrchestrator.ts`

Orchestrates **the full lifecycle of a boss encounter**. Encapsulates all sequencing logic.

#### Responsibilities:

- Uses `BossFactory` to create ship and AI controller
    
- Runs intro cutscenes and ambient transitions
    
- Starts FSM AI via `controller.transitionTo(initialState)`
    
- Observes boss death or victory state
    
- Can trigger scripted events via emitted hooks
    

#### Sample Usage:

```
await orchestrator.spawnBoss(def, { x: 0, y: 0 });
await orchestrator.runIntroCutscene();
await orchestrator.activateAI();
await orchestrator.awaitDeath();
await orchestrator.runOutroCutscene();
```

### 📌 `BossFactory`

> 📁 `src/game/boss/factories/BossFactory.ts`

Instantiates a boss `Ship` and wires up its AI controller using a polymorphic dispatch.

#### Responsibilities:

- Loads ship JSON via `ShipFactory`
    
- Initializes scalar boss health (`initializeHealth(...)`)
    
- Resolves player ship from `ShipRegistry`
    
- Instantiates the appropriate `BaseBossAIController` subclass based on `BossDefinition.id`

```
const { ship, aiController } = await bossFactory.create({
  definition,
  position: { x, y },
});
```

### 📌 `BossRegistry`

> 📁 `src/game/boss/registry/BossRegistry.ts`

Static registry of all defined bosses, used for orchestration and mission scripting.

#### Boss Definition Example:

```
{
  id: 'flame_lord',
  name: 'The Flame Lord',
  shipJsonPath: 'boss/boss_00.json',
  initialState: 'Idle',
  maxHealth: 5000
}
```

### 📌 `BaseBossAIController`

> 📁 `src/game/boss/ai/bosses/BaseBossAIController.ts`

Abstract superclass for all boss FSM controllers.

Each subclass (e.g. `FlameLordController`) defines:

- Its own state map (`Record<string, BossState>`)
    
- Its initial state
    
- All update/transition behavior is inherited
    

---

### 📌 `BossAIContext`

> 📁 `src/game/boss/ai/BossAIContext.ts`

Per-frame, reusable scratch object passed to all states:

- Contains `ship`, `player`
    
- Precomputes `healthPercent`, `angleToPlayer`, `distanceToPlayer`
    
- Avoids per-frame allocation
    

---

### 📌 FSM States

Each FSM state is:

- Defined in `bosses/<bossId>/fsm/BossState_<Name>.ts`
    
- Implements `BossState` interface
    
- Responsible for:
    
    - Telegraphs
        
    - Visuals
        
    - Timed transitions
        
    - Scripting logic
        

#### Interface:

```
interface BossState {
  name: string;
  enter(controller: BaseBossAIController): void;
  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void;
  exit(controller: BaseBossAIController): void;
}
```

### File Structure:

```
src/game/boss/
├── ai/
│   ├── BossAIContext.ts
│   ├── bosses/
│   │   ├── BaseBossAIController.ts
│   │   └── flamelord/
│   │       ├── FLAMELORD.md
│   │       ├── FlameLordController.ts
│   │       └── fsm/
│   │           ├── BossState_Idle.ts
│   │           ├── BossState_LeftFlankFlames.ts
│   │           ├── ...
├── factories/
│   └── BossFactory.ts
├── cutscenes/
│   └── BossIntroCutsceneController.ts
├── interfaces/
│   ├── BossDefinition.ts
│   ├── BossSpawnContext.ts
│   └── BossPhaseMetadata.ts
├── registry/
│   └── BossRegistry.ts
├── BossManager.ts
├── BossOrchestrator.ts
└── BOSS.md

```

## 🧠 Summary

The Boss subsystem is:

- **Declarative** – Bosses are data-driven, not hardcoded
    
- **Modular** – Per-boss folders contain all logic and FSM states
    
- **Orchestrated** – Lifecycle is controlled from a central `BossOrchestrator`
    
- **Scalable** – New bosses add no core complexity
    
- **Scriptable** – FSMs enable nuanced, deterministic behaviors
    

Use `BossOrchestrator` to manage the encounter. Use `FlameLordController` (or similar) to define FSM behaviors. Use `BossFactory` to instantiate them cleanly and correctly.

