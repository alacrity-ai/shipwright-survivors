# **FLAMELORD.md – Boss Specification**

## 🔥 Overview

**The Flame Lord** is a high-pressure, telegraph-heavy boss encounter designed around spatial control and escalating attack overlap. It rewards players who can read visual cues, reposition preemptively, and solve positional puzzles under pressure.

> Encounter Type: **Rotational Pattern Boss**  
> Theme: **Flame & Area Denial**  
> Phase Model: **Single HP bar**, escalating behavior via health thresholds  
> Arena: Circular, enforced boundaries  

---

## 🧠 Boss Identity

- Gigantic engine-driven warship with prominent flamethrower banks.
- Entirely stationary; rotates to execute patterns.
- Never chases player; focuses on **zonal denial** and **telegraph-response gameplay**.
- Dominates the screen with overlapping flame arcs, mine fields, and radial detonations.

---

## 🧱 Core Attack Zones

Flame-based attacks occupy **one-third of the arena (120° arc)**:

- **Left Flank**: covers left arc (120°), front-left to rear-left.
- **Right Flank**: covers right arc (120°), front-right to rear-right.
- **Frontal Barrage**: centered forward arc (120°), symmetrical about boss’s facing.

No part of the **rear arc** is ever a dedicated safe zone during combinations — it's covered by overlaps.

---

## 🧩 Core FSM States

Each state is a self-contained behavior module implementing `BossState`.

### 1. `BossState_Idle`
- Boss rotates to re-center on player (if off-angle).
- Idle duration starts at ~4–5s, shrinks to 1–2s.
- No attack; breathing phase between offensives.
- Dialogue: Boss may spout a snappy line in each idle phase.
- Transition: random next state (weighted).

---

### 2. `BossState_LeftFlankFlames`
- Rotate to align left flank to player (~90° offset).
- Telegraph: left arc blocks glow for 2.5–3s.
- Attack: continuous flames for 5s.
- Boss remains stationary during flames.
- Escalation: Telegraph shrinks to 1.5s, attack extends slightly (~6s).

---

### 3. `BossState_RightFlankFlames`
- Mirror of Left Flank behavior.
- Targets player's right orbit instead of left.
- Telegraph: right-side glow.
- Same escalation profile.

---

### 4. `BossState_FrontalBarrage`
- Face player directly (rotate with slight inertia).
- Telegraph: frontal glow 2.5–3s.
- Attack: 7–9s of continuous flames.
- Boss **tracks player** slowly during barrage (rotation allowed).
- Escalation: Telegraph shrinks, rotation speed increases.

---

### 5. `BossState_MineField`
- Spawns 8–12 mines in circular ring.
- Some large mines (in later phases).
- Countdown glow on mines (2–3s).
- Mines detonate nearly simultaneously, leaving narrow safe gaps.
- Early phases: only small mines, wide spacing.
- Escalation: tighter gaps, 1–3 large mines.

---

### 6. `BossState_DetonatePulse`
- Full-body glow telegraph (2.5s).
- Boss becomes immobile and explodes in radial AoE.
- Instant kill at close range (in later phases).
- Escalation: Shorter telegraph, higher damage.

---

### 7. `BossState_Combo_LeftRightFlames`
- Telegraph both flanks (~2s), then fire simultaneously.
- Player must move to frontal wedge to avoid.
- No rotation.
- Escalation: Combo duration increases slightly (~5–6s).

---

### 8. `BossState_Combo_FrontRightFlames`
- Telegraph frontal flame first, then right (staggered by 0.5–1s).
- Forces player to left orbit.
- Higher damage pressure due to overlapping sweeps.

---

### 9. `BossState_FinalExam`
- Triple-layered sequence:
  1. Left Flank Flames + MineField overlap
  2. Mines detonate → brief pause (0.5s)
  3. Immediate DetonatePulse triggers
- Forces player to locate:
  - Safe arc (not covered in flames)
  - Safe mine gap
  - Retreat path before explosion
- Requires mastery of all mechanics.

---

## 🎚️ Fight Escalation Model

| Health Threshold | Behavior Changes |
|------------------|------------------|
| 100–75%          | Long idle (~5s), 1 mechanic per state, generous telegraphs |
| 75–50%           | Idle shrinks (~3s), mine phases gain 1 large mine |
| 50–25%           | Combos introduced (dual flames), idle ~2s |
| 25–0%            | Combos + mine layering, detonate becomes instant-lethal, idle ~1s |

Each state pulls from a **weighted attack selection table** (weights shift as health decreases).

---

## 📦 Implementation Plan

### FSM Wiring
- Create and wire the states

### Orchestrator Pipeline

```
await bossOrchestrator.spawnBoss(def, pos);
await bossOrchestrator.runIntroCutscene();
await bossOrchestrator.activateAI(); // Calls controller.transitionTo('Idle')
await bossOrchestrator.awaitDeath();
await bossOrchestrator.runOutroCutscene();
```

## Telegraph, Visuals and Sound

| Attack            | Glow Source                      | Audio Cue                             | Notes                                |
| ----------------- | -------------------------------- | ------------------------------------- | ------------------------------------ |
| Left/Right Flames | Corresponding flank block groups | Rising pressure hiss + ignition       | Glow color intensifies to full white |
| Frontal Flames    | Frontal block banks              | Resonant ignition + rumble loop       | Tracks player slowly                 |
| Mines             | All mines glow progressively     | High-pitched whine + “detonate tick”  | Large mines have deeper color glow   |
| DetonatePulse     | Full hull glows red → white      | Deep bass pulse + silence before boom | Frame-freeze on pulse                |


## 🧠 Summary

**The Flame Lord** is a spatial dominance boss. Every mechanic emphasizes movement reading and decision-making under pressure. By layering familiar behaviors instead of introducing new ones, the encounter rewards players who learn its rhythm.

The FSM is structured for **modular extensibility**, **state caching**, and **telegraph transparency**. The final sequence (flames + mines + pulse) acts as the culmination — the “final exam” — and is only winnable through prediction and execution, not reflex alone.