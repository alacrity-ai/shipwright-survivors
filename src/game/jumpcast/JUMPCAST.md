📡 JumpCast Network — Fast Travel System Specification
Overview
The JumpCast Network introduces a lore-consistent fast travel system across the expanded planetary map in Shipwright Survivors. It replaces the direct transition into the Trade Post with a new interaction menu per planet, offering both trading and interplanetary relocation capabilities. The system is themed around remote disassembly and reconstruction of block-based ships via a distributed quantum uplink network.

Entry Point: Planet Interaction Menu
Upon interacting with a planet, the user is presented with a new binary menu:

Trade Post — opens the existing trade interface.

JumpCast Network — initiates the interplanetary fast travel UI.

JumpCastMenu UI
A semi-opaque overlay window is displayed.

Planet icons are rendered in relative positions (mirroring the MiniMap’s spatial projection logic).

A Cancel button is available at the bottom (clickable or (B) on gamepad).

Clicking a planet icon initiates a fast travel operation to the target planet.

Fast Travel Transition Sequence
On planet selection, the following procedural steps are triggered:

Menu closes; user input is locked.

Ship deconstruction animation plays (reverse of the ship construction sequence).

Global screen fade-out is initiated via FadeManager.

Ship's transform is updated to the destination planet’s coordinates.

Camera position is synchronized with the new ship location.

Global fade-in is initiated.

Ship reconstruction animation plays (standard construction sequence).

Player input is restored once construction completes.

Implementation Considerations
A modular transition controller will encapsulate steps 2–8 for reusability across future teleportation scenarios (e.g. scripted teleport events, town portal analogs).

A global cooldown timer (~20 seconds, configurable) will throttle JumpCast usage to prevent abuse or degenerate usage patterns.

Game state persistence and event hooks (e.g. planet arrival events, ambient audio transitions) must be respected within this transition flow.

Naming and Lore Justification
JumpCast refers to the act of digitally transmitting a ship’s modular blueprint through a galactic uplink lattice and reassembling it at a destination node using pre-fabrication facilities embedded in each planet’s infrastructure. This positions fast travel not as spatial teleportation but as quantum-accurate modular replication of block-based constructs.



Instantiate Core Services in Runtime

Create a single JumpCastTransitionController, injecting the ShipConstructionAnimatorService, InputManager, FadeManager, and any camera reference.

Instantiate JumpCastMenuController, passing it the PlanetSystem, the above transitionController, and the same InputManager.

JumpCastMenuUI

Render a semi-opaque window with planet icons positioned via the existing MiniMap projection math.

Display a bottom “Cancel / (B)” button.

Expose hit-testing helpers for planet icons and the cancel button.

JumpCastMenuController

Maintain internal state flags: isOpen, selectedPlanet, and a cool-down timer (e.g., remainingCooldownMs).

Update loop responsibilities:

Decrement remainingCooldownMs by dt.

Generate / update game-pad nav-map nodes (planet icons + cancel).

On planet click or nav selection, call canTeleport() (true when remainingCooldownMs ≤ 0). If allowed, invoke transitionController.beginJumpCast(target) and reset the cool-down.

Handle (B) or cancel click to close the menu.

Provide canTeleport() as a lightweight gate for UI and hotkey logic.

ShipConstructionAnimatorService Enhancements

Add a symmetric deconstruction routine mirroring the existing construction animation.

JumpCastTransitionController

Coordinate the full fade / deconstruct / move / reconstruct / fade-in pipeline.

Lock and unlock input via the injected InputManager.

Ensure the FadeManager.update() and .render() are invoked from within the game loop.

Game Loop Integration

Each frame: jumpCastMenuController.update(dt), jumpCastTransitionController.update(dt), and the respective render() calls plus FadeManager.render().

Cooldown UX Signaling

Grey-out or pulse planet icons when !canTeleport() and consider a subtle “JumpCast cooling-down” tooltip.

Expose remaining seconds (rounded) for potential overlay display.

Interfaces & Type Contracts

Centralize shared types (planet hit-target, nav-node schema, cooldown constants) in src/game/jumpcast/interfaces.

