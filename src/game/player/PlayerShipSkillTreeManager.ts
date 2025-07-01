// src/game/player/PlayerShipSkillTreeManager.ts

import type { StarterShipSkillTree } from '@/game/ship/skills/interfaces/StarterShipSkillTree';
import { getStarterShipSkillTree } from '@/game/ship/skills/registry/StarterShipSkillTreeRegistry';

export class PlayerShipSkillTreeManager {
  private static instance: PlayerShipSkillTreeManager | null = null;

  // Maps shipId → Set of acquired node IDs
  private selectedNodeMap: Record<string, Set<string>> = {};

  private constructor() {}

  public static getInstance(): PlayerShipSkillTreeManager {
    return this.instance ??= new PlayerShipSkillTreeManager();
  }

  /** Returns true if the player has acquired a node in the given ship's tree */
  public hasNode(shipId: string, nodeId: string): boolean {
    return this.selectedNodeMap[shipId]?.has(nodeId) ?? false;
  }

  /** Returns all selected node IDs for a given ship */
  public getSelectedNodeIds(shipId: string): string[] {
    return [...(this.selectedNodeMap[shipId] ?? new Set())];
  }

  /** Returns a Set of selected node IDs for efficient lookup */
  public getSelectedNodeSet(shipId: string): Set<string> {
    return new Set(this.selectedNodeMap[shipId] ?? []);
  }

  /** Returns how many nodes have been selected for the ship */
  public getSelectedCount(shipId: string): number {
    return this.selectedNodeMap[shipId]?.size ?? 0;
  }

  /** Attempts to acquire a skill node for a given ship, enforcing max cap */
  public acquireNode(shipId: string, nodeId: string): boolean {
    if (!this.canAcquireNode(shipId, nodeId)) return false;
    const nodeSet = this.selectedNodeMap[shipId] ??= new Set();
    nodeSet.add(nodeId);
    return true;
  }

  public canAcquireNode(shipId: string, nodeId: string, maxNodesAllowed?: number): boolean {
    const tree = getStarterShipSkillTree(shipId);
    if (!tree) return false;

    const nodeSet = this.selectedNodeMap[shipId] ?? new Set();

    // Prevent re-acquisition
    if (nodeSet.has(nodeId)) return false;

    // Enforce cap
    const cap = maxNodesAllowed ?? tree.maxSelectableNodes;
    if (nodeSet.size >= cap) return false;

    const node = tree.nodes.find(n => n.node.id === nodeId);
    if (!node) return false;

    if (node.isStarter) return true;

    // === NEW: Check if any unlocked node connects to this one ===
    const isConnectedFromUnlocked = tree.nodes.some(n =>
      nodeSet.has(n.node.id) && n.connectedTo.includes(nodeId)
    );

    return isConnectedFromUnlocked;
  }

  /** Refunds a node and returns the amount of metaCurrency refunded (0 if not applicable) */
  public refundNode(shipId: string, nodeId: string): number {
    if (!this.canRefundNode(shipId, nodeId)) return 0;

    const tree = getStarterShipSkillTree(shipId);
    if (!tree) return 0;

    const selected = this.selectedNodeMap[shipId];
    selected?.delete(nodeId);

    const positioned = tree.nodes.find(n => n.node.id === nodeId);
    return positioned?.node.cost ?? 0;
  }

  public canRefundNode(shipId: string, nodeId: string): boolean {
    const tree = getStarterShipSkillTree(shipId);
    if (!tree) return false;

    const selected = new Set(this.selectedNodeMap[shipId]);
    if (!selected.has(nodeId)) return false;

    // === Simulate removal
    selected.delete(nodeId);
    if (selected.size === 0) return true;

    // === Build forward graph (not reverse!)
    const forwardAdj: Record<string, string[]> = {};
    for (const { node, connectedTo } of tree.nodes) {
      forwardAdj[node.id] = connectedTo;
    }

    // === Traverse forward from all selected starter nodes
    const reachable = new Set<string>();
    const starterIds = tree.nodes
      .filter(n => n.isStarter && selected.has(n.node.id))
      .map(n => n.node.id);

    const stack = [...starterIds];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (reachable.has(current)) continue;
      reachable.add(current);

      for (const next of forwardAdj[current] ?? []) {
        if (selected.has(next)) {
          stack.push(next);
        }
      }
    }

    // === Verify that all selected nodes are still reachable
    for (const selectedId of selected) {
      if (!reachable.has(selectedId)) {
        console.log(`[canRefundNode] Cannot refund ${nodeId} because it would isolate ${selectedId}`);
        return false;
      }
    }

    return true;
  }

  public toJSON(): string {
    const obj: Record<string, string[]> = {};
    for (const [shipId, nodeSet] of Object.entries(this.selectedNodeMap)) {
      obj[shipId] = Array.from(nodeSet);
    }
    return JSON.stringify(obj);
  }

  public fromJSON(json: string): void {
    this.resetAll();
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed === 'object' && parsed !== null) {
        for (const [shipId, nodeIds] of Object.entries(parsed)) {
          if (Array.isArray(nodeIds)) {
            this.selectedNodeMap[shipId] = new Set(nodeIds);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse PlayerShipSkillTreeManager data:', e);
    }
  }

  /** Resets selected nodes for the given ship */
  public resetTree(shipId: string): void {
    delete this.selectedNodeMap[shipId];
  }

  /** Fully resets all selected nodes for all ships */
  public resetAll(): void {
    this.selectedNodeMap = {};
  }

  /** Destroys the singleton instance and clears state */
  public static destroy(): void {
    this.instance?.resetAll();
    this.instance = null;
  }
}
