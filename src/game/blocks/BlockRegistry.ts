// src/game/blocks/BlockRegistry.ts

// ──────────────────────────────────────────────────────────────────────────────
// Block Registry (runtime-loaded + derived indices)
// - This module owns the mutable in-memory registry of BlockType definitions.
// - It provides:
//     • Pure factories for constructing a registry from JSON / URL
//     • A live, module-local map plus read/write accessors
//     • Common lookup helpers (by id, tier, category, random selection)
//     • Derived lookup tables (index <-> type, mass array, atlas key array)
//     • Export utilities (serialize & download registry as JSON)
// - IMPORTANT: Avoid introducing implicit side effects outside the explicit
//   bootstrap section. Derived tables assume the registry is finalized.
// ──────────────────────────────────────────────────────────────────────────────

import type { BlockType } from '@/game/interfaces/types/BlockType';

import { getAllAsteroidBlockTypes } from '@/game/blocks/AsteroidBlockRegistry';
import { getTierFromBlockId } from '@/systems/pickups/helpers/getTierFromBlockId';
import { randomFromArray } from '@/shared/arrayUtils';

import { getAssetPath } from '@/shared/assetHelpers';

// ──────────────────────────────────────────────────────────────────────────────
// Visual constants (currently unused in this file; retained for future UI use)
// ──────────────────────────────────────────────────────────────────────────────
const LIGHT_COLOR_TIERS = {
  0: '#feac29', // Tier 0 – white (for consistency)
  1: '#feac29', // Tier 1 – neutral white
  2: '#29fe5e', // Tier 2 – emerald green
  3: '#7eb1ff', // Tier 3 – cobalt blue
  4: '#ff2bfb', // Tier 4 – royal purple
  5: '#fbff00', // Tier 5 – gold (optional)
};

// ──────────────────────────────────────────────────────────────────────────────
// Live Registry (module-local, mutable)
// NOTE: All public getters return read-only views to discourage external mutation
// ──────────────────────────────────────────────────────────────────────────────
let blockTypes: Record<string, BlockType> = Object.create(null);

/** Read-only view of the current registry map. */
export function getBlockTypeMap(): Readonly<Record<string, BlockType>> {
  return blockTypes;
}

/** Replace the entire registry map (used by bootstrap/loader paths). */
export function setBlockTypeMap(newMap: Record<string, BlockType>): void {
  blockTypes = newMap;
}

// ──────────────────────────────────────────────────────────────────────────────
// Registry Construction (pure + URL-backed)
// - `createBlockRegistryFromJson` is synchronous and side-effect free.
// - `createBlockRegistryFromUrl` fetches JSON and delegates to the pure factory.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Construct a registry map from a JSON string or array of BlockType.
 * No module state is mutated; callers must set via `setBlockTypeMap`.
 *
 * @param jsonOrArray JSON text or already-parsed BlockType[]
 * @param mergeAsteroids If true, includes asteroid block types when absent
 * @param allowOverwrite If false, throws on duplicate block id within input
 */
export function createBlockRegistryFromJson(
  jsonOrArray: string | BlockType[],
  {
    mergeAsteroids = true,
    allowOverwrite = true,
  }: { mergeAsteroids?: boolean; allowOverwrite?: boolean } = {}
): Record<string, BlockType> {
  // Normalize input to array
  const arr = Array.isArray(jsonOrArray) ? jsonOrArray : JSON.parse(jsonOrArray);

  // Basic construction with a fresh, prototype-less map
  const map: Record<string, BlockType> = Object.create(null);
  for (const b of arr) {
    if (!allowOverwrite && map[b.id]) {
      throw new Error(`Duplicate id "${b.id}"`);
    }
    // Shallow clone to decouple external references; clone metatags defensively
    map[b.id] = { ...b, metatags: b.metatags ? [...b.metatags] : undefined };
  }

  // Optionally merge asteroid types if they are not already present
  if (mergeAsteroids) {
    for (const a of getAllAsteroidBlockTypes()) {
      if (!map[a.id]) map[a.id] = a;
    }
  }

  return map;
}

