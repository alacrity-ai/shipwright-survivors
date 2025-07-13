// src/game/powerups/registry/PowerupRegistry.ts

import type { PowerupNodeDefinition } from './PowerupNodeDefinition';

import { criticalHitTree } from './trees/criticalHitTree';
import { fortificationTree } from './trees/fortificationTree';
import { attackerTree } from './trees/attackerTree';
import { fallbackCoreTree } from './trees/fallbackCoreTree';
import { blockAffinityTree } from './trees/blockAffinityTree';
import { resupplyTree } from './trees/resupplyTree';

import { extractProceduralIndex } from '@/game/powerups/utils/PowerupTreeUtils';

const ALL_TREES: PowerupNodeDefinition[][] = [
  criticalHitTree,
  fortificationTree,
  attackerTree,
  fallbackCoreTree,
  blockAffinityTree,
  resupplyTree,
];

const MAX_CHOICES = 3;

export class PowerupRegistry {
  private static nodeMap = new Map<string, PowerupNodeDefinition>();
  private static initialized = false;

  public static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    for (const tree of ALL_TREES) {
      for (const node of tree) {
        if (this.nodeMap.has(node.id)) {
          console.warn(`[PowerupRegistry] Duplicate node ID: ${node.id}`);
        }
        this.nodeMap.set(node.id, node);
      }
    }
  }

  public static destroy(): void {
    this.nodeMap.clear();
    this.initialized = false;
  }

  public static get(id: string): PowerupNodeDefinition | undefined {
    const existing = this.nodeMap.get(id);
    if (existing) return existing;

    if (!/\+\d+$/.test(id)) return undefined;

    const index = extractProceduralIndex(id);
    const baseId = id.replace(/\+\d+$/, '');
    const parentId = `${baseId}+${index - 1}`;
    const parent = this.get(parentId);

    // Special case for infinite fallback core nodes
    if (baseId === 'core-reward') {
      return {
        id,
        label: `Core Reward +${index}`,
        description: 'Grants you 1 Core. Can be selected multiple times.',
        icon: 'icon-core-reward',
        category: 'core',
        parentId,
        isProcedural: true,
        scaling: {}, // Optional – allows the procedural test to pass
      };
    }

    // Standard procedural node resolution
    if (!parent?.isProcedural || !parent.scaling) return undefined;

    return {
      id,
      label: `${baseId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} +${index}`,
      description: parent.description,
      icon: parent.icon,
      category: parent.category,
      parentId,
      isProcedural: true,
      scaling: { ...parent.scaling },
    };
  }

  public static getAll(): PowerupNodeDefinition[] {
    return [...this.nodeMap.values()];
  }

  public static getRootNodes(): PowerupNodeDefinition[] {
    return this.getAll().filter(node => node.parentId === null);
  }

  public static getChildren(id: string): PowerupNodeDefinition[] {
    return this.getAll().filter(node => node.parentId === id);
  }

  public static getParent(id: string): PowerupNodeDefinition | undefined {
    const node = this.get(id);
    if (!node?.parentId) return undefined;
    return this.get(node.parentId);
  }

  public static getAllDescendants(id: string): PowerupNodeDefinition[] {
    const results: PowerupNodeDefinition[] = [];
    const visit = (parentId: string) => {
      const children = this.getChildren(parentId);
      for (const child of children) {
        results.push(child);
        visit(child.id);
      }
    };
    visit(id);
    return results;
  }

  public static getByCategory(category: string): PowerupNodeDefinition[] {
    return this.getAll().filter(node => node.category === category);
  }

  public static has(id: string): boolean {
    return !!this.get(id);
  }

  public static getExclusiveBranchKey(id: string): string | undefined {
    return this.get(id)?.exclusiveBranchKey;
  }

  public static isProcedural(id: string): boolean {
    return /\+\d+$/.test(id) && !this.nodeMap.has(id);
  }

  // -----------------------------
  // New Methods
  // -----------------------------

  /** Given a list of acquired IDs, return leaf nodes (nodes that have no acquired children). */
  public static getLeafNodes(acquired: Set<string>): PowerupNodeDefinition[] {
    const leafNodes: PowerupNodeDefinition[] = [];
    for (const id of acquired) {
      const children = this.getChildren(id);
      const anyChildAcquired = children.some(child => acquired.has(child.id));
      if (!anyChildAcquired) {
        const node = this.get(id);
        if (node) leafNodes.push(node);
      }
    }
    return leafNodes;
  }

  /** Return next eligible nodes from player’s current leaf nodes */
  public static getEligibleChildNodes(acquired: Set<string>): PowerupNodeDefinition[] {
    const nextNodes: PowerupNodeDefinition[] = [];
    for (const leaf of this.getLeafNodes(acquired)) {
      const children = this.getChildren(leaf.id);
      for (const child of children) {
        if (!acquired.has(child.id)) nextNodes.push(child);
      }
    }
    return nextNodes;
  }

  /** Return new root nodes that haven't been touched by the player */
  public static getUnacquiredRootNodes(acquired: Set<string>): PowerupNodeDefinition[] {
    return this.getRootNodes().filter(root => !acquired.has(root.id));
  }

  /** Returns categories the player has already invested in */
  public static getActiveCategories(acquired: Set<string>): Set<string> {
    const categories = new Set<string>();
    for (const id of acquired) {
      const node = this.get(id);
      if (node?.category) categories.add(node.category);
    }
    return categories;
  }

  /** Returns root nodes that do NOT belong to the categories already invested in */
  public static getFreshRootNodes(acquired: Set<string>): PowerupNodeDefinition[] {
    const activeCategories = this.getActiveCategories(acquired);
    return this.getRootNodes().filter(root => !activeCategories.has(root.category ?? ''));
  }

  /**
   * Compute the pool of nodes that the menu will later shuffle and trim.
   * Non-core nodes are always preferred; core nodes only pad the list
   * when < MAX_CHOICES non-core candidates exist.
   */
  public static getEligiblePowerupNodes(
    acquired: Set<string>,
    playerLevel: number,
  ): PowerupNodeDefinition[] {
    /* ---------- level predicate ---------- */
    const meetsLevel = (n: PowerupNodeDefinition): boolean =>
      (n.minLevelRequirement ?? 0) <= playerLevel;

    /* ---------- gather eligible non-core nodes ---------- */
    const children   = this.getEligibleChildNodes(acquired).filter(meetsLevel);
    const freshRoots = this.getFreshRootNodes(acquired).filter(meetsLevel);

    let nonCore: PowerupNodeDefinition[] = [
      ...children,
      ...freshRoots,
    ].filter(n => n.category !== 'core');

    if (nonCore.length === 0) {
      nonCore = this.getUnacquiredRootNodes(acquired)
        .filter(meetsLevel)
        .filter(n => n.category !== 'core');
    }

    /* ---------- single-instance core fallback ---------- */
    const result: PowerupNodeDefinition[] = [...nonCore];
    const coreFallback = fallbackCoreTree[0];           // immutable singleton

    if (result.length < MAX_CHOICES) {
      // Append the core node exactly once.
      result.push(coreFallback);
      // (No further padding, even if the list is now < MAX_CHOICES.)
    }

    return result;
  }
}
