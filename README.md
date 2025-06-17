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
  - [x] Orbiting Blade (Blades orbit the player ship, dealing damage on contact to enemies)
    - [ ] Refactor the blade image to be webGL.
    - [ ] Fix issue where inner circles aren't equidistant.. verify that we're not calculating distances every frame.
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

MISSION  3:
Should be 5 waves
[ ] Add area preference for waves, e.g. in a wave definition, for each enemy spawn row, I can specify preference for outer, or inner.  This will allow me to spawn stronger enemies on the fringes, reducing early player deaths that feel bad.
[x] Enemies with blue boosters aren't moving???
[x] No screen shake for enemy kills
[x] Enemies shouldn't be able to damage each other
Add spawn delay time to enemy definitions in wave definition (for staggered hunters)



STEAM CHECKLIST:
- [ ] Steamdeck Verified! required.


DEMO ROADMAP:
What's needed to get to Demo:
- [ ] Mini intro before tutorial, static "Shipwright! Shipwright! Listen ... Trust the robot, he doesn't know it yet.. But"
- [ ] Tutorial Rewrite
- [ ] Player death state
- [ ] Controller Support
  - [ ] Menus
  - [ ] Gameplay
    - [ ] Issue: Figure out, do we want a boost button? Do we want a sharp turn button?
    - [ ] Issue: Presently, we just turnTo (degrees), we may want to have it so that the 40 degree radius or so in the back of the ship, causes breaking.
          - This is because, right now, if I'm moving a direction, and I move the stick to the polar opposite of that direction, it's ambiguous if I'll turn left or right.  So instead, make the polar opposite of aiming (maybe a 30 degree wide range) cause breaking instead.
- [ ] Incidents (Make at least 10 or so incidents)
- [ ] 5 Missions - each tested thoroughly for smooth flow
  - [ ] Sub objectives in each mission, e.g. in the galaxy select
