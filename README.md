# 🚀 Shipwright Survivors

A block-based space survival game where you build ships, collect resources, and battle waves of enemies.

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

- [ ] Multiple weapon types
  - [x] Turret
  - [x] Laser
  - [ ] Mines (Potential Different types)
  - [ ] Homing Missles (Seeking Missles)
  - [x] Explosive Lance (Fire a fast lance that hits an enemy block, sticks in, then detonates)
  - [ ] Orbiting Blade (Blades orbit the player ship, dealing damage on contact to enemies)
  - [ ] Arc Conduit Emitter (Chain lightning)
  - [ ] Grappling Hook
  - [ ] Garlic (In vampire Survivors)
  - [ ] Rail Lance (Long cooldown, pierces many blocks)
  - [ ] Suppressor Gas (Supresses engines and firepower)
  - [ ] Reflector Array (Reflects projectiles like bullets and lasers)
  - [ ] Parasite Pods (DOT damage)
- [ ] More Block types
  - [x] Shields
  - [x] Battery (Increases max energy)
  - [ ] Radar Array (Wider zoom out, wider radar range)
  - [ ] Deflecting Plating (Maybe facetplate does this % chance to deflect a projectile)
  - [ ] Auto-repair Node (Heals adjacent blocks slowly over time, consumes energy?)
  - [x] Tractor Node (Longer range pickup rate)
  - [ ] Drone Hanger Bay (Introduces minion playstyle)
- [ ] Progression system
  - [x] Technology Tree System (Block Type Unlocks)
    - [x] Way of unlocking blocks through gameplay
  - [ ] Passive Tree (Passive bonuses, e.g. Fins 10% more effective)
    - [ ] Way of unlocking passive tree through gameplay
- [ ] Overworld / Level select
  - [x] Basic Implemetation
  - [ ] Galaxy Map with Unlockable Nodes and good visual style
- [ ] Title screen (Save files, New game etc)
  - [x] Basic Implementation
  - [x] New game
    - [x] 3 Save Files
    - [ ] Pilot name selection
  - [x] Load Game
  - [ ] Credits
- [ ] Story/dialogue/characters
  - [x] Basic Implementation of Dialogue in Hub
  - [x] Basic Implementation of Dialogue in Mission
  - [x] First mission tutorial
  - [ ] In Hub, have characters slide-in from the left, and slide back out after dialogue
  - [ ] Full script / Stories / Sound
- [x] Boss encounters
- [ ] Environmental Events
  - [x] Asteroids
  - [ ] Nebulae
  - [ ] Wormholes
  - [x] Planets
    - [ ] Planet interactions (Quests, vendors, salvage, etc)
  - [ ] Space Stations
  - [ ] "Treasure Goblins" (Ship which flees and has good drops)

TODOS:
  - [ ] Move 2d Canvas to webgl:
    - [x] Ships
    - [x] Planets
    - [x] Background
    - [x] Particles
    - [ ] Asteroids
    - [ ] ExplosionSystem
  - [x] More UI Scaling fixes for resolution support/scaling support
  - [ ] Explore gating hull size, and having max hull size increasable via the passive tree
    - [ ] Starter ships could have implicit max hull sizes
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
  - [x] Allow pause menu parameterization wherein the abandon mission button is greyed out during the first tutorial mission
      - [ ] Also allow Quitting directly from this menu if we're in electron
  - [x] Clicking Resume on the pause menu does not free up input
  - [ ] Correct positioning of inPerson conversations
  - [x] Add resolution select to settings menu
  - [ ] Spending a passive point should have SATISFYING auditory and visual feedback
  - [ ] Player death state
  - [x] If ship builder menu is open during dialogue, they overlap. (Need to move dialogue right in this case)
  - [ ] Add click-to-move movement option (Instead of WASD)
  - [x] Add warp in effect for spawning hostiles / player (maybe build up block by block dramatically?)
  - [x] Block to block collisions
  - [x] Make crosshair easier to see, lightup when firing or targetting an enemy
  - [x] If the cockpit is the only remaining block on an enemy ship, it should be destroyed
  - [x] HP bar, shield bar should be graphical and center bottom. Graphical hud needed.
  - [x] AI Patrol State, right now all created enemies just bumrush player
BUGS:
  - [ ] Mission result menu does not scale with resolution
  - [ ] Planet Popping in and out of view when it's nearly offscreen but not completely
  - [ ] Dialogue misaligned after tutorial at 1080p in Hub?? or was it 1440p? 
  - [x] Planets are different sizes and spatial coordinates in different resolutions when switching. I believe that the renderers need to re-cache the images.  Use onresolution change cb.
  - [x] Background is different size in different resolutions
  - [ ] Disabling Lighting in settings menu needs to clear lighting canvas
  - [ ] Enemy turrets aim toward mouse location.  Only player ship should do that, enemy turrets should aim where they are facing.
  - [x] If game is paused, wavespawner becomes misaligned.  Even though displayed timer countdown pauses and resumes correctly, actual time gets thrown off.
      E.g. if I pause on wave 1, wait a minute or so, then unpause, the waves won't spawn properly, in fact, if I pause for several minutes, and unpause, no waves spawn at all
      - [ ] Test this fix, verify by pausing on map start (after first wave has spawned, and before), waiting like 3 minutes, then unpausing and verifying all waves spawn.
  - [ ] Turret Firing Sound effect issue - redo logic of how turret SFX is played. Different turret timers causes only 1 sound to play
  - [x] Shield Rendering regression - No longer showing shield aura circles or highlighted blocks
  - [x] Turret firing: If a block is destroyed, the entire firing sequence is re-evaluated,
       This is potentially inefficient, but more imporantly, it resets your firing cooldown.
      So if you're having blocks destroyed while in combat, you might never be able to fire.
      Turret system needs to be re-evaluated.
  - [x] Significant performance degradation when destroying many blocks simultaneously. We need to batch this.
  - [x] Significant performance degradation when damaging a group of blocks with Explosive lance

## 📝 Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Start development server |
| `npm run build` | Build production version |
| `npm run preview` | Preview production build locally |
