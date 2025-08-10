// src/game/blocks/BlockRegistry.ts

import type { BlockType } from '@/game/interfaces/types/BlockType';
import { getAllAsteroidBlockTypes } from '@/game/blocks/AsteroidBlockRegistry';
import { getTierFromBlockId } from '@/systems/pickups/helpers/getTierFromBlockId';
import { randomFromArray } from '@/shared/arrayUtils';
import { getAssetPath } from '@/shared/assetHelpers';

// ──────────────────────────────────────────────────────────────────────────────
// Live Registry (module-local, mutable)
// ──────────────────────────────────────────────────────────────────────────────
let blockTypes: Record<string, BlockType> = Object.create(null);

export function getBlockTypeMap(): Readonly<Record<string, BlockType>> { return blockTypes; }
export function setBlockTypeMap(newMap: Record<string, BlockType>): void { blockTypes = newMap; }

// ──────────────────────────────────────────────────────────────────────────────
// Pure factories
// ──────────────────────────────────────────────────────────────────────────────
export function createBlockRegistryFromJson(
  jsonOrArray: string | BlockType[],
  {
    mergeAsteroids = true,
    allowOverwrite = true,
  }: { mergeAsteroids?: boolean; allowOverwrite?: boolean } = {}
): Record<string, BlockType> {
  const arr = Array.isArray(jsonOrArray) ? jsonOrArray : JSON.parse(jsonOrArray);
  const map: Record<string, BlockType> = Object.create(null);
  for (const b of arr) {
    if (!allowOverwrite && map[b.id]) throw new Error(`Duplicate id "${b.id}"`);
    map[b.id] = { ...b, metatags: b.metatags ? [...b.metatags] : undefined };
  }
  if (mergeAsteroids) for (const a of getAllAsteroidBlockTypes()) if (!map[a.id]) map[a.id] = a;
  return map;
}

export async function createBlockRegistryFromUrl(
  url: string,
  opts: { mergeAsteroids?: boolean; allowOverwrite?: boolean } = {}
): Promise<Record<string, BlockType>> {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to fetch block registry: ${res.status} ${res.statusText}`);
  const arr = (await res.json()) as BlockType[];
  return createBlockRegistryFromJson(arr, opts);
}

// ──────────────────────────────────────────────────────────────────────────────
// Explicit bootstrap entrypoint (no top-level await)
// Call this once at app startup.
// ──────────────────────────────────────────────────────────────────────────────
let _initialized = false;

export async function initializeBlockRegistry(opts: {
  url?: string;
  mergeAsteroids?: boolean;
} = {}): Promise<void> {
  if (_initialized) return;
  const url = opts.url ?? getAssetPath('assets/blocks/BlockRegistry.json');
  const map = await createBlockRegistryFromUrl(url, { mergeAsteroids: opts.mergeAsteroids ?? true });
  setBlockTypeMap(map);

  // Safety merge retained (idempotent)
  if (opts.mergeAsteroids ?? true) {
    for (const asteroidType of getAllAsteroidBlockTypes()) {
      blockTypes[asteroidType.id] = asteroidType;
    }
  }

  rebuildDerivedTables();
  _initialized = true;
}

// ──────────────────────────────────────────────────────────────────────────────
// Affinity chains (now rebuilt explicitly)
// ──────────────────────────────────────────────────────────────────────────────
let affinityUpgradeChains: Map<string, BlockType[]> = new Map();

export function getNextTierBlock(current: BlockType, delta: number): BlockType | undefined {
  const [tag] = current.metatags ?? [];
  if (!tag) return undefined;
  const chain = affinityUpgradeChains.get(tag);
  if (!chain) return undefined;
  const index = chain.findIndex((b) => b.id === current.id);
  if (index === -1) return undefined;
  const newIndex = Math.min(Math.max(index + delta, 0), chain.length - 1);
  return chain[newIndex];
}

export function getAffinityChainFor(block: BlockType): BlockType[] {
  const [tag] = block.metatags ?? [];
  return tag ? (affinityUpgradeChains.get(tag) ?? []) : [];
}

// ──────────────────────────────────────────────────────────────────────────────
// Unified Accessors (unchanged)
// ──────────────────────────────────────────────────────────────────────────────
export function getAllBlockTypes(): BlockType[] {
  return Object.values(blockTypes);
}
export function getBlockType(id: string): BlockType | undefined { return blockTypes[id]; }
export function getBlockCost(id: string): number | undefined { return blockTypes[id]?.cost; }
export function getAllBlocksInTier(tier: number): BlockType[] {
  return Object.values(blockTypes).filter(
    (block) => getTierFromBlockId(block.id) === tier && !block.id.includes('cockpit')
  );
}
export function getRandomBlockInTier(tier: number): BlockType { return randomFromArray(getAllBlocksInTier(tier)); }
export function getEngineBlockInTier(tier: number): BlockType { return blockTypes[`engine${tier}`]; }
export function getWeaponBlockInTier(tier: number): BlockType {
  const weaponBlocks = Object.values(blockTypes).filter(
    (block) => getTierFromBlockId(block.id) === tier && block.category === 'weapon'
  );
  if (weaponBlocks.length === 0) throw new Error(`No weapon blocks found for tier ${tier}`);
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
// Numeric lookup tables (now mutable + rebuilt explicitly)
// Keep exported names stable; callers that import these as values will still work.
// ──────────────────────────────────────────────────────────────────────────────
export let BlockTypeIndex: Record<string, number> = Object.create(null);
export let BlockTypesByIndex: BlockType[] = [];
export let BlockTypeMass: Float32Array = new Float32Array(0);
export let BlockAtlasKeyByIndex: Int32Array = new Int32Array(0);

export function getBlockTypeByIndex(index: number): BlockType | undefined {
  return BlockTypesByIndex[index];
}
export function getBlockIndexByType(id: string): number | undefined {
  return BlockTypeIndex[id];
}
export function getAtlasKeyByIndex(index: number): number {
  return BlockAtlasKeyByIndex[index];
}

/**
 * Recompute all derived structures from the current `blockTypes` snapshot.
 * Invoke after any wholesale replacement of the registry.
 */
export function rebuildDerivedTables(): void {
  // Rebuild affinity chains
  const chains = new Map<string, BlockType[]>();
  for (const block of Object.values(blockTypes)) {
    const [tag] = block.metatags ?? [];
    if (!tag) continue;
    let arr = chains.get(tag);
    if (!arr) chains.set(tag, (arr = []));
    arr.push(block);
  }
  for (const arr of chains.values()) arr.sort((a, b) => a.tier - b.tier);
  affinityUpgradeChains = chains;

  // Rebuild numeric mirrors
  BlockTypeIndex = Object.create(null);
  BlockTypesByIndex = [];

  const types = Object.values(blockTypes);
  const mass = new Float32Array(types.length);
  const atlasKeys = new Int32Array(types.length);

  types.forEach((t, i) => {
    BlockTypeIndex[t.id] = i;
    BlockTypesByIndex[i] = t;
    mass[i] = t.mass ?? 0;
    atlasKeys[i] = i; // identity; can be remapped later
  });

  BlockTypeMass = mass;
  BlockAtlasKeyByIndex = atlasKeys;
}

// ──────────────────────────────────────────────────────────────────────────────
// Serialization utilities (unchanged)
// ──────────────────────────────────────────────────────────────────────────────
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

export function downloadBlockRegistryAsJson(filename = 'BlockRegistry.json', pretty = true): void {
  const json = blockRegistryToJson(pretty);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
