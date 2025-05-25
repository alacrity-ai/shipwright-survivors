## 🚀 Simple Phaser-React Space Game

This is a **minimal space game prototype** built with:

- **Phaser 3.60+** for rendering & game logic.
    
- **React + Vite + TypeScript** for project structure and future mobile porting.

1) Install dependencies: `npm install`
2) Start the dev server: `npm run dev`
3) Open in browser: `http://localhost:5173`

## 🧩 Project Structure (Simplified)

```
src/
├── components/   // React UI components
├── game/         // Game-specific code (scenes, objects, effects, input)
├── shared/       // Cross-cutting helpers & bootstraps
├── assets/       // (Optional) Dev-only assets
├── main.tsx      // React entrypoint

```

## 🕹️ How It Works (High Level)

- The game runs in a **Phaser canvas** rendered via React.
    
- Core game logic is modular:
    
    - **Scenes** manage lifecycle.
        
    - **Objects** represent entities (e.g., PlayerShip).
        
    - **Effects** handle visuals (e.g., particles, starfield).
        
    - **InputManager** abstracts mouse/keyboard state.
        
- A **starfield parallax effect** simulates space movement.
    
- The ship **aims at the mouse**, with thrust particles & easing.
    
- UI can be extended using React components (e.g., overlays, HUD).
    

---

## ➕ How to Add Features

1. **New game objects** ➔ Add to `src/game/objects/`.
    
2. **Visual effects** ➔ Add to `src/game/effects/`.
    
3. **Global systems (audio, save data, etc.)** ➔ Add to `src/game/systems/`.
    
4. **Shared helpers** ➔ Place in `src/shared/` under relevant subfolder.
    
5. **UI overlays** ➔ Extend in `src/components/`.
    

For new Phaser scenes, add to `src/game/scenes/` and register in `Game.ts`.

## Commands

|Command|Action|
|---|---|
|`npm run dev`|Start development server|
|`npm run build`|Build production version|
|`npm run preview`|Preview production build locally|