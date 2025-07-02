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
- **Canvas API** for rendering game elements
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

DEMO ROADMAP:
What's needed to get to Demo:
- [ ] Mini intro before tutorial, static "Shipwright! Shipwright! Listen ... Trust the robot, he doesn't know it yet.. But"
- [ ] Tutorial Rewrite
- [ ] Controller Support
  - [ ] Menus (Need navtree)
- [ ] Incidents (Make at least 10 or so incidents)
- [ ] 3 Missions - each tested thoroughly for smooth flow
  - [ ] Sub objectives in each mission, e.g. in the galaxy select
- [ ] Basic breakroom dialogue
- [ ] Planet merchants, trade blocks for other blocks, entropium, etc. unlockables
- [ ] Demo End splash (List what's coming)
- [ ] Titlescreen polish / rework
- [ ] Laser polish firing sound
- [ ] Engine sound on gamepad use
- [ ] Add 5 more weapons

TUTORIAL TODOS:
  - [ ] Start with NO HUD visible
    - [ ] Refine messages to not mention direct keyboard commands as we now have coachmarks.
    - [ ] Introduce Radar
    - [ ] Introduce Health
    - [ ] Introduce Energy?? (Maybe hide this until you get an energy block then do a mini tutorial)
    - [ ] Introduce Afterburner
    - [x] Introduce Weapons
    - [x] Introduce Movement/Afterburner
    - [x] Introduce Block Placement
    - [ ] Introduce Block Upgrading
    - [ ] Introduce Block Refinement
    - [ ] Introduce Block Removal
    - [ ] Introduce Block Rotation

TODOS:
  - [ ] Investigate if minimap icons are cached, if not, cache them

  - [ ] Todos, add difficulty level selection to mission selection.
    - [ ] Difficulty scaling should scale enemy quantity, and enemy power. 1.5 Power, 1.0 density = elite, 1.0 power 0.75 density = hard, 0.5 power 0.5 density = normal
    - [ ] Diffuculty should also scale the amount of cores received in mission debriefing
  - [ ] Plugin ship SkillTree effects to game systems
    - [x] SW-1
    - [ ] Vanguard
    - [ ] Monarch
    - [ ] Halo
    - [ ] Godhand
  - [ ] Add unlockable ships to each vendor so that every ship of the 5 is possible to unlock in game.
    - [x] Halo
    - [x] Monarch
    - [ ] Godhand
    - [ ] Vanguard
  - [ ] Add randomness to trade tradepost trades, create some helper that generates pairs, probability tiers, put blueprints as static unlocks, if unlocked, then occupy with 3 trades.

  - [x] Integrate tradepost registry entries in PlanetRegistry definitions
    - [x] Add all the existing tradeposts to the existing planets
  - [x] Ship blueprints droppable
  - [x] Add acquisition of ship mastery levels in mission debriefing.  1 level clear = 100xp?
  - [x] Add purchasing of a discovered ship in the ship selection menu
  - [x] Add mastery level requirement to ShipSkillTreeNode, to make the tooltip more clear.
  - [x] Fix black ship skilltree icons

  - [ ] Passive menu needs to use GamepadNavMap
  - [ ] Tutorial Mission Revamp (Make it better, it's also unwinnable currently)
  - [ ] Gamepad - Press select to toggle to the block queue. d-pad left and right to cycle through blocks, and A to attach. Should work in and out of BlockDropDecisionMenu.
  - [ ] Ship Selection:
    - [ ] Add artifacts
      - [ ] Droppable item
      - [ ] Artifact equip in loadout menu
      - [ ] Artifact stat tooltip/description
      - [ ] PlayerArtifactStore / Registry / Effects (use Powerup system as reference)
    - [ ] Unify gathering aggregate powerups/ship skills/artifact effects with a single command
    - [ ] Unlockable Ship Blueprint Pickups
    - [ ] Verify that GL2 blocksprite cache is being cleared on the entityfx layer before entering runtime to avoid leaks
    - [ ] Verify ship select menu isn't leaking resources in any way

  - [ ] To prevent wave buildup, on each wave transition, expire enemies (FIFO) beyond certain cap.
  - [ ] Add a second instance of postprocessing layer that is always on passthrough except during sepia after mission.
  - [ ] On starting mission, little flash sting thing (think megaman).  Play a tiny tune. Then sound effect as the words disperse, then song starts.
  - [ ] Clean up deprecated OpenGL 1 layers, and caches, and canvas manager references.  Cleanup old lighting layer as well.
    - [ ] Move explosions (block explosion) to gl2
    - [ ] Cleanup all unused canvases/layers.
  - [ ] Controller Support: Make buttons work with D-Pad on joystick using Navlinks controlling the virtualMouse position.
    - [ ] Menu: Ergonomically abstract button elements to be accessible via controller.
    - [ ] Expose indicators to buttons ergonomically that show the button binding with a button/key indicator
  - [ ] Galaxy Map
    - [ ] Completed planets have some kind of indicator/mark
    - [ ] Basic description when hovered
    - [ ] Additional Descriptions when Selected
      - [ ] Description box of objectives / Unlockables
      - [ ] Alternate mission arrows with a (. . . (.) . .) tab selector at bottom.
        - [ ] Clicking on the side Arrows < > toggles between mission variants for that Location
    - [ ] Multiple acts / views (change perspective for more planets)
    - [ ] Better background / CRT effect
    - [ ] Planet textures
  - [ ] Radar Enhancements
    - [ ] Hover over radar makes it opaque
    - [ ] Add animated "LOOK HERE!" Arrow indicators that can be triggered via event hub
  - [ ] BlockDropSelectionMenu
    - [ ] Be able to close the BlockDropSelectionMenu with ESC/Tab
    - [ ] Be able to upgrade block to the next tier by placing it on top of another block of the same type.
  - [ ] Make a cockpit backend, each selectable ship will have their own cockpit weapon.
    - [ ] Move the default cockpit1 weapon to the cockpit backend
    - [ ] Make player cockpits specific: cockpitPlayer0, cockpitPlayer1, etc.
  - [ ] Screen edge indicators (e.g. showing objectives on the map, minibosses, etc): compliments radar
  - [ ] Make enemy wave spawn notifications more gameified and obvious. Big warning center screen + sounds, blinking countdown, and perhaps notifications when wave spawner is paused, e.g. in an event.
  - [x] Lots of Random Events things to discover in a run:
    - [ ] Enemy Spawner: When triggered, spawns a bunch of enemies, destroying it gives reward
    - [ ] Healing beacons : destroying it drops a bunch of HP
    - [ ] Treasure goblins - chase them and destroy them for reward.
    - [ ] Shrines - Provides a bonus / boon / or bane duration Buff
    - [ ] Planet interactions
    - [ ] Miniboss triggers
    - [x] League mechanics? Such as: 
      - [ ] Time dilation field: Time moves faster in here, or slower?
      - [ ] Explosive fuel depot: Chain reactive destructibles for battlefield control
      - [ ] Turret emplacements: Defended stations with Loot cores
      - [ ] Entropy Spire: Pay entropium for XYZ bonus
      - [ ] Salvage Drone Convoy: Maybe marked on the map, or spawn announced. Escorted hauler with loot.
      - [ ] Ancient Data Vault: Requires collecting 3 keys scattered across the map?
      - [ ] Challenge Modifier Node: Choose a challenge mod for a bonus, e.g. 30% entropium gain.
      - [ ] Orbiting Debris Field (Many asteroids)
  - [ ] Move 2d Canvas to webgl:
    - [ ] ExplosionSystem
  - [ ] Add the concept of a selectable startship
    - [ ] Upon returning to base, you are given 2 additional starter ships
    - [ ] Starter ships will have implicit bonuses per ship, e.g.
      - [ ] Starter ship 1: Engines add 20% more speed
      - [ ] Starter ship 2: Projectiles only fire forward
      - [ ] Starter ship 3: Turrets have 20% more damage
  - [ ] Add settings menu to the titlescreen
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
  - [ ] Improve initial mission tutorial:
    - [ ] Handle block rotation, refinement, autoplace, and place explicitly (Lock buttons if needed, give blocks if needed)
    - [ ] Handle incident interaction, e.g. where spending entropium is a thing. Maybe a merchant incident.
    - [ ] Make better first boss.
BUGS:
  - [ ] If you levelup, and then get enough EXP for another levelup during the delay (before the levelup window pops up), you lose the powerup choice from the first levelup.  We need to queue all the levelups to make sure you get all the choices. This can be easy, just keep track of total powerups, and if you don't have as many as you do levels, then reopen the menu on close.
  - [ ] Changing resolution in game from a small resolution to a large messes up the background, I think we need to reinstantiate or cleanup the background renderer/system.  Maybe the image in the image cache as well.
  - [ ] Post processing layer not properly invalidating on Resolution change (bloom is blurry on change)
  - [ ] Disabling Lighting in settings menu needs to clear lighting canvas
  - [ ] Enemy turrets aim toward mouse location.  Only player ship should do that, enemy turrets should aim where they are facing.

### Things to Explore:
  - [ ] "Town Portal" - Back to the planet? 
  - [ ] Add autofire option?

## 📝 Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Start development server |
| `npm run build` | Build production version |
| `npm run preview` | Preview production build locally |
