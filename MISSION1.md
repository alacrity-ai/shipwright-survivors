# Mission 1 – High-Tempo Tutorial (Carrier Drop, Wingmen, Action-First)

This document outlines the full plan for the redesigned tutorial mission, which introduces all key mechanics **organically within action** rather than through long pauses. The player begins as part of a **four-ship squadron**, with three AI wingmen and a corporate AI assistant (“Carl”) providing guidance.


## Current Tasklist

# Mission 1 – Implementation Checklist

- [ ] **Create Wingman Characters**
  - [x] Define 3 wingmen profiles (names, archetypes, dialogue tone).
  - [x] Generate portraits for dialogue UI.
  - [ ] Write baseline chatter lines (intro, combat, regroup, boss).

- [ ] **Carrier & Cinematic Assets**
  - [x] Design carrier ship asset.
  - [ ] Implement deployment animation for player + wingmen.
  - [ ] Build a cinematic composite class to control camera, spawn choreography, and input locking.

- [ ] **Wingman AI**
  - [ ] Add `WingmanFollowState` to `AIController` FSM.
  - [ ] Add `WingmanAttackState` to `AIController` FSM.
  - [ ] Implement smooth formation offsets (3 slots around player).
  - [ ] Ensure afterburner catch-up and collision avoidance.
  - [ ] Limit wingman combat effectiveness so player remains central.

- [ ] **Coachmark Improvements**
  - [ ] Create `CoachMarkHelper` for composite hints (movement + firing in one call).
  - [ ] Add auto-clear behavior once input is detected.
  - [ ] Support radar/planet indicator arrows.

- [ ] **Quest & Rewards**
  - [ ] Add new `QuestRegistry` entry for planet distress call.
  - [ ] Configure quest rewards (3 hull blocks + 1 turret block).
  - [ ] Ensure quest flags integrate with mission progression cleanly.

- [ ] **Mission Script Rewrite**
  - [ ] Rebuild mission flow to follow new beat structure (carrier drop → wingmen → action-first).
  - [ ] Integrate coachmarks at appropriate beats (movement, firing, boost, zoom, radar, builder).
  - [ ] Insert wingman banter and Carl’s snark as pacing glue.
  - [ ] Script Entropium reward + powerup menu trigger after first wave.
  - [ ] Add planet interaction (comms + quest UI).
  - [ ] Sequence survival waves and Crazy Moe boss fight.
  - [ ] Ensure smooth transitions without long pauses.

- [ ] **Testing & Balancing**
  - [ ] Validate wingman AI state transitions (follow ↔ attack).
  - [ ] Confirm all tutorial mechanics trigger and dismiss correctly.
  - [ ] Check quest flags to avoid softlocks on death or skips.
  - [ ] Test pacing (total duration ~7 minutes with no dead-air).
  - [ ] Balance boss fight so wingmen assist but don’t trivialize it.


---

## 1. Mission Goals
- Introduce all core player mechanics:
  - Movement (WASD / left stick)
  - Firing weapons
  - Boosting (Shift / LB)
  - Zooming (mouse wheel / R-T / d-pad)
  - Minimap and radar (M / Tab)
  - Level-ups (Entropium + powerup menu)
  - Ship customization (block pickup and placement via Shipbuilder)
  - Planet interaction (communications + quest acceptance)
  - Boss fight (Crazy Moe)
- Maintain **continuous action and spectacle** (no long dead-air segments).
- Establish **squad dynamics** (three AI wingmen) and introduce Star Fox–style banter.

---

## 2. Mission Flow (Player Experience)
### **Beat 1 – Carrier Deployment (0:00–0:45)**
- Cinematic: Carrier ship arrives, camera pans.
- Player ship and three wingmen deploy with quick banter.
- A dozen weak enemy drones warp in immediately.
- **Tutorialized: Movement + Firing**
  - Composite coachmark: WASD + Fire icons.
  - Squad chatter encourages the player to maneuver and shoot.
  - Enemies are paper tigers (fragile, low damage).
- Player earns **just enough Entropium for a guaranteed level-up**.

### **Beat 2 – Level-Up (0:45–1:30)**
- Carl interrupts: “HQ likes winners. Here’s some Entropium—get yourself an upgrade.”
- Powerup menu opens automatically (tutorializes level-ups).
- No combat; squad orbits the player until selection is made.

### **Beat 3 – Distress Beacon (1:30–2:30)**
- A **distress signal** from a nearby planet interrupts.
- **Tutorialized: Minimap**
  - Planet location marked on minimap with an edge indicator.
  - Coachmark prompts radar usage (“Check radar (M/Tab) and fly to beacon!”).
- Player travels with wingmen; occasional stray drones spawn to keep tension.

