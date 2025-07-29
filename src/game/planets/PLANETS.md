# Planet System Documentation

The **planet system** governs all non-player celestial bodies (planets, suns, or other interactable space objects) in _Shipwright Survivors_.  
It encapsulates **data definitions**, **registration**, **instantiation**, **rendering**, and **interaction logic** across multiple subsystems.

---

## Overview

Planets in the game are **data-driven entities** defined via `PlanetDefinition` objects and instantiated dynamically based on **mission configuration** (`MissionDefinition.planets`).  
The system is designed with the following responsibilities:

1. **Data Modeling** – Planets are described using `PlanetDefinition` files (image asset, scale, dialogue, quests, etc.).
    
2. **Registration & Lookup** – All planet definitions are registered in `PlanetRegistry`.
    
3. **Instantiation** – `PlanetFactory` and `PlanetSystem` create and manage `PlanetController` instances for active missions.
    
4. **Rendering** –
    
    - Background/world rendering via `PlanetPass` (WebGL2).
        
    - Overlay/UI rendering (interaction rings, labels, dialogue) via `PlanetOverlayRenderer` and `PlanetController`.
        
5. **Player Interaction** – Supports dialogue, trade post menus, quest triggers, and mission progression.


### File Structure

```
src/game/planets/
├── PlanetController.ts             # Per-planet logic (interaction, overlay)
├── PlanetFactory.ts                # Factory for creating PlanetController instances
├── PlanetInteractionOptionsMenu.ts # Menu invoked for trade-enabled planets
├── PlanetOverlayRenderer.ts        # Handles visual overlays (interaction rings, highlights)
├── PlanetRegistry.ts               # Global registry of all planet definitions
├── PlanetSystem.ts                 # System managing all active planets for a mission
├── definitions/                    # Individual planet definitions (data-driven)
│   ├── planet_Arsea.ts
│   ├── planet_Deimos.ts
│   ├── planet_Ferrust.ts
│   ├── planet_Gilipe.ts
│   ├── planet_Selk.ts
│   ├── planet_Suns.ts              # Definitions for sun/star variants
│   └── planet_Voidia.ts
└── interfaces/
    └── PlanetDefinition.ts         # TypeScript interface for planet definitions

```

In addition, the **rendering pipeline** for planets resides in:

```
src/rendering/unified/passes/PlanetPass.ts
src/rendering/unified/shaders/planetPass.vert
src/rendering/unified/shaders/planetPass.frag

```


## Data Model

### `PlanetDefinition`

Each planet is defined by a TypeScript object conforming to `PlanetDefinition`:

```
export interface PlanetDefinition {
  name: string;                  // Unique identifier (used as registry key)
  imagePath: string;             // Path to sprite or texture
  scale: number;                 // Render scale multiplier (1.0 = native texture size)
  interactionDialogueId: string; // Dialogue triggered on interaction (if no trade post)
  approachDialogueId?: string;   // Optional dialogue when first approaching
  tradePostId?: string;          // Optional trade post associated with planet
  questIds?: string[];           // Optional quest IDs triggered or available here
}

```

Example (`planet_Arsea.ts`):

```
export const ArseaPlanet: PlanetDefinition = {
  name: 'Arsea',
  imagePath: 'assets/planets/7.png',
  scale: 8,
  interactionDialogueId: 'planet-generic',
  tradePostId: 'mission2-tradepost-0',
  questIds: ['ability:rollblocks', 'ability:combineblocks'],
};

```


These definitions are **static** and imported by `PlanetRegistry`.

---

## Registry

`PlanetRegistry` serves as the **canonical repository** of all planet definitions.

- Validates uniqueness by `name`.
    
- Provides `getPlanetByName(name)` and `getAll()` for lookup.
    
- Is the single source for instantiating planets via `PlanetFactory` or `PlanetSystem`.
    

---

## Instantiation Flow

Planets are **spawned per mission** based on the mission’s `planets` field (`MissionDefinition.planets`).  
For example, in `mission_002`:

```
planets: [
  { name: 'Selk', x: 0, y: 0 },
  { name: 'Ferrust', x: -22600, y: 31000 },
  { name: 'Gilipe', x: 30400, y: -12000 },
  { name: 'Arsea', x: 10000, y: -20000 },
  { name: 'Deimos', x: -12000, y: -24000 }
]

```

During mission initialization:

1. `PlanetSystem.registerPlanetsFromConfigs()` iterates over these configs.
    
2. For each, `PlanetFactory.createPlanetByName()` constructs a `PlanetController`.
    
3. Each planet is registered with the **UnifiedSceneRendererGL** via `PlanetPass.addPlanet()`, allowing GPU-based rendering.
    
4. The planet is stored in the `PlanetSystem`’s internal `Set<PlanetController>` for lifecycle and interaction updates.
    

