
# 🛰️ `FORMATIONS.md` — Declarative AI Ship Formations in _Shipwright Survivors_

This document outlines the complete system enabling **formation-based AI coordination** in combat waves. The architecture allows declarative definition of multi-ship formations, runtime role inference, tight behavioral mirroring, and seamless transition between tactical states.

---

## 🧩 High-Level Goals

- Declaratively spawn cohesive enemy groups using reusable formation templates.
    
- Enable AI agents to self-organize into coordinated roles at runtime.
    
- Allow leaders to drive combat behavior; followers track, mirror, and disengage tactically.
    
- Maintain runtime resilience: if leaders die or followers scatter, rejoining is possible.
    

---

## 🧱 System Phases

|Phase|Task|Description|
|---|---|---|
|1|Scaffold Registry|Encapsulate formation group metadata|
|2|Wire into Orchestrator|Owned, constructed, and exposed cleanly|
|3|Formation-aware Controllers|Role-aware, context-bound controller state|
|4|Implement `FormationState`|Behaves reactively and propagates transitions|
|5|Enable Dynamic Rejoining|Gracefully returns to formation post-attack|
|6|Hook into Factory & Spawners|Declarative formation assignments at spawn|
|7|Design for Extensibility|Support arbitrary formation shapes and roles|
|8|Validate & Test|Robust to dynamic join/leave and leader death|

---

## ⚙️ Component Overview

|Step|Component|Functionality Summary|
|---|---|---|
|1|`FormationRegistry`|Central store for formation IDs, leader IDs, and member offsets.|
|||Provides: `getOffsetForShip()`, `getFormationByShipId()`, `getLeaderId()`|
|2|`AIOrchestratorSystem`|Owns the registry. Calls `setFormationContext()` on controllers post-creation.|
|3|`AIControllerSystem`|Stores formation ID, role (leader/follower), and registry ref. Provides leader access.|
|4|`FormationState`|Follows leader using offset tracking. Transitions to combat if leader engages target.|
||`SeekTargetState` / `AttackState`|Expose `.getTarget()` cleanly for followers to consume.|
|6|`ShipFormationFactory`|Declaratively spawns groups using formation layouts. Returns ship+controller mappings.|
||`WaveSpawner`|Calls `spawnFormations()` per wave and tracks all spawned members internally.|

---

## 🟩 **Formation Leader**

### 🎭 Role

- Behaves exactly as a normal ship: has full autonomy.
    
- No awareness of formation status.
    
- Is indirectly referenced by its followers for coordination.
    

### 🧠 Behavior

- Driven entirely by local AI FSM.
    
- Uses `PatrolState`, `IdleState`, `SeekTargetState`, `AttackState`, etc.
    
- Followers use this controller's `.getTarget()` to determine when and whom to attack.
    

### ✅ Summary

> **"Unencumbered actor; indirectly governs others via observer linkage, not command issuance."**

---

## 🟦 **Formation Followers**

### 🎭 Role

- Subordinate ships whose controller enters `FormationState` upon creation.
    
- Dynamically mirror the leader’s tactical stance.
    

### 🧠 Behavior Phases

1. **Idle Formation Phase (`FormationState`)**
    
    - Compute `leader.position + offset` (via registry) and approach it.
        
    - Do not engage targets or use weapons.
        
    - Continuously poll the leader’s controller FSM.
        
2. **Combat Engagement**
    
    - When leader enters `SeekTargetState` or `AttackState`, followers copy that state.
        
    - Followers adopt the _exact_ same target as the leader via `.getTarget()`.
        
3. **Post-Combat Rejoin** _(Phase 5)_
    
    - When target is lost or destroyed, followers may return to `FormationState`.
        
    - Enables reconvergence of the group after tactical scattering.
        

---

## 🧪 Wave Definition Syntax

```
formations: [
  {
    formationId: 'wedge',
    layout: [
      { x: -1000, y: 0 },
      { x: 1000, y: 0 },
      { x: 0, y: 1000 }
    ],
    leader: { shipId: 'command_ship' },
    followers: [
      { shipId: 'drone' },
      { shipId: 'drone' },
      { shipId: 'drone' }
    ],
    count: 5 // ← replicates this formation pattern 5 times
  }
]

```


> Each layout entry corresponds 1:1 to a follower entry.  
> The leader always spawns at the origin of the formation, and its position acts as the absolute basis for all offsets.

---

## 📊 Behavior Matrix

|Capability|Leader|Follower in Formation|
|---|---|---|
|FSM Autonomy|✅|⛔ Locked to `FormationState`|
|Position Control|✅|✅ Offset from leader|
|Aggression Evaluation|✅|⛔ Mirrors leader|
|Target Selection|✅|⛔ Copied from leader|
|Rejoining Capability|N/A|✅ (Planned Phase 5)|
|Formation Awareness|⛔|✅ Registry + leader ref|
|Lifecycle Observability|✅|✅ Notified on leader death|

---

## 🔮 Extensibility

The design anticipates future formation capabilities:

- Multiple leaders per group (e.g., dual-commander tactics).
    
- Conditional formations (e.g., scatter-on-hit, reconverge-on-low-health).
    
- Role-aware behaviors (e.g., flanking pairs, healers in rear guard).
    
- Visual debug tools to show formation structures during runtime.