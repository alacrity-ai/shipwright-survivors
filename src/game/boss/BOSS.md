# **BOSS.md – Boss Fight Architecture (Shipwright Survivors)**

## **Overview**

All boss encounters in _Shipwright Survivors_ occur within a **modular, circular arena**, centered on a **stationary boss** governed by a **Finite State Machine (FSM)**. This architecture guarantees:

- **Consistent spatial grammar** across all bosses.
    
- **Predictable encounter zones** (e.g., 120° arc telegraphs).
    
- **No pathfinding**, allowing purely rotational, pattern-based bosses.
    
- **Strong modularity** between simulation and rendering.
    

---

## **Core Components**

### **1. BossArenaRenderingController**

> 📁 `src/rendering/unified/controllers/BossArenaRenderingController.ts`

- **Owns and updates arena rendering state.**
    
- Delegates draw calls to `BossArenaPass`.
    
- Subscribes to `GlobalEventBus` event:
    
    makefile
    
    CopyEdit
    
    `bossArena:spawn`
    
    allowing both **visual** and (eventually) **simulation** systems to react to arena declarations.
    
- **Responsibilities:**
    
    - Tracks arena `center`, `radius`, and **visual state** (idle, forming, pulsing).
        
    - Manages `formProgress` and time-based transitions.
        
    - Exposes methods for manual overrides:  
        `startForming()`, `startPulsing()`, `setArena(...)`
        
- **Lifecycle:**
    
    - Instantiated and owned by `UnifiedSceneRendererGL`.
        
    - `update()` called during each renderer update step.
        
    - `render()` called mid-frame (after entities, before particles).
        

---

### **2. BossArenaPass**

> 📁 `src/rendering/unified/passes/fx/BossArenaPass.ts`  
> 📁 `src/rendering/unified/shaders/fx/bossArenaRenderer.vert|frag`

- **Responsible for GPU rendering of the arena’s circular boundary.**
    
- Draws a **single instanced quad** centered at the arena’s world position, scaled by radius.
    
- Visual state driven by uniforms:
    
    - `uState` – 0 = idle, 1 = forming, 2 = pulsing.
        
    - `uFormProgress` – [0.0, 1.0] for animated arc sweep-in.
        
    - `uArenaCenter`, `uArenaRadius` – world-space inputs.
        
- **Rendering integration:**
    
    - Camera matrices via `CameraMatrices` UBO.
        
    - Renders to `sceneFramebuffer` like all other world-space passes.
        
    - Blended with `SRC_ALPHA, ONE_MINUS_SRC_ALPHA`.
        

---

### **3. BossAIController**

> 📁 `src/game/boss/ai/BossAIController.ts`

- **Centralized state machine driver** for boss behavior and attack logic.
    
- **Responsibilities:**
    
    - Drives FSM transitions based on timers, health thresholds, or triggers.
        
    - Coordinates **multi-layered attacks** (e.g. Minefield + Flame Arc).
        
    - Orchestrates **telegraphs**, **damage logic**, and **lighting events**.
        
    - Emits internal events for VFX/sound hooks.
        
- **States (FSM examples):**
    
    - `Idle` – Re-orients or delays.
        
    - `LeftFlankFlames` / `RightFlankFlames` – 120° cone attacks.
        
    - `FrontalFlameBarrage` – Tracking cone.
        
    - `MinefieldDeploy` – Circular hazard placement.
        
    - `RadialDetonation` – Full-ring telegraphed explosion.
        
    - `ComboState` – Composite, layered behaviors.
        
- **Escalation Rules:**
    
    - Reduced idle durations, faster telegraphs, increased combo frequency.
        
    - Tightened safe zones and higher flame tracking speeds.
        

---

### **4. Boss Block Grouping (SOA Integration)**

> 📁 `src/boss/utils/blockGroupHelpers.ts`

- All blocks participate in the shared SOA, but bosses add:
    
    
    `group: Uint8Array; // e.g., 0 = default, 1 = left flank, 2 = core, etc.`
    
- Used for:
    
    - **Telegraph lighting** per group.
        
    - **Selective enabling/disabling** (e.g., arm cannons on phase triggers).
        
    - **Efficient targeting** (e.g., group-based AoE effects).
        

---

### **5. Telegraphing & Visual Cues**

- **Driven by FSM + group lighting:**
    
    - `BlockLightSystem` pulses specific groupings.
        
    - Telegraph color and intensity vary by attack.
        
- **Arena-wide effects:**
    
    - Forming state uses **arc sweep-ins**, **ring pulses**, and **sparkle trails**.
        
    - Pulsing state uses **streaming ring glow**, **sinusoidal intensity**, and **edge sparkles**.
        
- **Sound + shader sync** (eventually):
    
    - Match lighting pulses with corresponding SFX bursts and shader flashes.
        

---

## **Collision & Gameplay Rules**

- Player is **trapped within the arena** — wall contact may:
    
    - **Nullify velocity** (soft bounce).
        
    - **Inflict damage/knockback** (optional per boss theme).
        
- Boss is **immobile**; challenge is in pattern reading and maneuvering.
    
- Projectiles:
    
    - May **dissipate**, **reflect**, or **wrap** on arena contact.
        
- Mines and hazards are always placed **relative to the arena circumference**, ensuring deterministic layout.
    

---

## **Implementation Summary**

- `UnifiedSceneRendererGL` owns and integrates the **rendering controller** directly.
    
- FSM and gameplay simulation remain in the boss domain under `src/game/boss/`.
    
- `bossArena:spawn` serves as a **universal orchestration event**, enabling synchronized arena initialization across visual, physical, and logical systems.

## Directory Overview

```
src/
├── rendering/
│   └── unified/
│       ├── passes/
│       │   └── fx/
│       │       └── BossArenaPass.ts         ← GPU pass (circle ring rendering)
│       ├── shaders/
│       │   └── fx/
│       │       ├── bossArenaRenderer.vert   ← Arena geometry transform
│       │       └── bossArenaRenderer.frag   ← Visual effect logic
│       └── controllers/
│           └── BossArenaRenderingController.ts ← Manages render state + timing
├── game/
│   └── boss/
│       ├── ai/
│       │   └── BossAIController.ts          ← FSM and attack coordination
│       ├── fsm/                             ← Individual state behaviors
│       └── utils/
│           └── blockGroupHelpers.ts         ← Light + group utilities

```