/**
 * Fetch a registry JSON file by URL and build a map via the pure factory.
 * No module state is mutated; callers must set via `setBlockTypeMap`.
 */
export async function createBlockRegistryFromUrl(
  url: string,
  opts: { mergeAsteroids?: boolean; allowOverwrite?: boolean } = {}
): Promise<Record<string, BlockType>> {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`Failed to fetch block registry: ${res.status} ${res.statusText}`);
  }
  const arr = (await res.json()) as BlockType[];
  return createBlockRegistryFromJson(arr, opts);
}

// ──────────────────────────────────────────────────────────────────────────────
/**
 * Bootstrap: load the shipped BlockRegistry.json and install it as the live map.
 * NOTE: This uses top-level await (ESM). If your bundler/runtime does not support
 * TLA, move this into an explicit async init step in your app startup.
 */
// ──────────────────────────────────────────────────────────────────────────────
const url = getAssetPath('assets/blocks/BlockRegistry.json');
const map = await createBlockRegistryFromUrl(url, { mergeAsteroids: true });
setBlockTypeMap(map);

// ──────────────────────────────────────────────────────────────────────────────
// Safety Merge (idempotent): ensure asteroid types are present in the live map.
// This duplicates the merge performed in createBlockRegistryFromUrl when
// mergeAsteroids=true, but is intentionally retained to preserve current behavior.
// ──────────────────────────────────────────────────────────────────────────────
for (const asteroidType of getAllAsteroidBlockTypes()) {
  blockTypes[asteroidType.id] = asteroidType;
}

// ──────────────────────────────────────────────────────────────────────────────
/** Unified Accessors (ship + asteroid blocks) */
// ──────────────────────────────────────────────────────────────────────────────
export function getAllBlockTypes(): BlockType[] {
  return Object.values(blockTypes);
}

export function getBlockType(id: string): BlockType | undefined {
  return blockTypes[id];
}

export function getBlockCost(id: string): number | undefined {
  return blockTypes[id]?.cost;
}

export function getAllBlocksInTier(tier: number): BlockType[] {
  return Object.values(blockTypes).filter(
    (block) => getTierFromBlockId(block.id) === tier && !block.id.includes('cockpit')
  );
}

export function getRandomBlockInTier(tier: number): BlockType {
  return randomFromArray(getAllBlocksInTier(tier));
}

export function getEngineBlockInTier(tier: number): BlockType {
  return blockTypes[`engine${tier}`];
}

export function getWeaponBlockInTier(tier: number): BlockType {
  const weaponBlocks = Object.values(blockTypes).filter(
    (block) => getTierFromBlockId(block.id) === tier && block.category === 'weapon'
  );
  if (weaponBlocks.length === 0) {
    throw new Error(`No weapon blocks found for tier ${tier}`);
  }
  return randomFromArray(weaponBlocks);
}

export function getAllBlocksInTierFromBlockType(blockType: BlockType): BlockType[] {
  const tier = getTierFromBlockId(blockType.id);
  return Object.values(blockTypes).filter(
    (block) => getTierFromBlockId(block.id) === tier && !block.id.includes('cockpit')
  );
}

export function getTierFromBlockType(blockType: BlockType): number {
  return getTierFromBlockId(blockType.id);
}

// ──────────────────────────────────────────────────────────────────────────────
/** Affinity Upgrade Chains (computed once from current registry) */
// Chains are keyed by the first metatag, ascending by tier.
// ──────────────────────────────────────────────────────────────────────────────
const affinityUpgradeChains: Map<string, BlockType[]> = new Map();

for (const block of Object.values(blockTypes)) {
  const [tag] = block.metatags ?? [];
  if (!tag) continue;
  if (!affinityUpgradeChains.has(tag)) affinityUpgradeChains.set(tag, []);
  affinityUpgradeChains.get(tag)!.push(block);
}

