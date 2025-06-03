// src/game/player/PlayerArtifactManager.ts

/* 

Artifacts will be a system on top of Passives. I'm not sure if they will persist between runs.
Artifacts will have powerful unique, often game defining mutators or effects.
I see artifacts as having both a boon (positive effect) and a bane (negative effect)

Arguments for having them persist:
- They become good chase items, or rare rewards to aspire to
- They introduce another reward for quests/additional content/optional missions

Arguments for having them not persist:
- They add uniqueness to each possible run
- Getting an artifact in a run can change the nature of that run in unpredictable ways
- Adds rng and unpredictability and excitement to each run

Possible Artifacts: Note that names will be inspired from comedic lore of the games ludopoetic ideas
- Artifact A: 
  - boon: Effects of mass become negligeable, increasing turn radius, acceleration, and steer assist.
  - bane: Take double damage taken on all blocks

- Artifact B:
  - boon: Firing rate for all blocks is increased by 50%
  - bane: Cannot use energy 

- Artifact C:
  - boon: Receive an escort of 4 friendly ships
  - bane: Escorts demand 50% of all Entropium

- Artifact D:
  - boon: Unlimited Energy
  - bane: Cannot use shields

- Artifact E:
  - boon: Hangar Bays cost 75% less entropium
  - bane: Cannot use weapons beyond tier 1

- Artifact F:
  - boon: All blocks have 300% increase to all stats
  - bane: Ship is limited to maximum of 10 blocks

- Artifact G:
  - boon: Damaging enemies repairs your blocks
  - bane: Block armor degrades rapidly over time, and explode when 0 armor

- Artifact H:
  - boon: Turrets are 75% cheaper
  - bane: Weapon choice limited only to turrets

- Artifact I:
  - boon: Ship automatically adds a random new block every 10s
  - bane: Cannot manually place blocks

- Artifact J:
  - boon: Block and Entropium drop rates increased by 50%
  - bane: No Radar

etc
*/