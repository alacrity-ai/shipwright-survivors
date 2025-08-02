# **BOSSMECHANICS.md – Boss Mechanics System**

## 🧠 Overview

The Boss Mechanics subsystem introduces a **parallel runtime layer** beneath the FSM-based AI architecture. While FSM states dictate the boss's **intent** and **timing**, mechanics encapsulate **autonomous, time-bound behaviors**—e.g., flamethrower arcs, radial bursts, mine deployments.

This separation of concerns facilitates:

- **Composable logic** – Mechanics are isolated units of execution
    
- **Concurrent execution** – Multiple mechanics may run simultaneously
    
- **Lifecycle control** – Mechanics start, tick, and clean themselves up independently
    

---

## 🧩 Key Components

### 📌 `BaseBossMechanic`

> 📁 `src/game/boss/ai/mechanics/BaseBossMechanic.ts`

The fundamental contract for any time-bound boss behavior. A mechanic is an autonomous unit with its own setup, update, completion, and teardown logic.

```
export interface BaseBossMechanic {
  start(): void;
  update(dt: number): void;
  isFinished(): boolean;
  cleanup(): void;
}

```

Each mechanic is:

- Activated with `start()`
    
- Advanced each frame with `update(dt)`
    
- Checked for completion with `isFinished()`
    
- Cleaned up when expired with `cleanup()`
    

---

### 📌 `BossMechanicManager`

> 📁 `src/game/boss/ai/mechanics/BossMechanicManager.ts`

A per-boss runtime controller that owns and updates all currently active mechanics.

#### Responsibilities:

- Manages the lifecycle of all mechanics
    
- Advances them per frame
    
- Calls `cleanup()` on finished mechanics
    
- Exposes `hasActiveMechanics()` for gating FSM transitions
    

#### Example:

```
controller.getMechanics().add(
  new DirectionalFlameThrowerMechanic(ship, 180, 300, 5.0)
);

```

### 📌 `BaseBossAIController` Integration

> 📁 `src/game/boss/ai/bosses/BaseBossAIController.ts`

Each boss controller instantiates its own `BossMechanicManager`:

```
protected readonly mechanics = new BossMechanicManager();

```

And updates it every frame before invoking the FSM state:

```
update(dt: number): void {
  context.update(...);
  mechanics.update(dt);
  currentState.update(dt, this, context);
}

```

FSM states invoke mechanics by calling:

```
controller.getMechanics().add(mechanicInstance);
```

## 🔥 Example Mechanic: `DirectionalFlameThrower`

> 📁 `mechs/DirectionalFlameThrowerMechanic.ts`

Fires a directional flame cone from the boss for a fixed duration. Accepts arc bounds in **degrees** and converts to radians internally.

```
new DirectionalFlameThrowerMechanic(
  ship,       // Source ship
  180, 300,   // Arc start → end in degrees
  5.0         // Duration in seconds
)

```

Expected to control:

- Visuals (flame particle emitters)
    
- Collision detection or AoE damage
    
- Audio or vibration cues
    

---

## 🧱 File Layout

```
src/game/boss/ai/mechanics/
├── BaseBossMechanic.ts             ← Contract for mechanics
├── BossMechanicManager.ts         ← Lifecycle controller
└── mechs/                         ← Individual mechanic types
    ├── DirectionalFlameThrowerMechanic.ts
    ├── MinefieldMechanic.ts
    └── RadialFlameExplosion.ts

```

## 🧭 Design Principles

- ✅ **Encapsulation**  
    Mechanics are self-contained; FSMs only schedule them.
    
- ✅ **Concurrency**  
    Multiple mechanics may be active simultaneously.
    
- ✅ **Purity**  
    FSM states do not manually update or clean mechanics—they delegate.
    
- ✅ **Declarative usage**  
    FSMs schedule effects with clear intent:

```
controller.getMechanics().add(new RadialFlameExplosion(...));

```

- ✅ **Deterministic Cleanup**  
    Mechanics always receive a single `cleanup()` call on expiry or forced clear.
    

---

## 🔮 Future Directions

- ✅ Angle-based cone hit detection
    
- ✅ Event-driven mechanic coordination
    
- 🛠 Dynamic interrupt/cancellation mid-execution
    
- 🛠 Timed burst patterns (e.g. sequential flame waves)
    
- 🛠 Global mechanic bus for boss-wide coordination
    

---

## ✅ Summary

The boss mechanics system provides a **clean, concurrent, and scalable** runtime layer for executing effectful behaviors independent of the FSM graph. FSM states _describe intent_, and mechanics _realize it_ through reusable, modular units of effect.

Use it to cleanly compose, coordinate, and debug increasingly complex boss patterns with confidence.
