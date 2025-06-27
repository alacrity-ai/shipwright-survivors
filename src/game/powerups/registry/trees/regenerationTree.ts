// src/game/powerups/registry/trees/regenerationTree.ts

/*

Regeneration Tree

Core Mechanic: Collecting entropium from defeated enemies has a chance to slowly repair ship

Branch Structure:
- Root: "Entropium Harvester" - Defeated enemies drop entropium that can repair hull
- Branch A: "Metabolic Repair" - Entropium gradually heals hull over time
  - Upgrades: Faster healing rate → Heal shields too → Overheal creates temporary armor
- Branch B: "Burst Regeneration" - Accumulate entropium for instant emergency healing
  - Upgrades: Larger heal bursts → Auto-trigger at low health → Burst healing damages nearby enemies

*/