# 🚀 Shipwright Survivors

A block-based space survival game where you build ships, collect resources, and battle waves of enemies.

## Try it now!

[Play Shipwright Survivors](https://alacrity-ai.github.io/shipwright-survivors/)

![Gameplay](gameplay.png)

## 🎮 Game Overview

Shipwright Survivors (SWS) combines the addictive wave-based combat of games like Vampire Survivors with deep ship customization and resource management:

- **Block-Based Ship Building**: Construct your ship from modular blocks, each with unique properties
- **Resource Collection**: Gather currency from defeated enemies to upgrade your ship
- **Wave-Based Combat**: Battle increasingly difficult waves of enemy ships
- **Physics-Based Movement**: Navigate with realistic inertial movement and thruster effects

## 🛠️ Tech Stack

- **TypeScript** for type-safe code
- **React + Vite** for UI and build system
- **Canvas API / WebGL2** for rendering game elements
- **Entity-Component System** for game architecture

## 🧩 Project Structure

```
src/
├── core/           // Engine fundamentals (GameLoop, Camera, Input)
├── game/           // Game-specific entities and logic
│   ├── blocks/     // Block types and registry
│   ├── ship/       // Ship construction and management
│   ├── interfaces/ // Type definitions
├── rendering/      // Rendering systems and sprite caches
├── systems/        // Game systems (physics, AI, combat)
│   ├── ai/         // AI behavior and state machines
│   ├── combat/     // Weapons and damage
│   ├── physics/    // Movement and collision
│   ├── pickups/    // Resource collection
├── ui/             // React components and menus
├── main.tsx        // Application entry point
```

## 🚀 Getting Started

1. **Install dependencies**:
   ```
   npm install
   ```

2. **Start development server**:
   ```
   npm run dev
   ```

3. **Open in browser**:
   ```
   http://localhost:5173
   ```

## 🎮 How to Play

- **WASD**: Thrust and movement
- **Shift + WASD**: Strafe
- **Q/E**: Strafe left/right
- **Mouse**: Aim weapons
- **Left Click**: Fire primary weapons
- **Right Click**: Fire secondary weapons
- **Tab**: Open ship builder
- **Space**: Rotate block (in ship builder)
- **Left Click**: Place block (in ship builder)
- **Right Click**: Remove block (in ship builder)

## 🧠 Key Systems

### Ship Building

Ships are constructed from a grid of discrete blocks placed relative to a central cockpit. Each block type has unique properties (armor, cost, behavior) and is procedurally rendered.

### Intent System

The game uses an intent-based control system that decouples input from execution. This allows both player and AI ships to use the same underlying systems for movement and combat.

### AI Behavior

Enemy ships use a finite state machine with states like Patrol, Attack, and Flee. The AI makes decisions based on proximity, health, and tactical considerations.

### Physics

The game features Newtonian physics with inertia and realistic thruster effects. Ships must manage momentum and rotation to navigate effectively.

## 🔮 Planned Features

STEAM CHECKLIST:
- [ ] Steamdeck Verified! required.
- [ ] Steampage
- [ ] Steam SDK integrated
- [ ] Localization?
- [ ] Steam achievements
- [ ] Demo Prepared and ready to launch
- [ ] Trailer created
- [ ] Create Press-Kit for Streamer Outreach (images, etc)

TUTORIAL FEEDBACK:
- [ ] Not clear that you should hold down fire button
- [ ] Not clear that afterburner also requires simultaneous movement, perhaps if holding afterburner, assume forward thrust?

DEMO ROADMAP:
What's needed to get to Demo:
- [ ] Mini intro before tutorial, static "Shipwright! Shipwright! Listen ... Trust the robot, he doesn't know it yet.. But"
- [x] Tutorial Rewrite
- [x] Controller Support
  - [x] Menus (Need navtree)
- [ ] Incidents (Make at least 10 or so incidents)
- [x] 2 Missions - each tested thoroughly for smooth flow
  - [ ] Sub objectives in each mission, e.g. in the galaxy select
- [ ] Basic breakroom dialogue
- [x] Planet merchants, trade blocks for other blocks, entropium, etc. unlockables
- [ ] Demo End splash (List what's coming)
- [x] Titlescreen polish / rework
- [ ] Laser polish firing sound
- [ ] Engine sound on gamepad use
- [ ] Add 5 more weapons

Plugin Passives:
{
    "damage": 0.49999999999999994, // done
    "harvestRange": 1200, // done
    "armor": 100, // done
    "fireRate": 0.3, // done
    "mitigation": 0.3, // done
    "thrust": 0.49999999999999994, // done
    "entropiumPickupBonus": 0.49999999999999994, // done
    "turnPower": 0.44999999999999996, // done
    "abilityPower": 0.6,
    "criticalChance": 0.35, // done
    "criticalMultiplier": 0.35, // done
    "stunChance": 0.05,
    "explorer": 1,
    "voidIntensity": 1,
    "ignoreDamageChance": 0.17, // done
    "blockDropRate": 0.44999999999999996, // done
    "attachTierUpChance": 0.25,
    "rareItemTradepostChance": 0.5,
    "abilityCooldown": 0.6,
    "incidentSpawnChance": 0.5,
    "bossDamage": 0.5
}

TODOS:
  - [ ] New incident: Time portal. Creates arena, spawns in enemies, pauses the wave spawner, sepia filter

  - [ ] Add the Astral Codex menu
  - [ ] Retry button next to Return To Base on mission debriefing failure

  - [ ] Add active skills to each ship. Each ship gets a unique skill.  Then battery blocks or whatever can reduce cooldown on these.
    - SW1: Some kind of stim?
    - Monarch: 
    - Godhand: Lightning to every enemy on screen? Maybe jump to every ship on screen hitting them?
    - Vanguard: 
    - Salamander: Radial screenwide flame ignite

  - [ ] Boss mines would be more interesting if they spawned one after another (random mine order), and then detonated in FIFO order, so you could move into the explosion.

  - [ ] Some lights still occassionally leak

  - [ ] AI Phase 2
      Kill Per-Frame Blind Zeroing:
    Instead of zeroIntentSlot on every frame, have each state guarantee it fully overwrites all its fields (which updateSOA already does).
    Only zero slots when they’re culled or freed. This alone could cut memory writes by 30–40%.
    Abstract Slot Swapping Behind a Utility:
    The swapIntentSOA + rebind logic should be atomic. Right now, a bug here will desync controllers.
    Wrap it in a moveControllerSlot(from, to) method to enforce invariants.

  - [ ] Potentially give enemies "callout sounds" and have them use playSpatialSfx

  - [ ] Finish all Ship Skill Tree Implementations
  - [ ] Finish all Passive Skill implementations
  - [ ] Finish all Artifact Implementations

  - [ ] ALT+ENTER, can I make this work?

  - [ ] Add Escorts System

  - [ ] Completely clearing a Vortex Incident should end it immediately!

  - [ ] Plugin ship SkillTree effects to game systems
    - [ ] Vanguard
    - [ ] Monarch
    - [ ] Halo
    - [ ] Godhand
  - [ ] Add unlockable ships to each vendor so that every ship of the 5 is possible to unlock in game.
    - [ ] Godhand

  - [ ] Debriefing menu needs more refinement:
    - [ ] Add breakdown of all damage done by which weapons
    - [ ] Stretch: Add a breakdown of all achievements / sidequests??? 

  - [ ] Gamepad support for new menus:
    - [ ] Mission mutators
    - [ ] Passive Skill Tree

  - [ ] Multilingual support, use this technique:
      ``` 
      import { tr } from '@/i18n/template';

      {
        type: 'line',
        speakerId: 'carl',
        text: tr`intro-briefing.line1|Greetings, Shipwright Second Class. Assessing your consciousness status...`,
      }
      ``` And then keep the other language definitions for intro-briefing.line1 in another file
      - [ ] Also allow Quitting directly from this menu if we're in electron
  - [ ] Add click-to-move movement option (Instead of WASD)
  - [ ] Make better first boss.
BUGS:
  - [ ] If no waves are cleared (e.g. instant abandon), then progress bar in debriefing is stuck
  - [ ] Levelup menu and block drop decision menu clash
  - [ ] Enemy turrets aim toward mouse location.  Only player ship should do that, enemy turrets should aim where they are facing.


REFINEMENT:
  - [ ] Only unlock first mission after tutorial, not both 1 and 2
  - [ ] Engine sound needs to play on gamepad movement
  - [ ] Incident completion / cursed cargo completion sound is the same as leveling. fix that.
  - [ ] Clearcolor/Shaders when boss enters
  - [ ] Show damage break down in mission summary
  - [ ] Big ship destruction sound always happening, randomly choose 3 sounds or so
  - [ ] Lifesteal needs a cooldown


## 📝 Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Start development server |
| `npm run build` | Build production version |
| `npm run preview` | Preview production build locally |