### **Beat 4 – Planet & Shipbuilding (2:30–3:15)**
- Player hails planet (coachmark: “Open Comms (C / Gamepad Menu)”).
- Quest UI appears: accept a simple “salvage/escort” contract.
- Planet rewards **3 hull blocks + 1 turret block**.
- **Tutorialized: Shipbuilder**
  - Coachmark: “Open Shipbuilder (B) and Attach your new block.”
  - Squad banter (“Don’t bolt it on backwards, rookie.”).
  - Player attaches at least one block to progress.

### **Beat 5 – Boost & Zoom Training (3:15–3:45)**
- Sudden **ambush wave** appears.
- **Tutorialized: Boosting**
  - Coachmark: “Shift/LB to boost!” during an enemy strafing run.
- **Tutorialized: Camera Zoom**
  - Carl: “Adjust your viewport for tactical awareness.”
  - Coachmark for zoom controls.
- Enemies drop minor salvage as reward.

### **Beat 6 – Survival Waves (3:45–5:30)**
- Carl: “Salvage swarm inbound. Time to earn your keep.”
- **Wave Orchestrator** activates; escalating enemy waves with pickups enabled.
- Wingmen engage autonomously (following `WingmanAttackState` logic).
- Player can pick up salvage, blocks, and customize mid-fight.

### **Beat 7 – Boss Encounter (5:30–6:30)**
- Carl warns: “High-value hostile inbound. Survival odds: negligible.”
- **Crazy Moe** enters; taunts squad and player.
- UI fades for cinematic boss intro.
- Player and wingmen must defeat Moe.

### **Beat 8 – Conclusion (6:30–7:00)**
- Moe’s death quip.
- Carl acknowledges the player’s “contractor competency.”
- Rewards:
  - 5 passive points.
  - Salvage.
  - Unlocks for future missions.
- Squad flies back to the carrier for extraction.

---

## 3. Systems & Prep Work

### **3.1 Visual/Narrative Assets**
- **Wingmen**: Create 3 character profiles (names, archetypes, portraits).
- **Carrier Ship**: Build asset and deployment animation.
- **Dialogue/Chatter**: Write core quips (intro, combat, regroup, boss).

### **3.2 Wingman AI FSM (New States)**
- Extend `AIController` with:
  - `WingmanFollowState`:
    - Orbit or trailing slot formation relative to the player.
    - Soft leash (600–900 units); uses afterburner to catch up.
    - Avoids collisions.
    - Scans for `Faction.Enemy` targets passively.
  - `WingmanAttackState`:
    - Targets nearest enemy within range.
    - Uses existing `HunterAttackState` combat logic with a chase limit.
    - Returns to follow state when combat ends or player moves far.
- Spawn logic: Mission spawns 3 `Faction.Player` AI ships, each slotted to a unique formation offset.

### **3.3 Coachmarks**
- Create a `CoachMarkHelper` to display multiple control hints at once (movement + firing).
- Ensure coachmarks clear automatically once action is performed.
- Add subtle arrows for spatial cues (e.g., radar indicators).

### **3.4 Quest Hook**
- Create a simple `QuestRegistry` entry for the planet distress call.
- Reward: hull + turret blocks.
- Use quest flags to gate mission progression cleanly.

### **3.5 Cinematic Composite System**
- Implement a **stateful cinematic manager** for dialogue integration:
  - Controls camera pans, zoom, and tracking.
  - Spawns player and wingmen emerging from the carrier.
  - Disables and restores input as needed.
  - Exposes methods to dialogue scripts (`startCinematic()`, `endCinematic()`).

### **3.6 Mission Script**
- Rewrite as a `DialogueScript` with:
  - Wingmen deployment and chatter.
  - Integrated coachmarks at the right beats.
  - Continuous pacing (minimal pauses).
  - Hooks for level-up, planet quest, shipbuilder, and boss.

---

## 4. Implementation Order
1. **Wingman AI FSM** (states + integration).
2. **CoachMarkHelper** (composite hints + auto-clear).
3. **Carrier cinematic composite** (camera + spawn choreography).
4. **Quest entry** (planet interaction + rewards).
5. **Mission script rewrite** (dialogue + events).
6. **Chatter scripting for wingmen** (intro, combat, boss).

---

## 5. Testing Checklist
- Verify wingmen maintain proper formation and transition between follow/attack smoothly.
- Ensure coachmarks appear contextually and dismiss instantly when actions are performed.
- Validate quest flags prevent softlocks if the player dies mid-mission.
- Confirm pacing stays under ~7 minutes without dead-air segments.
- Test boss fight balance so wingmen assist but do not trivialize the encounter.

---
