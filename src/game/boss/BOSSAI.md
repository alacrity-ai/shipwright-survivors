# **BOSSAI.md – Boss AI Architecture (Shipwright Survivors)**

## 🧠 Overview

The Boss AI system in *Shipwright Survivors* is a **modular FSM framework** purpose-built for authoring **explicit, state-driven combat logic**. Each boss maintains its own subclass of `BaseBossAIController`, defining the legal transitions, states, and triggers that compose its behavioral graph.

Unlike enemy mobs, which rely on heuristic and reactive AI, bosses are governed by **deterministic combat scripts**. These scripts are composed of reusable states, orchestrated transitions, and tightly scoped context variables.

---

## 🎭 Core Design Philosophy

- **Finite, Scripted States**  
  Boss logic is declaratively encoded as FSM states—each state is a discrete behavioral unit (e.g. `LeftFlankFlames`, `Idle`, `MinefieldDeploy`).

- **Strict Isolation**  
  States are pure logic modules. They do not mutate the FSM controller directly; instead, transitions are issued via `controller.transitionTo(...)`.

- **Contextual Awareness**  
  The shared `BossAIContext` contains all necessary spatial and scalar telemetry—`healthPercent`, `angleToPlayer`, `distanceToPlayer`, etc.

- **Composable Transition Logic**  
  States can self-expire on timers, respond to boss health thresholds, or emit signals that the orchestrator listens for.

---

## 🧩 Key Components

### 📌 `BaseBossAIController`

> 📁 `src/game/boss/ai/bosses/BaseBossAIController.ts`

The **abstract superclass** for all boss FSM controllers.

#### Responsibilities:

- Owns current FSM state
- Updates the `BossAIContext` every frame
- Delegates `update(...)` to current state
- Dispatches transitions by string key
- Provides accessors for `boss`, `player`, `context`

#### Usage:

```
controller.transitionTo('LeftFlankFlames');
```

Each subclass (e.g. `FlameLordController`) is responsible for:

- Populating the `Record<string, BossState>` map
    
- Selecting the initial state via `this.currentState = stateMap[...]`
    

---

### 📌 `BossState`

> 📁 `src/game/boss/ai/interfaces/BossState.ts`

Contract that defines the shape of a finite state.

```
export interface BossState {
  name: string;

  enter(controller: BaseBossAIController): void;
  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void;
  exit(controller: BaseBossAIController): void;
}

```

#### Conventions:

- Use `enter(...)` to initialize state timers, telegraphs, or emitters
    
- Use `update(...)` for timekeeping, phase control, and transitions
    
- Use `exit(...)` for cleanup and effect termination
    

---

### 📌 `BossAIContext`

> 📁 `src/game/boss/ai/BossAIContext.ts`

The shared runtime context passed to every state's `update()`.

#### Precomputed Fields:

| Field              | Description                            |
| ------------------ | -------------------------------------- |
| `ship`             | The boss ship instance                 |
| `player`           | The player ship instance               |
| `healthPercent`    | Normalized scalar between 0 and 1      |
| `angleToPlayer`    | Angle in radians (relative to +X axis) |
| `distanceToPlayer` | Euclidean distance (float)             |


States **must not mutate this object**—it is managed by the controller.

---

## 🧱 File Layout Per Boss

```
src/game/boss/ai/bosses/flamelord/
├── FlameLordController.ts           ← FSM controller subclass
├── FLAMELORD.md                     ← Design doc / state graph
└── fsm/
    ├── BossState_Idle.ts
    ├── BossState_LeftFlankFlames.ts
    ├── BossState_Combo_LeftRight.ts
    └── ...
```

## 🔄 Per-Frame Update Flow

```
// Called every simulation tick
controller.update(dt);
```

Which resolves to:

1. `context.update(boss, player)`  
    → updates spatial telemetry
    
2. `currentState.update(dt, this, context)`  
    → FSM state logic executes
    
3. (Optional) `controller.transitionTo(...)`  
    → if a state triggers transition


## 📜 Example FSM State

```
export class BossState_LeftFlankFlames implements BossState {
  name = 'LeftFlankFlames';
  private timer = 0;

  enter(controller: BaseBossAIController): void {
    this.timer = 0;
    boostBlockLights(getBlocksByGroup(controller.getBoss(), 1)); // Visual telegraph
  }

  update(dt: number, controller: BaseBossAIController, context: BossAIContext): void {
    this.timer += dt;

    if (this.timer > 2) {
      activateLeftFlamethrowers(controller.getBoss());
    }

    if (this.timer > 6) {
      controller.transitionTo('Idle');
    }
  }

  exit(controller: BaseBossAIController): void {
    deactivateFlamethrowers(controller.getBoss());
  }
}
```

## 🪛 Utilities and Patterns

- `getBlocksByGroup(ship, groupId)`  
    → Returns all block indices in group (used for telegraphing)
    
- `boostBlockLights(blocks, { radiusMult, intensityMult })`  
    → Scales visual light effect on telegraph
    
- `controller.transitionTo(stateName)`  
    → Issues clean exit/enter cycle between states
    

---

## 🚦 Common Triggers for Transition

- Timed expiry (`if timer > x`)
    
- Health thresholds (`context.healthPercent < 0.5`)
    
- Boss proximity (`context.distanceToPlayer < r`)
    
- External event (`GlobalEventBus.on('something')`)
    
- Scripted orchestrator transition
    

---

## 🧠 Design Principles

- **FSM purity** – No side effects outside of ship control or animation triggers
    
- **Explicitness** – All transitions are declared, not inferred
    
- **Separation of concerns** – No rendering logic inside FSM states; they issue control signals only
    

---

## 🔮 Future Considerations

- Phase-aware FSM (multi-stage boss fights)
    
- Reusable "macro" FSM modules (e.g. `FlameSweep`, `SpawnMinions`)
    
- Reactive interrupt states (e.g. stun, disable)
    
- Co-op AI coordination between multiple bosses
    

---

## ✅ Summary

The Boss AI system enables:

- Rich, expressive combat scripting via FSMs
    
- Encapsulation of each boss’s behavioral identity
    
- Debuggable, isolated state transitions
    
- Declarative orchestration from above (via `BossOrchestrator`)
    

To implement a new boss AI:

1. Create `MyBossController.ts` extending `BaseBossAIController`
    
2. Create `fsm/` folder for all states
    
3. Register states and initial state
    
4. Orchestrate via `BossOrchestrator`


```
await orchestrator.spawnBoss(def, pos);
await orchestrator.activateAI();
```

Use `context`, not raw ship references, for all decision-making.
