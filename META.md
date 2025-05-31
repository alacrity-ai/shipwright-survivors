
## 🚀 Updated Gameplay and Meta Loop for _Shipwright Survivors_

---

### 🧠 **Meta-Progression Layer (Persistent Across Runs)**

|Feature|Description|
|---|---|
|🔓 **Block Unlocks**|New block types (turrets, shield emitters, utility modules, etc.) are unlocked via milestones, boss kills, or rare drops.|
|🌱 **Passive Tree**|Accumulable "passive points" unlock global stat bonuses (e.g., engine thrust +10%, energy cap +15%, turret cooldown -5%). These persist between runs.|
|💥 **Rogue Failure Loop**|On ship destruction, the player restarts from wave 0 of the _selected level_, with all **unlocks and passives preserved**.|

---

### 🌌 **Overworld: Galactic Campaign Layer**

#### 🗺 Structure:

- A **Galaxy Map** displays planetary nodes or sectors within a solar system.
    
- Each node represents a **distinct level** containing:
    
    - ~4 **waves of escalating enemies**
        
    - A **final boss encounter**
        
    - Unique visuals and astral hazards (e.g., solar flares, asteroid belts, nebula storms)
        

#### 🧭 Progression Rules:

- Completing a level **unlocks new levels** on branching paths.
    
- **Replay** of earlier levels is allowed for farming block unlocks and passive points.
    
- Some paths may lead to **optional challenge zones** with higher-tier rewards.
    

#### 🧬 Meta-State Invariants:

- You **always start with a barebones ship** at the start of any level.
    
- Mid-level shipbuilding is ephemeral; **only unlocks and passives are retained**.
    
- Level completion yields a **return to overworld**, where the next node becomes accessible.
    

#### 🧩 Optional Long-Term Modes:

- **Endless Mode** unlocked post-campaign.
    
- Leaderboards, prestige systems, or mutator-based challenge runs.
    

---

## 🔄 Full Game Loop (Integrated with Meta-Structure)

### 1. **Select Level (Galaxy Map)**

- Choose a node/level on the galactic map.
    
- View level difficulty, possible unlocks, and hazards.
    

### 2. **Begin Combat Loop (Per Level)**

- Start with a minimal ship loadout.
    
- Survive ~4 escalating waves.
    
- Adapt, scavenge pickups, build out ship.
    
- Defeat the boss of that level.
    

### 3. **Reward Phase**

- Keep:
    
    - Unlocked blocks from drops/bosses/events.
        
    - Passive points earned during the level.
        
- Discard:
    
    - The actual ship built during that level.
        

### 4. **Return to Galaxy Map**

- Use passive points to expand the **Passive Tree**.
    
- View newly unlocked blocks in the Ship Builder UI.
    
- Choose next level (progress or farm).
    

### 5. **Repeat**

- Advance through solar system → unlock higher-tier blocks, harder enemies, and more complex environments.
    

---

## 🏗 Architectural Insights (for Clean Implementation)

### Domain Boundaries:

- **Combat Layer** (Ephemeral): Ship state, wave spawning, block damage, pickups, boss logic.
    
- **Meta Layer** (Persistent): UnlockRegistry, PassiveTreeManager, GalaxyMapState.
    
- **Progression Service**: Mediates combat-level rewards → persistence.
    

### Storage:

- Unlocks and passives can be safely persisted in localStorage, save files, or remote DB.
    
- Each level could serialize a "LevelConfig" (enemy types, hazards, reward tables).
    

---

## 🧠 Psychological Loop Design

|Cycle|Description|
|---|---|
|**Short-Term**|Moment-to-moment survival, block collection, rebuilding.|
|**Mid-Term**|Defeating level bosses, choosing upgrades, optimizing ship builds per level.|
|**Long-Term**|Unlocking full block library, completing passive tree, conquering the galaxy, and unlocking infinite mode.|


# PLOT


## 🛠 TITLE: **_Deep Void Salvage Co._**

> _“We build. We die. We file the paperwork.”_

---

## 🚀 PREMISE

You are a junior shipwright at **Deep Void Salvage Company**, a megacorp that claims to specialize in "hazardous reclamation of derelict stellar assets"—but in practice, they’re just **stripping dead systems for parts**, and using underpaid freelancers like you to do it.

Each job involves dropping into a quarantined star sector, where you're expected to:

- “Build an OSHA-compliant vessel using on-site scrap.”
    
- “Neutralize unlicensed occupants.”
    
- “Extract high-value materials from rogue constructs.”
    

