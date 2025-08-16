// src/game/waves/io/serde.ts
import type { WaveDefinition, WaveShipEntry } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';
import type { BehaviorProfile } from '@/systems/ai/types/BehaviorProfile';
import { behaviorRegistry } from '@/game/waves/io/BehaviorRegistry';
import type { WavesFileJSON, WaveJSON, WaveShipEntryJSON } from '@/game/waves/io/WaveJSON';

// ---------- helpers ----------
const isEqualShallow = (a: any, b: any) => {
  // fast shallow compare used for affix dedup; can be replaced w/ deep compare if needed
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (a[k] !== b[k]) return false;
  return true;
};

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

function toFiniteOrInfinity(n?: number | "Infinity"): number | undefined {
  if (n === undefined) return undefined;
  return n === "Infinity" ? Infinity : n;
}

function toInfinityString(n?: number): number | "Infinity" | undefined {
  if (n === undefined) return undefined;
  return n === Infinity ? "Infinity" : n;
}

// ---------- LOADER ----------
export function loadWavesFromJSON(json: WavesFileJSON): WaveDefinition[] {
  if (json.version !== 1) throw new Error(`Unsupported waves file version: ${json.version}`);

  const affixesMap = json.affixes ?? {};
  const behaviorsMap = json.behaviors ?? {};

  const resolveAffixes = (ref?: string, inline?: ShipAffixes): ShipAffixes | undefined => {
    if (inline) return deepClone(inline);
    if (ref) {
      const a = affixesMap[ref];
      if (!a) throw new Error(`Unknown affixesRef '${ref}'`);
      return deepClone(a);
    }
    return undefined;
  };

  const resolveBehavior = (ref?: string, inline?: { preset: string; params?: any }): BehaviorProfile | undefined => {
    const spec = inline ?? (ref ? behaviorsMap[ref] : undefined);
    if (!spec) return undefined;
    return behaviorRegistry.create(spec.preset, spec.params);
  };

  const waves: WaveDefinition[] = json.waves.map((w): WaveDefinition => ({
    mods: deepClone(w.mods),
    ships: w.ships.map((s): WaveShipEntry => ({
      shipId: s.shipId,
      count: s.count,
      hunter: s.hunter,
      noClip: s.noClip,
      behaviorProfile: resolveBehavior(s.behaviorRef, s.behavior),
      affixes: resolveAffixes(s.affixesRef, s.affixes),
      onAllDefeated: s.onAllDefeated
    })),
    incidents: w.incidents ? deepClone(w.incidents) : undefined,
    formations: w.formations ? deepClone(w.formations) : undefined,
    music: w.music,
    lightingSettings: w.lightingSettings ? deepClone(w.lightingSettings) : undefined,
    duration: toFiniteOrInfinity(w.duration),
    spawnDistribution: w.spawnDistribution,
    atCoords: w.atCoords ? deepClone(w.atCoords) : undefined,
    isBoss: w.isBoss,
    sustainMode: w.sustainMode,
    spawnDelay: w.spawnDelay
  }));

  return waves;
}

// ---------- SERIALIZER ----------
// Produces deduped registries + waves w/ refs when possible.
export function saveWavesToJSON(waves: WaveDefinition[]): WavesFileJSON {
  const affixesRegistry: Record<string, ShipAffixes> = {};
  const behaviorsRegistry: Record<string, { preset: string; params?: any }> = {};

  const affixEntries: { id: string; value: ShipAffixes }[] = [];
  const behaviorEntries: { id: string; value: { preset: string; params?: any } }[] = [];

  const affixIdFor = (a: ShipAffixes): string => {
    // Try find existing shallow-equal; else assign new
    const found = affixEntries.find(e => isEqualShallow(e.value, a));
    if (found) return found.id;
    const id = inferAffixId(a, affixEntries.length);
    affixEntries.push({ id, value: a });
    return id;
  };

  const behaviorIdFor = (b: BehaviorProfile): string => {
    // We can only ref behaviors that came from a preset; infer by heuristic:
    // expect (.preset in b as metadata) OR rely on app-side metadata
    const preset = (b as any).__preset ?? 'siege'; // fallback (customize if you embed metadata)
    const params = (b as any).params ?? {};
    const existing = behaviorEntries.find(e => e.value.preset === preset && isEqualShallow(e.value.params ?? {}, params));
    if (existing) return existing.id;
    const id = inferBehaviorId(preset, behaviorEntries.length, params);
    behaviorEntries.push({ id, value: { preset, params } });
    return id;
  };

  const wavesJSON: WaveJSON[] = waves.map(w => ({
    mods: deepClone(w.mods),
    ships: w.ships.map((s): WaveShipEntryJSON => {
      const out: WaveShipEntryJSON = {
        shipId: s.shipId,
        count: s.count,
        hunter: s.hunter,
        noClip: s.noClip,
        onAllDefeated: s.onAllDefeated
      };
      if (s.affixes) out.affixesRef = affixIdFor(s.affixes);
      if (s.behaviorProfile) out.behaviorRef = behaviorIdFor(s.behaviorProfile as BehaviorProfile);
      return out;
    }),
    incidents: w.incidents ? deepClone(w.incidents) : undefined,
    formations: w.formations ? deepClone(w.formations) : undefined,
    music: w.music,
    lightingSettings: w.lightingSettings ? deepClone(w.lightingSettings) : undefined,
    duration: toInfinityString(w.duration),
    spawnDistribution: w.spawnDistribution,
    atCoords: w.atCoords ? deepClone(w.atCoords) : undefined,
    isBoss: w.isBoss,
    sustainMode: w.sustainMode,
    spawnDelay: w.spawnDelay
  }));

  for (const e of affixEntries) affixesRegistry[e.id] = e.value;
  for (const e of behaviorEntries) behaviorsRegistry[e.id] = e.value;

  return {
    version: 1,
    affixes: Object.keys(affixesRegistry).length ? affixesRegistry : undefined,
    behaviors: Object.keys(behaviorsRegistry).length ? behaviorsRegistry : undefined,
    waves: wavesJSON
  };
}

// ---------- ID inference helpers ----------
function inferAffixId(a: ShipAffixes, idx: number): string {
  // Heuristic to stable-name common shapes; else generic.
  if (a.thrustPowerMulti && a.turnPowerMulti && Object.keys(a).length <= 2) {
    const t = a.thrustPowerMulti.toFixed(2).replace('.', '_');
    const r = a.turnPowerMulti.toFixed(2).replace('.', '_');
    return `THRUST_${t}__TURN_${r}`;
  }
  return `AFFIX_${idx.toString().padStart(3, '0')}`;
}

function inferBehaviorId(preset: string, idx: number, params: any): string {
  const e = (v: any) => (v === undefined ? '' : String(v));
  if (preset === 'siege' && params) {
    return `SIEGE_${e(params.engagementRange)}_${e(params.disengageRange)}_${e(params.siegeRange)}`;
  }
  return `${preset.toUpperCase()}_${idx.toString().padStart(3, '0')}`;
}
