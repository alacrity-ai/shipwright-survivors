# BOSS AI FSM:

🧠 Guiding Principles for Tomorrow
1. Modularity
States are discrete and swappable

FSM transitions remain declarative (controller.transitionTo('FlameSweep'))

All logic lives within named BossState_*.ts modules

2. Controlled Allocation
States may be allocated once per transition, but not per frame

Use a scratch context object (e.g., BossAIContext) passed to each update():

ts
Copy
Edit
state.update(dt, controller, context);
This context may cache:

Ship

Health

Player position

Derived targeting data

Avoids deep stack lookups across systems

3. GC Neutral Transition Graph
Pre-instantiate known states for the fight

Use a lightweight registry or prefilled state map:

ts
Copy
Edit
this.states = {
  Idle: new BossState_Idle(),
  FlameSweep: new BossState_FlameSweep(),
  ...
};
transitionTo(stateName: string) just swaps pointers

4. Declarative Boss Behavior
You’ll encode the entire fight logic (telegraphs, combos, transitions) inside FSM states

Emphasize readability and tuning ergonomics

📦 Tomorrow’s Deliverables
✅ BossAIController with:

currentState: BossState

transitionTo(stateName: string)

update(dt: number)

Scratch context injection

✅ At least 3 fully implemented states:

Idle – Passive

FlameSweep – Arc attack

MinefieldDeploy – Hazard logic

✅ Full FSM flow integrated into:

BossFactory (controller attached)

BossOrchestrator.activateAI()

✅ Fight script wired into Mission 1

✅ Defeat condition observable (e.g., await death hook)

✅ End-to-end boss battle, visually and functionally complete