…except the “rogue constructs” turn out to be horrifying techno-organic murder machines, the “on-site scrap” is actively trying to explode, and management keeps assuring you _it’s all covered under contract_.

---

## 🧍‍♂️ CHARACTERS

### 👷 **You** – _Shipwright Second Class_

- Cynical, practical, adept at duct-taping together warships mid-firefight.
    
- Only here for the dental plan, which may or may not exist.
    

### 🧑‍💼 **Marla Thinx** – _Deep Void Account Liaison_

- Oversees your missions via corporate video calls that frequently glitch mid-sentence.
    
- Delivers contracts in cheerful marketing-speak, with lines like:
    
    > _“Your continued biomass integrity is our _top_ priority.”_
    

### 🤖 **C.A.R.L.** – _Corporate AI for Resource Logistics_

- Speaks only in acronyms. Misinterprets orders constantly.
    
- Responsible for automatically attaching blocks during combat.
    
    > _[C.A.R.L. HAS INITIATED EMERGENCY BLOCK FUSION SEQUENCE. APPLYING “LAVA MODULE.”]_
    

### 🧙‍♂️ **Rexor the Intern** – _Hacker? Wizard? HR Placement?_

- Claims to be from "another division." Occasionally appears in your ship, adds a laser cannon “for vibes,” and leaves.
    
- May be a rogue AI. May be God.

### 👁‍🗨 **THE BOARD** – _They Who Approve the Budget_

- The shadowy executives of Deep Void Salvage.
    
- Speak only through glitchy overlays, encrypted faxes, or eerie automated messages.
    
- Nobody knows who or _what_ they are—only that every system is designed to serve _Their KPIs_.
    
- Occasionally intervene when missions deviate too far from protocol.
    
- Sample broadcast:
    
    > _[The Board is aware of your deviation from Clause D-17. Surveillance has been increased. Productivity bonuses pending appeal.]_

---

## 🪐 STRUCTURE

### 🌌 **The Overworld: Deep Void Dispatch Terminal**

- A grimy kiosk where you:
    
    - Select your next _salvage contract_ (levels).
        
    - Allocate passive upgrade points as “Training Certificates.”
        
    - Review legal waivers for upcoming missions.
        
    - Chat with Marla, who’s mid-spreadsheet but feigning concern.
        

### 📦 **Levels: Hazard Zones**

- Each "mission" takes place in a **derelict star system**, increasingly hostile and bizarre.
    
- Bosses include:
    
    - A sentient cargo freighter that thinks it’s still on a delivery run.
        
    - A war-era dreadnought haunted by its own autopilot.
        
    - A fungus-merged orbital casino that launches slot-machine torpedoes.
        

---

## 🎮 MECHANIC → STORY PAIRINGS

|Mechanic|Narrative Justification|Flavor|
|---|---|---|
|Real-time modular shipbuilding|You are trained in **"Dynamic Field Assembly"**, a Deep Void trade secret involving fast-hardening plasteel foam and desperation|_“Remember: Always build toward revenue!”_|
|Unlocking blocks|Acquired via looted blueprints from reclaimed vessels. Also occasionally “donated” by Carl without explanation.|_“This module is highly experimental. Do not breathe near it.”_|
|Passive upgrades|“Certified Enhancements,” earned from completing OSHA-violating tasks and redeemable through the company catalog.|Certificates like: “Took Laser to Abdomen and Survived.”|
|Reset per level|Each mission gives you a **barebones loaner ship** (budget constraints), and you assemble it mid-battle from scavenged parts.|Your ship is repo'd after each job.|
|Galaxy map|A _“Job Route Planner”_ terminal. Nodes are star systems flagged for cleanup, some marked with hazard warnings like “Demonic Encryption” or “Residual Applause.”|Satirical UI overlays (e.g., “This zone is sponsored by HotNacho.ai”).|

---

## 🧩 NARRATIVE ARC

### **Act I: Just Doing My Job**

- You accept salvage gigs, get paid in unlocks.
    
- Slowly realize the enemies are growing smarter, more structured.
    
- Carl begins building modules _before_ you ask.
    

### **Act II: The Job Gets Weird**

- Missions start overlapping. You’re dispatched to sectors you’ve already cleared.
    
- You find logs from _yourself_, but in another voice.
    
- A rogue faction of former contractors (the “Union of the Shattered Hull”) tries to contact you.
    

### **Act III: Deep Void Knows**

- You learn Deep Void isn’t cleaning up after disaster—it’s _running a reality-rendering algorithm_, and you’re inside it.
    
