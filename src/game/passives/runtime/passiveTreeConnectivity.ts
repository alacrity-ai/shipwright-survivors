// src/game/passives/runtime/passiveTreeConnectivity.ts

import type { PassiveTree } from '@/game/passives/interfaces/PassiveTree';

export type Adjacency = Map<string, ReadonlyArray<string>>;

export function buildAdjacency(tree: PassiveTree): Adjacency {
  const adj = new Map<string, ReadonlyArray<string>>();
  for (const sq of tree.squares) {
    // `connectedTo` has been canonicalized by the deserializer
    adj.set(sq.node.id, sq.connectedTo);
  }
  return adj;
}

/**
 * Returns the set of nodeIds reachable from `rootId` by traversing ONLY unlocked nodes.
 * If root itself is not unlocked, the set is empty (no progression allowed).
 */
export function computeReachableUnlocked(
  rootId: string,
  adj: Adjacency,
  unlocked: ReadonlySet<string>
): Set<string> {
  const out = new Set<string>();
  if (!unlocked.has(rootId)) return out;

  const stack: string[] = [rootId];
  out.add(rootId);

  while (stack.length) {
    const a = stack.pop()!;
    const nbrs = adj.get(a);
    if (!nbrs) continue;
    for (let i = 0; i < nbrs.length; i++) {
      const b = nbrs[i];
      if (!unlocked.has(b) || out.has(b)) continue;
      out.add(b);
      stack.push(b);
    }
  }
  return out;
}

/**
 * A locked node is eligible iff at least one neighbor is in `reachableUnlocked`.
 * (Affordability is orthogonal and handled by caller.)
 */
export function isUnlockEligibleByConnectivity(
  nodeId: string,
  adj: Adjacency,
  reachableUnlocked: ReadonlySet<string>
): boolean {
  const nbrs = adj.get(nodeId);
  if (!nbrs || nbrs.length === 0) return false;
  for (let i = 0; i < nbrs.length; i++) {
    if (reachableUnlocked.has(nbrs[i])) return true;
  }
  return false;
}
