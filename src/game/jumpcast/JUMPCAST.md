## 📡 JumpCast Network — Fast-Travel Subsystem

### 1 ▸ High-Level Purpose

_Shipwright Survivors_ covers a 32 000 × 32 000 world. Traversing long distances in real time is tedious, so **JumpCast** provides **instantaneous, lore-consistent relocation** of the player’s ship by:

1. Remotely **disassembling** the vessel into its block blueprint.
    
2. **Streaming** the blueprint through a galaxy-wide quantum uplink lattice.
    
3. **Re-assembling** the ship at a destination “planet node”.
    

The mechanic integrates seamlessly with the block-construction fantasy, avoids canonical teleportation, and enforces a global cooldown to prevent abuse.

|Class|Location|Responsibility|
|---|---|---|
|**`JumpCastMenu`**|`src/game/jumpcast/JumpCastMenu.ts`|UI overlay: planet map, hover feedback, click-to-jump, Cancel button, slide-in intro animation.|
|**`JumpCastTransitionController`**|`src/game/jumpcast/JumpCastTransitionController.ts`|State machine orchestrating deconstruction ➜ fade-out ➜ world-transfer ➜ fade-in ➜ reconstruction, plus global cooldown and input gating.|


Other collaborators:

- `ShipConstructionAnimatorService` – handles block-level (de)construction VFX.
    
- `FadeManager` – screen fade utility.
    
- `PlanetSystem` – supplies planet positions & scales.
    
- `GlobalEventBus` – loose coupling via events (open/close menu, enable/disable jump, initiate jump).


3 ▸ UI Flow (`JumpCastMenu`)

```
graph TD
A(Open Event) --> B[Slide-In Animation]
B -->|0.3 s cubic| C[Open State]
C --> D{User Click}
D -->|Cancel| E(Close Menu)
D -->|Planet Icon| F(Emit initiate-jump)
F --> E

```

- **Spatial projection** – World coords are normalised into a square region inside the overlay window.
    
- **Hover feedback** – Enlarged icon + brighter glow.
    
- **Game-pad** – Planets registered as `NavPoint`s so virtual cursor snaps; Cancel button always present.
    
- **Animation** – Menu slides down from off-screen (`easeOutCubic`, 0.3 s). Input is ignored until fully open.

4 ▸ Transition Flow (`JumpCastTransitionController`)

```
stateDiagram-v2
  [*] --> Idle
  Idle --> Deconstructing: initiateJump()
  Deconstructing --> FadeOut: blocks hidden
  FadeOut --> Transferring: screen fully black
  Transferring --> FadeIn: teleportShip()
  FadeIn --> Reconstructing: fade complete
  Reconstructing --> Cooldown: ship rebuilt
  Cooldown --> Idle: 100 ms elapsed

```


### Key Details

|Phase|Duration|Notes|
|---|---|---|
|**Deconstructing**|~500 ms|Uses `ShipConstructionAnimatorService.animateShipDeconstruction`.|
|**FadeOut / FadeIn**|500 ms / 800 ms|Via `FadeManager`; non-blocking update loop.|
|**Transferring**|~0 ms|Sets ship transform; calls `purgeNonPlayerShips()` so the environment reseeds near new position.|
|**Reconstructing**|~500 ms|Mirror of deconstruction animation.|
|**Cooldown**|100 ms (config)|Soft guard; can be increased for balancing.|

Input is disabled between Deconstructing → Reconstructing and re-enabled afterwards.


### 5 ▸ Event Contract

|Event|Payload|Emitted by / Consumed by|
|---|---|---|
|`jumpcast:menu:open`|—|Planet interaction menu triggers it.|
|`jumpcast:initiate-jump`|`{ x, y }`|(optional) Alternative initiation path.|
|`planet:interaction:options:disable-jump`|—|Tutorial or cooldown gating.|
|`planet:interaction:options:enable-jump`|—|Re-enables fast travel.|


### 6 ▸ Integration Steps

1. **Instantiate** once at runtime:
```
const jumpCastTransition = new JumpCastTransitionController(input, shipAnimator);
const jumpCastMenu       = new JumpCastMenu(input, planetSystem, jumpCastTransition);

```
- **Hook editor / planet UI** to emit `jumpcast:menu:open` when the player selects **JumpCast Network**.
    
- **Call** `jumpCastTransition.update(dt)` in the main update loop and `render()` in the overlay pass.
    
- **Destroy** both objects on scene unload to unregister EventBus listeners.

### 7 ▸ Tuning Knobs

|Constant|File|Effect|
|---|---|---|
|`SLIDE_DURATION`, `SLIDE_EASE_POWER`|`JumpCastMenu.ts`|Menu intro feel.|
|`PLANET_ICON_MIN_PX`|`JumpCastMenu.ts`|Smallest icon size on map.|
|`WORLD_RADIUS_THRESHOLD`|`hitTestPlanet()`|Click radius tolerance.|
|`cooldownMs`|`JumpCastTransitionController.ts`|Global jump cooldown.|
|De/Construction durations|`ShipConstructionAnimatorService`|Animation pacing.|

### 8 ▸ Extensibility

- **Additional fast-travel endpoints** – emit `jumpcast:initiate-jump` with `{x, y}` and reuse controller.
    
- **Mid-mission scripting** – pause gameplay, open menu, or auto-jump via event.
    
- **Planet metadata** – overlay text or resource costs can be rendered next to icons.
    
- **Dynamic cooldown** – scale `cooldownMs` based on distance or player upgrades.
