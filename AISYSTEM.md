✅ Current Intent System Overview
🧠 Concept
The Intent System decouples control logic (input or AI) from execution systems (like movement or weapons). Controllers formulate intents, which are then consumed by systems that act on them.

📦 Intent Interfaces
Located under src/core/intent/interfaces/:

MovementIntent:
Describes navigational intent.

ts
{
  thrustForward: boolean;
  brake: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
}
WeaponIntent:
Describes targeting and fire requests.

ts
{
  firePrimary: boolean;
  fireSecondary: boolean;
  aimAt: { x: number; y: number };
}
ShipIntent:
Composed of both:

ts
{
  movement: MovementIntent;
  weapons: WeaponIntent;
}
✅ How Controllers Work
🎮 PlayerControllerSystem
Captures real-time player input (keyboard and mouse).

Constructs a ShipIntent.

That intent is:

Passed to the MovementSystem via setIntent().

Passed to the WeaponSystem via setIntent().

→ Separation of decision and execution allows easy replacement of the input source (e.g. AI).

✅ How Execution Systems Consume Intents
🚀 MovementSystem
Reads movement from the ShipIntent.

Applies Newtonian physics for:

Thrust

Angular acceleration

Braking

Applies scaling via mass → accelScale

Internally stores the last intent via setIntent() → used on update(dt).

🔫 WeaponSystem
Reads weapons from the ShipIntent.

Maintains internal cooldown state per ship.

Decides when to fire turrets (round-robin, rate-limited).

Launches projectiles toward aimAt.

🧠 High-Level Plan for the AI System
🎯 Goal
Each AI ship will have its own AIControllerSystem, which maintains its state machine and produces a ShipIntent every frame.

🗂️ Structure
bash
src/systems/ai/
├── AIControllerSystem.ts        ← generates intent
├── states/
│   ├── BaseAIState.ts
│   ├── PatrolState.ts
│   ├── AttackState.ts
│   ├── FleeState.ts
│   └── IdleState.ts
🔄 Control Flow
For each AI-controlled ship:

AIControllerSystem holds a reference to the ship and its FSM (currentState).

On update(dt):

The FSM decides the ship's current goals.

A ShipIntent is synthesized based on those goals.

That intent is passed to MovementSystem and WeaponSystem.

FSM can transition states based on:

Proximity to enemy

Velocity magnitude

Distance from waypoint

Time in state

Combat status (under fire, HP level)

🤖 Example States
IdleState: do nothing, possibly rotate for scanning

PatrolState: move to waypoints

SeekTargetState: approach a known enemy

AttackState: try to stay in firing range while circling target

FleeState: break and disengage from combat if low HP

🧭 Movement Nuance
Because the physics is inertial:

AIs must reason in terms of acceleration, not position

Turning requires counter-rotation (damping angular velocity)

Oversteer must be compensated for — this is what differentiates naive AI from intelligent behavior

Likely to need a steering helper layer to convert high-level movement goals into low-level MovementIntent

🚧 Next Steps
Build AIControllerSystem scaffold that can own a ship and current state

Implement a minimal IdleState that outputs a neutral ShipIntent

Gradually build up smart movement:

E.g. SeekTargetState → face and approach target

Add predictive rotation braking logic

Once movement is sound, implement AttackState to utilize WeaponIntent