---

## PlanetController

Each planet is governed by a `PlanetController`, responsible for:

- **Tracking position and scale**.
    
- **Calculating proximity ranges** (drawing range, transmission range, interaction range) relative to the player.
    
- **Handling interaction events**:
    
    - Opening a `PlanetInteractionOptionsMenu` if a `tradePostId` is present.
        
    - Triggering dialogue via `DialogueQueueManager` otherwise.
        
    - Marking the planet as “visited” via `PlayerFlagManager`.
        
    - Progressing quests (e.g., `planetsExplored`).
        
- **Delegating overlay rendering** (e.g., atmosphere glow, name label) to `PlanetOverlayRenderer`.
    
- **Forwarding rendering and dialogue updates** each frame.
    

It performs **distance-based state gating** so distant planets don’t trigger interactions or unnecessary draws.

---

## PlanetSystem

The `PlanetSystem` manages the **lifecycle of all active planets** in a mission:

- Holds a `Set<PlanetController>`.
    
- Registers new planets via `registerPlanetByName()` or `registerPlanet()`.
    
- Integrates planets with the rendering pipeline by calling `unifiedRenderer.addPlanet()`.
    
- Updates all `PlanetController`s each frame (proximity, dialogue, interaction).
    
- Delegates overlay rendering (UI layers) via `PlanetController.render()`.
    
- Provides `getPlanets()` for external queries.
    
- Can be reset (`clear()`) between missions.
    

---

## Rendering

Planet rendering is **split into two domains**:

### 1. **World Rendering (WebGL2)**

Handled by `PlanetPass`, part of the `UnifiedSceneRendererGL`:

- Draws planet sprites in **world space** relative to the camera.
    
- Uses **batched quad rendering** and NDC transforms.
    
- Performs **visibility culling** using `isVisible()` to avoid off-screen draws.
    
- Maintains a **texture cache** (lazy-loaded from `imagePath`).
    

### 2. **Overlay/UI Rendering (Canvas 2D)**

Handled by `PlanetOverlayRenderer` (invoked by `PlanetController`):

- Draws **interaction indicators** (e.g., rings for approach/interact).
    
- Draws **labels or atmosphere effects**.
    
- Renders **dialogue boxes** (via `DialogueQueueManager`) when interaction occurs.
    

This dual-pipeline design keeps **background planets performant** while still allowing **rich UI overlays** when the player engages.

---

## Interaction Flow

1. Player enters **interaction range** (¼ of the planet’s base radius).
    
2. Pressing `KeyC` or the gamepad "select" alias:
    
    - If the planet has a `tradePostId`:
        
        - Plays activation sound.
            
        - Sets a player flag marking it as visited.
            
        - Triggers any associated quest completions (e.g., `planetsExplored`).
            
        - Opens the `PlanetInteractionOptionsMenu`.
            
    - Otherwise:
        
        - Starts the configured dialogue script (`interactionDialogueId`) via `DialogueQueueManager`.
            

While interaction is active:

- The dialogue system updates each frame.
    
- Mouse clicks advance or skip lines.
    
- Overlay visuals (highlight, dialogue) render in sync.
    

---

## Adding a New Planet

To introduce a new planet:

1. **Create a definition** in `src/game/planets/definitions/planet_<Name>.ts`:

```
import type { PlanetDefinition } from '../interfaces/PlanetDefinition';

export const MyNewPlanet: PlanetDefinition = {
  name: 'MyNewPlanet',
  imagePath: 'assets/planets/custom.png',
  scale: 10,
  interactionDialogueId: 'planet-custom',
  tradePostId: 'custom-tradepost', // optional
  questIds: ['quest-id-1', 'quest-id-2'], // optional
};

```

2. **Register it** in `PlanetRegistry.ts`:

```
import { MyNewPlanet } from './definitions/planet_MyNewPlanet';
registerPlanet(MyNewPlanet);

```

3. **Include it in a mission** in `MissionRegistry.ts`:

```
planets: [
  { name: 'MyNewPlanet', x: 5000, y: -8000 }
]

```

The system will automatically:

- Load the texture.
    
- Render it in the background.
    
- Handle interaction and dialogue.
    

---

## Key Design Principles

- **Data-driven extensibility** – Adding planets requires no engine changes, only new definitions and registry inclusion.
    
- **Separation of Concerns** – World rendering (`PlanetPass`) is GPU-optimized; interaction and overlays remain on CPU/UI layers.
    
- **Lazy Loading** – Textures are loaded asynchronously and cached to minimize stalls.
    
- **Performance** – Distance-based range checks and visibility culling prevent unnecessary updates or draws.
    
- **Interoperability** – Integrated with `MissionDialogueManager`, `PlayerFlagManager`, `QuestReporter`, and the unified rendering system.
