# GDD

# 📘 _Shipwright Survivors_

## Game Design Document – Core Gameplay Loop & Progression Economy

**Version**: Final – June 2025

---

## 🎯 **Game Pillars**

- **Modular Ship Combat**: Construct and evolve a dynamic ship in real-time using block pickups during combat.
    
- **Meaningful Choices**: Strategic building and refining decisions define both immediate survival and long-term progression.
    
- **Run-Based Variability**: Incidents, randomized waves, and unlockable starter ships create unique run structures.
    
- **Persistent Unlocks**: Artifacts, passive upgrades, and starter ships form the backbone of meta progression, unified through in-mission discovery.
    

---

## 🔄 **Core Gameplay Loop**

### 1. **Hub Phase**

- Select a **starter ship**
    
- Equip up to **2 artifacts**
    
- Spend **Data Cores** on:
    
    - Unlocking artifacts
        
    - Unlocking starter ships
        
    - Purchasing permanent passive upgrades
        
- Choose a mission from the **Galaxy Map**
    

---

### 2. **Mission Phase**

#### 🔹 Combat

- Fight enemy **waves**
    
- Enemies drop:
    
    - **Blocks** (automatically queued)
        
    - **Entropium** (temporary, run-only currency)
        
    - **Repair Orbs** (restore % HP of damaged blocks)
        

#### 🔹 Building

- Press **TAB** to open the **Block Drop Decision Menu**
    
    - Game **pauses**
        
    - View one queued block at a time
        
        - **Place** it manually or with autoplace
            
        - Or **refine** it into Entropium
            
    - HUD shows last acquired block and current queue size
        

#### 🔹 Economy: **Entropium (Tactical Currency)**

- Earned by refining blocks or defeating enemies
    
- Spent during the mission on:
    
    - Merchant trades
        
    - Incident participation
        
    - Artifact activation or resource crafting
        
- **Expires at end of mission**
    
- **No persistent value unless spent in meaningful systems**
    

#### 🔹 Incidents (Dynamic, High-Value Interactions)

- Procedurally inserted mid-run events, such as:
    
    - **Black Holes** (environmental hazards)
        
    - **Corrupted Convoys** (combat encounters)
        
    - **Merchant Vessels** (Entropium-for-reward trades)
        
    - **Ancient Caches** (yield artifacts, lore, or blueprints)
        
- Provide opportunities to:
    
    - Discover new artifacts or ships
        
    - Earn **Data Cores** (via Entropium expenditure or objective success)
        

---

### 3. **Boss Encounter**

- The final wave of each mission is a **boss battle**
    
- Bosses provide:
    
    - **Artifact Blueprints**
        
    - **Starter Ship Unlock Tokens**
        
    - **Direct Data Core rewards**
        
    - **Optional Lore Unlocks**
        
- Bosses **do not drop blocks or Entropium**, as these would be functionally useless at mission end
    
- Optionally, a **brief post-boss synthesis phase** could occur before exit (not currently planned)
    

---

### 4. **Return to Hub**

- **Entropium is lost**
    
- **Data Cores earned** are banked permanently
    
- **New discoveries** are flagged as **“Discovered”** in the Unlockables Menu
    
    - E.g. "Discovered: Pulse Flux Matrix – Now available for synthesis."
        

---

## 🧬 **Meta Progression: Unified Unlock System**

### 🔹 Meta-Currency: **Data Cores**

- Earned by:
    
    - Completing incident objectives
        
    - Boss encounters
        
    - Spending Entropium in valuable systems (e.g. merchant trades)
        
- Spent on:
    
    - Unlocking **Artifacts**
        
    - Unlocking **Starter Ships**
        
    - Unlocking **Passive Upgrades**


🔹 Discovery → Synthesis Flow

|Phase|Action|
|---|---|
|**In-Mission Discovery**|Incidents or bosses yield blueprints/unlock tokens (non-usable until synthesized)|
|**Hub Unlockables Menu**|Newly discovered item appears grayed out as “Discovered”|
|**Synthesis (Cost: Data Cores)**|Item becomes **fully unlocked** and available for use|
|**Equip**|Artifact appears in loadout / Starter Ship in ship carousel|

📦 **Unlockable Categories**

|Category|Discovered Via|Synthesized With|Notes|
|---|---|---|---|
|**Artifacts**|Incidents, bosses, caches|Data Cores|Run modifiers; 2 slots per starter ship|
|**Starter Ships**|Bosses, incident chains|Data Cores|Unique block layout, passive rules (e.g. max block count)|
|**Passive Upgrades**|Hub menu|Data Cores|Permanent boosts (e.g. turret damage +10%)|
🪙 **Economy Overview**

