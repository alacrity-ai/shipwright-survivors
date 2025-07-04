# 📊 Mission Result Bar System

This module implements a dynamic, visually responsive **Mission Progress Bar** for use in the post-run debriefing screen in _Shipwright Survivors_. It replaces the binary "Victory / Defeat" messaging with a granular, animated visual representation of the player’s wave progression.

---

## ✅ Purpose

Communicates **run progress** in a psychologically constructive way by:

- Displaying how far into the mission the player made it.
    
- Celebrating partial progress (tick marks).
    
- Highlighting boss kill completion with a crown icon and visual burst.

### 🧱 File Structure

```
result_bar/
├── MissionProgressBarController.ts    ← Main orchestrator class (lifecycle, logic)
├── MissionProgressBarRenderer.ts      ← Stateless visual renderer (drawing only)
├── drawMissionBarFrame.ts             ← Cached 2D frame rendering
├── drawBossCrownIcon.ts               ← Cached 2D crown icon with glow
└── MISSION_RESULT_BAR.md              ← You're reading it

```

## 🧠 Conceptual Overview

The system is composed of two main classes:

### 1. `MissionProgressBarController`

- Owns animation state: progress interpolation, tick state, and pulse timers.
    
- Provides `update(dt)` and `render()` methods.
    
- Internally instantiates and manages a `MissionProgressBarRenderer`.
    
- Tracks:
    
    - Wave progress
        
    - Tick milestone state (`tickPopFlags`)
        
    - Animation timers for pulse effects
        
    - Crown pulse trigger on boss kill
        

### 2. `MissionProgressBarRenderer`

- Pure renderer: has no logic or simulation.
    
- Consumes a `MissionProgressRenderState` object passed via `setRenderState(...)`.
    
- Renders:
    
    - Bar frame (with glow)
        
    - Fill region (teal gradient)
        
    - Animated tick pulses
        
    - Crown icon and glow pulse on boss reach

## ⚙️ Usage

### Initialization

```
const barController = new MissionProgressBarController(x, y);
barController.triggerStart(wavesCleared, totalWaves, didKillBoss);

```

- `x, y` are top-left coordinates in screen space.
    
- `wavesCleared`: number of waves completed
    
- `totalWaves`: full wave count for this mission
    
- `didKillBoss`: whether the run ended in boss kill

### Game Loop Hooks

In your update/render cycle (e.g. inside `DebriefingSceneManager`):

```
barController.update(dt);
barController.render(); // renders to 'overlay' canvas

```

## 🎨 Visual Design

- **Aesthetic**: clean, minimalist, neon teal aesthetic matching coachmarks
    
- **Frame**: rounded glowing outline (`drawMissionBarFrame.ts`)
    
- **Fill**: animated teal gradient with inner glow
    
- **Tick Marks**:
    
    - Appear as static notches at wave milestones
        
    - Glow when reached
        
    - Animate pulse rings for ~0.4s after pop
        
- **Boss Icon**:
    
    - Stylized crown icon on final tick
        
    - Glows if boss was defeated
        
    - Emits pulse burst upon reaching
        
---

## 🧼 Extensibility

To extend or customize:

- Add tooltips to ticks: track mouse/touch over `getBounds()`, infer wave index.
    
- Add floating text or numeric wave labels.
    
- Animate final fill with easing.
    
- Integrate mission metadata (e.g., incident progress) per tick.

### 📌 Summary

|Component|Role|
|---|---|
|`MissionProgressBarController`|Owns simulation state and drives render|
|`MissionProgressBarRenderer`|Stateless visual renderer|
|`drawMissionBarFrame.ts`|Cached bar frame with glow|
|`drawBossCrownIcon.ts`|Cached boss icon with burst effect|