- [ ] Starter ships, unlockable, and loadout menu on mission select
- [ ] Basic breakroom dialogue
- [ ] Passive system fleshed out a bit, polished, stats actually effect game.  Datacores from Entropium.
- [ ] Planet merchants, trade blocks for other blocks, entropium, etc. unlockables
- [ ] Mission Debriefing Screen
- [ ] Demo End splash (List what's coming)
- [ ] Titlescreen polish / rework
- [ ] Laser polish, add heat seeking missles.

TUTORIAL TODOS:
  - [ ] Start with NO HUD visible
    - [ ] Introduce Radar
    - [ ] Introduce Health
    - [ ] Introduce Shields
    - [ ] Introduce Energy
    - [ ] Introduce Weapons
    - [ ] Introduce Movement
    - [ ] Introduce Block Placement
    - [ ] Introduce Block Upgrading
    - [ ] Introduce Block Refinement
    - [ ] Introduce Block Removal
    - [ ] Introduce Block Rotation

TODOS:
  - [ ] Evaluate king's bible CPU crunch logic. (HaloBlade)
  - [ ] Afterburner:
    - [ ] Add distinct visual effect to thrusters (change in color maybe?)
    - [ ] Add initial burst on toggle (light flash, particle emission)
    - [ ] Add intial burst sound effect
    - [ ] Add distinct sound effect when active
    - [ ] Add meter + consumable resource
  - [ ] Controller Support:
    - [ ] Menu: Ergonomically abstract button elements to be accessible via controller.
    - [ ] Expose indicators to buttons ergonomically that show the button binding with a button/key indicator
  - [ ] Create Galaxy Map
    - [x] 3D Planets
    - [x] Unlocked vs Locked
    - [x] Planet opens mission
    - [x] Cleanup bugs resolved:
      - [x] Going into mission, entitiesgl layer is messed up, not showing overlays
      - [x] Leaving mission and coming back to Galaxy map, rendering is static, messed up
    - [ ] Completed planets have some kind of indicator/mark
    - [ ] Basic description when hovered
    - [ ] Additional Descriptions when Selected
      - [ ] Boss portrait / mission portrait
      - [ ] Description box of objectives / Unlockables
      - [ ] Alternate mission arrows with a (. . . (.) . .) tab selector at bottom.
        - [ ] Clicking on the side Arrows < > toggles between mission variants for that Location
    - [ ] Multiple acts / views (change perspective for more planets)
    - [ ] Better background / CRT effect
    - [ ] Planet textures
  - [ ] Radar Enhancements
    - [ ] Hover over radar makes it opaque
    - [ ] Add animated "LOOK HERE!" Arrow indicators that can be triggered via event hub
  - [x] Transition to boss music on boss fight (Add boss music to the mission registry, wavespawner will play the mission boss music)
  - [x] BlockDropSelectionMenu Remaining Tasks:
    - [ ] Clicking on the UI indicator for the BlockDropSelectionMenu should open it
    - [ ] Be able to close the BlockDropSelectionMenu with ESC/Tab
    - [ ] Be able to upgrade block to the next tier by placing it on top of another block of the same type.
    - [x] Update tutorial to explain this menu, not the old shipbuilding menu
    - [x] Chat dialogue moves to right when shipbuilder is open
    - [x] Show little mini spinning preview of next block in queue
    - [x] If a block can't be autoplaced, play a notification sound, don't progress! (Blocks are getting lost)
    - [x] Show in HUD pulsing indicator when you have blocks in queue
    - [x] Add satisfying animation on placement (in the menu) and on refinement (in the menu)
    - [x] Add sound effect for refinement
  - [ ] Make a cockpit backend, each selectable ship will have their own cockpit weapon.
    - [ ] Move the default cockpit1 weapon to the cockpit backend
    - [ ] Make player cockpits specific: cockpitPlayer0, cockpitPlayer1, etc.
  - [x] Sound effect and visual effect on ship when switching firing modes
    - [x] Tutorialization of Firing Modes
    - [x] Switching firing mode should reset timers
  - [ ] Screen edge indicators (e.g. showing objectives on the map, minibosses, etc): compliments radar
  - [ ] Clearly give rewards on failure. E.g. Passive points:
      - Unlockables in each mission should be shown in the debriefing, and how close you got to each.
  - [x] Remove repairing - Instead, have green health drop pickups.  Constant repairing is a dark pattern.
    - [x] Pickups added to game
    - [x] Repair removed
  - [ ] Make enemy wave spawn notifications more gameified and obvious. Big warning center screen + sounds, blinking countdown, and perhaps notifications when wave spawner is paused, e.g. in an event.
  - [ ] Lots of Random Events things to discover in a run:
    - [ ] ADD Dialoge PAUSE functionality to the dialoguequeuemanager so that:
      When an event is triggered, it can show it's own dialogue, and then afterwards, resume the previous dialogue.
    - [ ] Random Events (e.g. Black Hole, Gravitational Anomaly, etc)
    - [ ] Enemy Spawner: When triggered, spawns a bunch of enemies, destroying it gives reward
    - [ ] Healing beacons : destroying it drops a bunch of HP
    - [ ] Treasure goblins - chase them and destroy them for reward.
    - [ ] Shrines - Provides a bonus / boon / or bane duration Buff
    - [ ] Planet interactions
    - [ ] Miniboss triggers
    - [ ] League mechanics? Such as: 
      - [ ] Time dilation field: Time moves faster in here, or slower?
      - [ ] Enemy spawner pod. Active until destroyed
      - [ ] Explosive fuel depot: Chain reactive destructibles for battlefield control
      - [ ] Turret emplacements: Defended stations with Loot cores
      - [ ] Contested Cache: Triggers escalating waves as you open it: Reward based on survival?
      - [ ] Entropy Spire: Pay entropium for XYZ bonus
      - [ ] Salvage Drone Convoy: Maybe marked on the map, or spawn announced. Escorted hauler with loot.
      - [ ] Ancient Data Vault: Requires collecting 3 keys scattered across the map?
      - [ ] Cursed cargo: Opening it spawns elite squad with mods.
      - [ ] Challenge Modifier Node: Choose a challenge mod for a bonus, e.g. 30% entropium gain.
      - [ ] Orbiting Debris Field (Many asteroids)
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
  - [ ] Improve initial mission tutorial:
    - [ ] Handle block rotation, refinement, autoplace, and place explicitly (Lock buttons if needed, give blocks if needed)
    - [ ] Handle incident interaction, e.g. where spending entropium is a thing. Maybe a merchant incident.
    - [ ] Make better first boss.
BUGS:
  - [ ] Enemy lights seem to "persist" beyond enemy death, seems to be caused by going away from window and coming back?
  - [x] CRITICAL: While Paused, particles continue to spawn at an alarming rate, causing intense FPS drop
  - [ ] Mission result menu does not scale with resolution
  - [ ] Planet Popping in and out of view when it's nearly offscreen but not completely
  - [x] Dialogue misaligned after tutorial at 1080p in Hub?? or was it 1440p? 
    - [x] Reproduced on new game. Dialogue was rolling out aligned right, not aligned left.
  - [x] Planets are different sizes and spatial coordinates in different resolutions when switching. I believe that the renderers need to re-cache the images.  Use onresolution change cb.
  - [x] Background is different size in different resolutions
  - [ ] Disabling Lighting in settings menu needs to clear lighting canvas
  - [ ] Enemy turrets aim toward mouse location.  Only player ship should do that, enemy turrets should aim where they are facing.
  - [x] If game is paused, wavespawner becomes misaligned.  Even though displayed timer countdown pauses and resumes correctly, actual time gets thrown off.
      E.g. if I pause on wave 1, wait a minute or so, then unpause, the waves won't spawn properly, in fact, if I pause for several minutes, and unpause, no waves spawn at all
      - [x] Test this fix, verify by pausing on map start (after first wave has spawned, and before), waiting like 3 minutes, then unpausing and verifying all waves spawn.
  - [x] Turret Firing Sound effect issue - redo logic of how turret SFX is played. Different turret timers causes only 1 sound to play
  - [x] Shield Rendering regression - No longer showing shield aura circles or highlighted blocks
  - [x] Turret firing: If a block is destroyed, the entire firing sequence is re-evaluated,
       This is potentially inefficient, but more imporantly, it resets your firing cooldown.
      So if you're having blocks destroyed while in combat, you might never be able to fire.
      Turret system needs to be re-evaluated.
  - [x] Significant performance degradation when destroying many blocks simultaneously. We need to batch this.
  - [x] Significant performance degradation when damaging a group of blocks with Explosive lance

### Things to Explore:
  - [ ] Remove passive points, have Entropium be unlock currency? Or keep passive points and use entropium for everything else?
  - [ ] Add autofire option?
  - [ ] Click to move functionality?
  - [x] Instead of just being able to build all blocks gated by Entropium.
    - [x] What about: Enemies just have a chance to drop blocks. In your ship builder menu, you can only build the blocks you have.  E.g. if you loot 3 green hulls, you can build 3 green hulls, and a 3 will be over that block in the menu.
    - [x] You can always build the low tier blocks.  This way, what weapons you get, would be kind of random each round.
        - [x] E.g. this allows for lots of different events, treasure goblin rewards, league mechnics in a map,
        convoys that you ambush, treasure chests, etc, that might contain nice blocks.
    - [x] Entropium now becomes a resource you would use for things in the meta game instead, passive unlocks,
      more upgrades, etc.
  - [x] Add autobuild option?

### Small Things:
  - [x] Turret shots vanish too fast, they should only vanish right at the end

## 📝 Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Start development server |
| `npm run build` | Build production version |
| `npm run preview` | Preview production build locally |