|Currency|Scope|Earned From|Spent On|Persistent?|
|---|---|---|---|---|
|**Blocks**|In-mission|Enemy drops|Building during mission|❌|
|**Entropium**|In-mission|Refined blocks, enemy kills, incidents|Merchants, incident interactions|❌ _(expires)_|
|**Data Cores**|Persistent|Bosses, incidents, artifact events|Artifacts, ships, passive upgrades|✅|

🧠 **Systemic Advantages**

|Design Objective|Implementation|
|---|---|
|Avoid currency bloat|One tactical (Entropium) + one strategic (Data Cores)|
|Avoid reward irrelevance|No ephemeral rewards post-boss|
|Tie moment-to-moment to long-term|Discovery → Synthesis flow|
|Support strategic Entropium use|Only spent Entropium can yield Data Cores|
|Reward player agency and exploration|Incidents and optional encounters yield high-value unlocks|

🗺️ **Post-Mission Report Breakdown**

|Metric|Value|
|---|---|
|Objectives Completed|2/2| --- Show itemized objectives, maybe data cores per?
|Entropium Collected|1250| --- Gives a small amount of Data Cores
|Incidents Completed|3| --- Gives a small amount of Data Cores (maybe 1 per incident?)
|Enemies Destroyed|50|  --- Gives a small amount of Data Cores (maybe minimum 1?)
|Entropium Spent|900| 
|Data Cores Earned|4|
|New Discoveries|Overthruster (Artifact), Cryo Core Frame (Starter Ship)|
## 📈 **Planned System Extensions**

- **Artifact Synergies**: Set bonuses or tiered activations
    
- **Unlockable Galaxy Regions**: Requiring specific artifact types or key items
    
- **Faction Reputation Tracks**: Based on incident outcomes
    
- **Hub Progression Expansion**: Rooms, upgrades, or shipyard functionality


# Psychology

## Axes


|Axis|Goal|
|---|---|
|🔁 **Repetition**|Core loop engagement (frequency × reward)|
|💥 **Sensation**|Audio-visual feedback, kinetic feel, input "crunch"|
|🧠 **Reward Psychology**|Player brain feels **cause-effect**, **progress**, or **surprise**|

## 🧩 1. **Entering a Mission**

**Goal**: Prime the player’s emotional state—excitement, clarity, and commitment

### 💡 Optimization:

- **CRT bootup animation**, screen flash, _"launch confirmed"_ style VFX
    
- Fade-in VO snippet: _“Deploying ship: VANTA-3… Mission live.”_
    
- Low, rising **bass swell** and **snap transition**
    
- Mini-cutscene showing starter ship spawning in world
    

### 🧠 Psychological Payoff:

- _Priming arousal_ (anticipation is as powerful as action)
    
- Anchors the start of the “loop cycle” — Pavlov trigger
    

---

## 🔫 2. **Firing Weapons / Battling Ships**

**Goal**: Every shot and impact must feel like **a punch**.  
Weapons are the heartbeat of moment-to-moment engagement.

### 💡 Optimization:

- Punchy **audio feedback** (tailored per weapon class: thunk, zap, thrum)
    
- Muzzle flash, brief screen shake, glowing projectiles
    
- On-hit: screen-space jitter, particle spray, HP pips breaking off
    

### 🧠 Psychological Payoff:

- _Operant conditioning_: cause-effect immediacy (“I hit → I saw result → I feel in control”)
    
- _Flow engagement_: pattern recognition + micro-execution = focused immersion
    

---

## 🧱 3. **Looting a Block**

**Goal**: Blocks are not just currency—they are potential **future power**  
This must feel **viscerally good** and symbolically potent

### 💡 Optimization:

- Screen flash + sound cue (e.g. _“CLINK—[block type] acquired!”_)
    
- Block preview displayed **with flourish** in HUD (“TURRET: V2” swoops in)
    
- If rare: golden glow or chime differentiating the drop
    

### 🧠 Psychological Payoff:

- _Anticipatory compulsion_: “what’s next in the queue?”
    
- _Slot machine effect_: unpredictable reward from known trigger
    

---

## 💠 4. **Looting a Pickup (Repair orb / Currency)**

**Goal**: Reward traversal and destruction with **satisfying micro-feedback**

### 💡 Optimization:

- Magnetism effect → pickup zips to ship with screen tint glow
    
- Coin-like chime or low-res 8-bit sound callback for nostalgia
    
- HP repair overlay flashes blocks green momentarily ("healed!")
    

### 🧠 Psychological Payoff:

- _Micro-reward loop reinforcement_ (Pavlovian collection stimuli)
    
