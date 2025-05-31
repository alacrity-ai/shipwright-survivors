# 🚀 ShipForge: Space Survival

A block-based space survival game where you build ships, collect resources, and battle waves of enemies.

![Gameplay](gameplay.gif)

## 🎮 Game Overview

ShipForge combines the addictive wave-based combat of games like Vampire Survivors with deep ship customization and resource management:

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
  - [ ] Explosive Lance (Fire a fast lance that hits an enemy block, sticks in, then detonates)
  - [ ] Orbiting Blade (Blades orbit the player ship, dealing damage on contact to enemies)
  - [ ] Arc Conduit Emitter (Chain lightning)
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
  - [x] Technology Tree (Block Type Unlocks)
  - [ ] Passive Tree (Passive bonuses, e.g. Fins 10% more effective)
- [x] Boss encounters
- [ ] Environmental Events
  - [ ] Asteroids
  - [ ] Nebulae
  - [ ] Wormholes
  - [ ] Planets
  - [ ] Space Stations
  - [ ] "Treasure Goblins" (Ship which flees and has good drops)

TODOS:
  - [ ] Make crosshair easier to see, lightup when firing or targetting an enemy
BUGS:
  - [ ] Turret firing: If a block is destroyed, the entire firing sequence is re-evaluated,
       This is potentially inefficient, but more imporantly, it resets your firing cooldown.
      So if you're having blocks destroyed while in combat, you might never be able to fire.
      Turret system needs to be re-evaluated.

## 📝 Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Start development server |
| `npm run build` | Build production version |
| `npm run preview` | Preview production build locally |