// Stable ascending tier order within each chain
for (const chain of affinityUpgradeChains.values()) {
  chain.sort((a, b) => a.tier - b.tier);
}

/**
 * Return a block `delta` steps along the same affinity chain, clamped at ends.
 * Example: delta=+1 is “next tier”, delta=-1 is “previous tier”.
 */
export function getNextTierBlock(current: BlockType, delta: number): BlockType | undefined {
  const [tag] = current.metatags ?? [];
  if (!tag) return undefined;

  const chain = affinityUpgradeChains.get(tag);
  if (!chain) return undefined;

  const index = chain.findIndex((b) => b.id === current.id);
  if (index === -1) return undefined;

  const newIndex = Math.min(index + delta, chain.length - 1);
  return chain[newIndex];
}

/** Return the full affinity chain for a given block (or empty if untagged). */
export function getAffinityChainFor(block: BlockType): BlockType[] {
  const [tag] = block.metatags ?? [];
  return tag ? affinityUpgradeChains.get(tag) ?? [] : [];
}

// ──────────────────────────────────────────────────────────────────────────────
/** Numeric Lookup Tables (index-based mirrors of the registry) */
// Built eagerly from the *current* registry snapshot.
// If the registry is later replaced, these arrays will not auto-refresh.
// Callers relying on dynamic mutation should rebuild explicitly.
// ──────────────────────────────────────────────────────────────────────────────
export const BlockTypeIndex: Record<string, number> = {};
export const BlockTypesByIndex: BlockType[] = [];

export function getBlockTypeByIndex(index: number): BlockType | undefined {
  return BlockTypesByIndex[index];
}

export function getBlockIndexByType(id: string): number | undefined {
  return BlockTypeIndex[id];
}

/** Dense mass lookups by numeric index (Float32Array for tight packing). */
export const BlockTypeMass: Float32Array = (() => {
  const types = getAllBlockTypes();
  const arr = new Float32Array(types.length);

  types.forEach((t, i) => {
    BlockTypeIndex[t.id] = i;
    BlockTypesByIndex[i] = t;
    arr[i] = t.mass ?? 0;
  });

  return arr;
})();

/**
 * Atlas column key per block index (placeholder: identity mapping).
 * Keep as Int32Array to allow future remapping without reallocating types.
 */
export const BlockAtlasKeyByIndex: Int32Array = (() => {
  const types = getAllBlockTypes();
  const arr = new Int32Array(types.length);
  for (let i = 0; i < types.length; i++) {
    arr[i] = i; // default: 1:1 mapping
  }
  return arr;
})();

export function getAtlasKeyByIndex(index: number): number {
  return BlockAtlasKeyByIndex[index];
}

// ──────────────────────────────────────────────────────────────────────────────
/** Serialization Utilities */
// - Produce a JSON-safe view of the registry and optionally download it.
// - Functions/undefined fields are elided to keep output compact and portable.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Creates a serializable JSON string of the entire Block Registry.
 * - Produces a deep-cloned, minimal JSON representation (no function refs).
 * - Excludes undefined values for compactness.
 */
export function blockRegistryToJson(pretty = true): string {
  const allBlocks = getAllBlockTypes();

  const serializableBlocks = allBlocks.map((block) => {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(block)) {
      if (typeof value === 'function' || value === undefined) continue;
      clean[key] = value;
    }
    return clean;
  });

  return JSON.stringify(serializableBlocks, null, pretty ? 2 : 0);
}

/**
 * Triggers a download of the current Block Registry as a JSON file.
 * @param filename The file name to use for the downloaded JSON.
 * @param pretty   Whether to pretty-print JSON with indentation.
 */
export function downloadBlockRegistryAsJson(
  filename = 'BlockRegistry.json',
  pretty = true
): void {
  const json = blockRegistryToJson(pretty);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;

  // Avoid layout reflow jitter; attach minimally and clean up.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Revoke blob URL after DOM removal to avoid leaks
  URL.revokeObjectURL(url);
}