- Builds attachment to ship state (feeling of stewardship)
    

---

## 🧬 5. **Unlocking a Blueprint / Token**

**Goal**: Deliver high-stakes endorphin spike—**this is meta progression bait**

### 💡 Optimization:

- Slow-down moment + camera pan
    
- UI callout:  
    _“✦ NEW ARTIFACT DISCOVERED ✦”_  
    With blueprint background, glowing lines animating into place
    
- Audio swell + unlock "stamp" sound effect
    

### 🧠 Psychological Payoff:

- _Core Skinner box release_: high-rarity drop, permanent unlock potential
    
- _Memory anchoring_: players remember blueprint moments → desire to chase more
    

---

## 🧰 6. **Block Drop Decision Menu**

### a. **Refining a Block**

**Goal**: Choosing currency over expansion should still feel _tactile and gratifying_

### 💡 Optimization:

- Clicking “Refine” triggers **disintegration effect** with audio grind/scrap
    
- Entropium counter floats up with "+50" overlay
    
- Crisp “banking” chime (slot-machine bell)
    

### 🧠 Payoff:

- _Loss-conversion satisfaction_: turning a “meh block” into value
    

### b. **Placing a Block**

**Goal**: The act of building must feel **tactile and sovereign**

### 💡 Optimization:

- Ghost preview pulsing slightly while placing
    
- Final placement → camera shake, weld sparks, HUD tick
    
- Sound: metallic “clunk-chunk” of integration
    

### 🧠 Payoff:

- _Agency reinforcement_: "I am shaping this machine" → builder fulfillment loop
    

---

## 🧭 7. **Exploring Between Skirmishes**

**Goal**: Satisfy curiosity and provide **interstitial low-pressure exploration**

### 💡 Optimization:

- Radar ping on screen for unvisited points
    
- Ambient audio shifts near incidents (“creaking station”, “weird radio static”)
    
- Procedural terrain VFX: asteroids, relics, derelicts
    

### 🧠 Psychological Payoff:

- _Micro-goal chaining_: player builds internal checklist of “things to check next”
    
- _Pacing control_: downtime is mentally necessary for retention
    

---

## 🧪 8. **Interacting with Incidents**

**Goal**: These are **narrative + reward spikes**—they must **feel important**

### 💡 Optimization:

- UI morphs into **sci-fi command console** look for incident interaction
    
- Dialogue bursts, decision branches, reward preview with suspense
    
- Countdown or resource bar visuals when timed
    

### 🧠 Psychological Payoff:

- _Commitment psychology_: investment in decision outcomes
    
- _Narrative novelty_: breaks the procedural loop with high-variance “what’s this?” moments
    

---

## 👑 9. **Defeating a Boss**

**Goal**: Deliver a crescendo and catharsis experience

### 💡 Optimization:

- Boss death = **slow-motion**, impact VFX bloom, screen white flash
    
- VO line (“Target neutralized. Core extracted.”)
    
- Fade-in of unlocks with epic music cue
    
- “New Blueprint Found” screen → player clicks through celebration
    

### 🧠 Psychological Payoff:

- _Euphoria spike_: earned power climax
    
- _Core loop reinforcement_: ends the run with an injection of forward momentum
    

---

## 🏠 10. **Returning to the Hub**

**Goal**: This is decompression and **meaning crystallization**

### 💡 Optimization:

- Subdued music fade-in
    
- Summary screen with satisfying “pop-pop-pop” as results tally
    
- Unlockables flash “NOW AVAILABLE” in hub menus
    
- Artifacts slot in with physical animations like loading cartridges
    

### 🧠 Psychological Payoff:

- _Narrative reinforcement_: "Look what I brought back"
    
- _Loop closure_: player feels _completion_ → prepared to re-enter the loop

|Touchpoint|Feedback Style|Psychological Trigger|
|---|---|---|
|Entering Mission|Ritualistic audiovisual ritual|Anticipation / priming|
|Firing Weapons|Tactile response, screen shake|Agency, feedback loop|
|Looting Block|Preview HUD pop + sound|Variable reward|
|Looting Pickup|Magnetism + +# overlay|Micro-reward, collection|
|Blueprint Discovery|Cinematic pause + unique sound cue|High dopamine spike|
|Refining Block|Entropium sparkle + disintegration|Conversion satisfaction|
|Placing Block|Welding sparks + tactile sound|Agency + ownership|
|Map Traversal|Ambient transitions, radar pings|Curiosity itch|
|Incident Interaction|Terminal UI + options|Surprise + commitment|
|Boss Kill|Slow-mo + unlock splash screen|Power catharsis|
|Returning to Hub|Summary screen + artifact animations|Completion / progression|
