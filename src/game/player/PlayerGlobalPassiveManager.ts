// src/game/player/PlayerGlobalPassiveManager.ts

import { PlayerMetaCurrencyManager } from './PlayerMetaCurrencyManager';
import type { PassiveNode } from '@/game/passives/interfaces/PassiveNode';
import type { PassiveTree } from '@/game/passives/interfaces/PassiveTree';

/**
 * Singleton manager for tracking unlocked global passive nodes.
 * - Maintains a monotonically increasing version to support cache invalidation.
 * - Exposes allocation-free iteration over unlocked nodes.
 */
export class PlayerGlobalPassiveManager {
  private static instance: PlayerGlobalPassiveManager;

  /** Set of unlocked node IDs */
  private unlocked: Set<string> = new Set();

  /** The currently loaded passive tree definition */
  private passiveTree: PassiveTree | null = null;

  /** Fast lookup for nodeId -> PassiveNode (rebuilt on setPassiveTree) */
  private nodeById: Map<string, PassiveNode> = new Map();

  /** Monotonic version for cache invalidation */
  private version = 0;

  private constructor() {}

  public static getInstance(): PlayerGlobalPassiveManager {
    if (!PlayerGlobalPassiveManager.instance) {
      PlayerGlobalPassiveManager.instance = new PlayerGlobalPassiveManager();
    }
    return PlayerGlobalPassiveManager.instance;
  }

  // === Tree Management ===

  /**
   * Assigns the passive tree used for unlock validation and cost lookups.
   * Rebuilds internal indexes and bumps version.
   */
  public setPassiveTree(tree: PassiveTree): void {
    this.passiveTree = tree;
    this.nodeById.clear();
    for (const sq of tree.squares) {
      this.nodeById.set(sq.node.id, sq.node);
    }
    this.bumpVersion();
  }

  public getPassiveTree(): PassiveTree | null {
    return this.passiveTree;
  }

  // === Currency & Unlock Logic ===

  /**
   * Attempts to unlock the given passive node by ID.
   * Deducts the node's cost from PlayerMetaCurrencyManager if successful.
   * Returns true on success, false if already unlocked, cannot afford, or node not found.
   */
  public unlockNode(nodeId: string): boolean {
    if (this.unlocked.has(nodeId)) return false;

    const node = this.findNodeById(nodeId);
    if (!node) {
      console.warn(`[PlayerGlobalPassiveManager] Node not found: ${nodeId}`);
      return false;
    }

    const cost = node.cost;
    const currencyManager = PlayerMetaCurrencyManager.getInstance();

    if (!currencyManager.canAfford(cost)) {
      return false;
    }

    currencyManager.subtractMetaCurrency(cost);
    this.unlocked.add(nodeId);
    this.bumpVersion();
    return true;
  }

  public isNodeUnlocked(nodeId: string): boolean {
    return this.unlocked.has(nodeId);
  }

  /**
   * Allocation-free iteration over unlocked PassiveNodes.
   * Invokes `visitor` once per unlocked node.
   */
  public forEachUnlockedNode(visitor: (node: PassiveNode) => void): void {
    if (!this.passiveTree) return;
    for (const nodeId of this.unlocked) {
      const node = this.nodeById.get(nodeId);
      if (node) visitor(node);
    }
  }

  /**
   * Returns an array of all unlocked PassiveNodes.
   * NOTE: Prefer `forEachUnlockedNode` to avoid allocations in hot paths.
   */
  public getUnlockedNodes(): PassiveNode[] {
    if (!this.passiveTree) return [];
    const out: PassiveNode[] = [];
    for (const nodeId of this.unlocked) {
      const node = this.nodeById.get(nodeId);
      if (node) out.push(node);
    }
    return out;
  }

  /**
   * Convenience: returns all unlocked node IDs.
   * Avoid in hot paths; returns a new array.
   */
  public getUnlockedNodeIds(): string[] {
    return Array.from(this.unlocked);
  }

  /**
   * Clears all unlocked nodes without refunding currency.
   * Bumps version (cache invalidation).
   */
  public clear(): void {
    if (this.unlocked.size === 0) return;
    this.unlocked.clear();
    this.bumpVersion();
  }

  /**
   * Refunds all unlocked nodes by returning their cost to the player
   * and then clears the unlocked set.
   */
  public refundAll(): void {
    if (!this.passiveTree || this.unlocked.size === 0) {
      this.clear(); // still bump version if anything was present
      return;
    }

    let totalRefund = 0;
    for (const nodeId of this.unlocked) {
      const node = this.nodeById.get(nodeId);
      if (node) totalRefund += node.cost;
    }
    PlayerMetaCurrencyManager.getInstance().addMetaCurrency(totalRefund);
    this.clear(); // bumps version
  }

  // === Persistence ===

  public toJSON(): string {
    const data = {
      unlocked: Array.from(this.unlocked)
    };
    return JSON.stringify(data);
  }

  public fromJSON(json: string): void {
    this.unlocked.clear();
    try {
      const parsed: { unlocked?: string[] } = JSON.parse(json);
      if (Array.isArray(parsed.unlocked)) {
        for (const id of parsed.unlocked) {
          this.unlocked.add(String(id));
        }
      }
      this.bumpVersion();
    } catch (err) {
      console.warn(`[PlayerGlobalPassiveManager] Failed to parse saved data:`, err);
      // Version not bumped on parse failure
    }
  }

  // === Cache Invalidation / Versioning ===

  /** Returns the current version for cache coherence checks. */
  public getVersion(): number {
    return this.version;
  }

  /** Increment version (wrap with 32-bit int semantics). */
  private bumpVersion(): void {
    this.version = (this.version + 1) | 0;
  }

  // === Helpers ===

  private findNodeById(nodeId: string): PassiveNode | null {
    return this.nodeById.get(nodeId) ?? null;
  }
}
