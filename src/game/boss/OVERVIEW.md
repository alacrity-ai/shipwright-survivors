🧠 High-Level Architectural Overview
At the apex of this subsystem lies a BossManager singleton—a centralized orchestrator for all boss-relevant logic during a mission. This includes spawning the boss ship, driving its combat FSM, triggering intro cutscenes, and interfacing with rendering and global systems.

The architecture is stratified into the following layers:

🔹 1. BossManager
📁 src/game/boss/BossManager.ts

Singleton lifecycle, created at mission entry.

Instantiates and wires:

The boss ship entity

Its AI controller

Its intro cutscene controller

Subscribes to mission-level events (e.g., mission:boss:start)

Lifecycle: initialize(), update(dt), destroy()

🔹 2. BossFactory
📁 src/game/boss/factories/BossFactory.ts

Loads and instantiates boss ships from JSON using loadShipFromJson(...)

Ensures faction, positioning, collision setup, etc.

Attaches a BossAIController (one-to-one per boss)

Returns the composite entity: { ship, aiController }

🔹 3. BossRegistry
📁 src/game/boss/registry/BossRegistry.ts

Centralized static registry of boss definitions, each comprising:

id: Unique string key

name: Human-readable name

shipJsonPath: Path under /assets/ships/boss/

initialState: Name of root FSM state (e.g., "Idle")

(Optional for future): Dialogue path, affix modifiers, difficulty tags

This enables declarative mission orchestration:

ts
Copy
Edit
BossRegistry.get('flame_lord'); // => BossDefinition
🔹 4. BossIntroCutsceneController
📁 src/game/boss/cutscenes/BossIntroCutsceneController.ts

Manages pre-combat boss entrances, including:

Screen focus, dialogue bursts

Dramatic pause / rotation / scaling

Shader shifts or music stingers

Triggered by BossManager immediately after boss spawn but before combat activation

🔹 5. BossAIController
📁 src/game/boss/ai/BossAIController.ts

Governs combat FSM execution for the boss

Injected with:

The boss Ship instance

The initialState string

Evaluates per update(dt)

Leverages the intent system to:

Rotate the ship

Fire weapons (either traditional or via scripted events)

Transitions between FSM states using timers, triggers, or health thresholds

🔹 6. FSM Scripts
📁 src/game/boss/ai/fsm/

Each file here is a single FSM state for a boss archetype. Implements:

ts
Copy
Edit
interface BossState {
  name: string;
  enter(controller: BossAIController): void;
  update(dt: number, controller: BossAIController): void;
  exit(controller: BossAIController): void;
}
States will:

Trigger group-based lighting effects

Activate attacks

Set up delayed transitions

Orchestrate "combos" or nested behaviors

🔹 7. Interfaces
📁 src/game/boss/interfaces/

Reusable interfaces for:

BossDefinition (used by registry)

BossSpawnContext

BossState

(Optional) BossPhaseMetadata, AffixModifiers

📦 Supporting Systems
loadShipFromJson(...) → core dependency of BossFactory, provides fully hydrated Ship instance.

GlobalEventBus → all orchestration (e.g., arena spawn → boss spawn → cutscene) flows through here.

IntentSystem → bridge from AI to ship movement and rotation.

