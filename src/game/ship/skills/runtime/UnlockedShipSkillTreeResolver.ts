// src/game/ship/skills/runtime/UnlockedShipSkillTreeResolver.ts

import type { ShipSkillEffectMetadata } from '@/game/ship/skills/interfaces/ShipSkillEffectMetadata';
import { getStarterShipSkillTree } from '@/game/ship/skills/registry/StarterShipSkillTreeRegistry';
import { PlayerShipSkillTreeManager } from '@/game/player/PlayerShipSkillTreeManager';

/**
 * Aggregates the metadata from all selected nodes for a given ship.
 */
export function getAggregatedSkillEffects(shipId: string): ShipSkillEffectMetadata {
  const tree = getStarterShipSkillTree(shipId);
  if (!tree) {
    console.warn(`[UnlockedShipSkillTreeResolver] No tree found for ship: ${shipId}`);
    return {};
  }

  const selectedSet = PlayerShipSkillTreeManager.getInstance().getSelectedNodeSet(shipId);
  const total: ShipSkillEffectMetadata = {};

  for (const { node } of tree.nodes) {
    if (!selectedSet.has(node.id)) continue;

    for (const [key, value] of Object.entries(node.metadata) as [keyof ShipSkillEffectMetadata, any][]) {
      const current = total[key];

      if (typeof value === 'number') {
        total[key] = ((typeof current === 'number' ? current : 0) + value) as any;
      }

      else if (typeof value === 'boolean') {
        total[key] = value as any;
      }

      else if (Array.isArray(value)) {
        if (Array.isArray(current)) {
          total[key] = Array.from(new Set([...current, ...value])) as any;
        } else {
          total[key] = [...value] as any;
        }
      }

      else {
        console.warn(`[UnlockedShipSkillTreeResolver] Unhandled metadata type for key: ${key}`, value);
      }
    }
  }

  return total;
}


/* Example Output:
{
  turretDamage: 15,
  turretProjectileSpeed: 35,
  turretCriticalChance: 0.1,
  turretPenetratingShots: true,
  startingBlocks: ['turret1', 'turret2']
}
*/