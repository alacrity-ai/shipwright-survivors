import { PowerupRegistry } from '@/game/powerups/registry/PowerupRegistry';
import type { PowerupNodeDefinition } from '@/game/powerups/registry/PowerupNodeDefinition';
import { PlayerPowerupManager } from '@/game/powerups/runtime/PlayerPowerupManager';

/**
 * Returns the next powerup nodes that the player is eligible to select.
 * - Roots if not acquired and exclusivity permits
 * - Children of already-acquired nodes
 * - Auto-generated procedural nodes if the branch is continued procedurally
 */
export function getValidNextPowerups(): PowerupNodeDefinition[] {
  const acquired = new Set(PlayerPowerupManager.getInstance().getAll());
  const eligible: PowerupNodeDefinition[] = [];

  for (const node of PowerupRegistry.getAll()) {
    if (acquired.has(node.id)) continue;

    // === Root node logic ===
    if (!node.parentId) {
      const isBlockedByExclusiveBranch = [...acquired].some(acquiredId => {
        const acquiredNode = PowerupRegistry.get(acquiredId);
        return acquiredNode?.exclusiveBranchKey && acquiredNode.exclusiveBranchKey === node.exclusiveBranchKey;
      });

      if (!isBlockedByExclusiveBranch) {
        eligible.push(node);
      }

      continue;
    }

    // === Child node logic ===
    if (acquired.has(node.parentId)) {
      eligible.push(node);
    }
  }

  // === Procedural node generation logic ===
  for (const acquiredId of acquired) {
    const last = PowerupRegistry.get(acquiredId);
    if (!last?.isProcedural) continue;

    // Only generate if no further child is defined yet
    const existingChildren = PowerupRegistry.getChildren(last.id);
    if (existingChildren.length > 0) continue;

    // Generate a synthetic procedural continuation
    const nextIndex = extractProceduralIndex(last.id) + 1;
    const nextId = incrementProceduralId(last.id, nextIndex);

    const synthetic: PowerupNodeDefinition = {
      id: nextId,
      label: `${last.label.replace(/\+\d+$/, '').trim()} +${nextIndex}`,
      description: last.description,
      icon: last.icon,
      category: last.category,
      parentId: last.id,
      isProcedural: true,
      scaling: last.scaling ? { ...last.scaling } : {},
    };

    eligible.push(synthetic);
  }

  return eligible;
}

// === Utility ===

/**
 * Extracts the numeric suffix of a procedural powerup ID like 'fortification-shield-4'
 * Returns 4 in that case, or a default fallback (e.g. 3) if not matched.
 */
export function extractProceduralIndex(id: string, fallback = 3): number {
  const match = id.match(/\+(\d+)$/);
  return match ? parseInt(match[1], 10) : fallback;
}

/**
 * Increments a procedural powerup ID to its next index.
 * e.g. 'fortification-shield-4' + 5 → 'fortification-shield-5'
 */
export function incrementProceduralId(baseId: string, nextIndex: number): string {
  return baseId.replace(/\+\d+$/, '') + `+${nextIndex}`;
}

export function isBranchNodeWithExclusion(node: PowerupNodeDefinition): boolean {
  if (!node.id.endsWith('-2')) return false;

  const parent = PowerupRegistry.getParent(node.id);
  if (!parent?.exclusiveBranchKey) return false;

  const siblings = PowerupRegistry.getChildren(parent.id);
  const otherBranches = siblings.filter(
    sibling => sibling.id !== node.id && sibling.id.endsWith('-2')
  );

  return otherBranches.length > 0;
}

export function getExcludedBranchLabels(node: PowerupNodeDefinition): string[] {
  const parent = PowerupRegistry.getParent(node.id);
  if (!parent?.exclusiveBranchKey) return [];

  const siblings = PowerupRegistry.getChildren(parent.id);
  return siblings
    .filter(sibling => sibling.id !== node.id && sibling.id.endsWith('-2'))
    .map(sibling => sibling.label);
}