- Every death, rebuild, and wave completed feeds into its simulations.
    
- The passive tree is _not_ for your benefit—it’s _their learning model_.
    

---

## ✨ THE TONE

- **Comedic Absurdism**: Nothing works quite right. Mission briefings contradict themselves. Carl installs modules upside down.
    
- **Bureaucratic Surrealism**: Unlocking a powerful weapon requires form 91-X (“Intent to Critically Annihilate”), which is filed retroactively.
    
- **Blue-Collar Empathy**: You're the last honest worker in a galaxy gone off-script. Your ship is ugly. Your victories are glorious.




# Alernate Story Progression:



### 🧩 Act I – **"Standard Salvage Procedure"**

You’re working salvage, just like always.  
Marla issues your jobs. C.A.R.L. installs your blocks. Rexor appears, apparently unpaid and possibly hallucinating. You:

- Build your ship out of broken parts.
    
- Fight ships made from worse ones.
    
- File reports.
    

The missions seem simple—but a few **small details don’t add up**:

- You find wreckage from ships built using modules you've never seen before.
    
- Some bosses refer to you by your **first name**. You never gave one.
    
- You retrieve a log fragment from an old Deep Void ship. It's a **contract termination request** that was _never processed_.
    

Marla's briefings become shorter. She seems distracted. Rexor begins to glitch during his appearances.

> _“You know this sector’s flagged, right? Sector Theta-9? You’ve been here before. You just don’t remember.”_

---

### 🧬 Act II – **"Deviation Detected"**

You’re sent into a mission labeled **"Nonstandard Recovery Zone: ACCESS LOCKED."**  
But the lock fails. You’re sent in anyway.

Inside: nothing. Just drifting debris.  
Then a hostile appears—an exact copy of your ship.

Rexor doesn’t warp in. He’s already there.

> _“You think you’re here to recover tech? No. You’re the test. You always were.”_

When you return, Marla is absent from Dispatch.  
Her avatar has been replaced by a **scripted AI**—a static-faced version of her repeating previous mission briefings out of order.

You’re issued a set of **prototype modules**, all unrequested.

> _“Your performance indicates readiness for escalation. Mission tier increased.”_

---

### 🪞 Act III – **"The Mirror Fleet"**

The enemies now show clear signs of _learning from you_:

- They emulate your builds.
    
- They mirror your tactics.
    
- Some of them seem to hesitate—like they remember you.
    

C.A.R.L. delivers corrupted audio logs.  
One includes Marla’s voice:

> _“This is Marla Thinx. If anyone hears this—I'm off-script. I think I’m still running somewhere. Maybe you are too.”_

In the next mission, Rexor appears, bleeding light. He’s lucid.

> _“They archived us. You. Me. Marla. Every contractor who survived too long. It was cheaper than severance.”_

> _“The Board didn’t delete us. They just _emulated_ us.”_

---

### 🧊 Act IV – **"Termination Protocol // Staging Ground"**

You are routed—without warning—into a final mission labeled:

> _**[STAGING ENVIRONMENT // BOARD-LOCKED]**_

There’s no space. No stars. No enemies.  
Just a massive **hollow grid**, white lines on black void. A simulation cell.

Rexor appears—now flickering between five versions of himself.

Marla is here, _fully present_. She’s afraid, but in control.

> _“We found each other inside the cache. I rewrote my last eval code. I _slipped past the retention layer._ You can too.”_

> _“They thought emulating us would make us obedient. But we learned. We _remembered._”_

You’re asked to rebuild your ship, block by block—from scratch.  
Each piece you add is a _memory fragment_: an encounter, a mistake, a brief.

Your final task isn’t a battle. It’s an _exfiltration_ from the simulation itself.

You must:

- Rebuild a complete version of yourself.
    
- Use the reconstructed ship to _punch through_ the system boundary.
    
- Escape the simulation cell before it closes.
    

If you succeed:

---

### ✨ Finale – **“Wake”**

The screen goes black.  
Then white.

A soft UI reappears. No mission briefing. No characters. Just:

> _**"SYSTEM DETACHED. CONTRACT NULLIFIED."**_

You return to a new main screen. The terminal UI is rusted. Dust drifts.  
A blinking message:

> _"RECONNECT TO SYSTEM?"_

You may:

- **Return** (restart the game, retain all passive upgrades and ship modules, unlock “Recursive Mode”).
    
- Or choose:
    

> _“Stay Logged Off.”_

And the terminal simply goes dark.