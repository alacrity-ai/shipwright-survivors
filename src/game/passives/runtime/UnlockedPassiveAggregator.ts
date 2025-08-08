// src/game/passives/runtime/UnlockedPassiveAggregator.ts

import type { PassiveNodeMetadata } from '../interfaces/PassiveNodeMetadata';
import type { PassiveNode } from '../interfaces/PassiveNode';
import { PlayerGlobalPassiveManager } from '@/game/player/PlayerGlobalPassiveManager';

/**
 * Aggregates metadata from all unlocked global passive nodes into a single object.
 * - GC-neutral: returns a stable object reference; mutates it in-place on changes.
 * - Cache invalidation is version-based via PlayerGlobalPassiveManager.
 */
export class UnlockedPassiveAggregator {
  /** Stable reference returned to consumers */
  private static _cache: PassiveNodeMetadata = {};

  /** Version observed during last recomputation */
  private static _lastVersion = -1;

  /**
   * Returns the aggregated passive metadata.
   * Recomputes lazily if the manager's version has changed.
   */
  public static getAggregatedPassives(): PassiveNodeMetadata {
    const mgr = PlayerGlobalPassiveManager.getInstance();
    const currentVersion = mgr.getVersion();

    if (currentVersion !== this._lastVersion) {
      this.recompute(mgr);
      this._lastVersion = currentVersion;
    }
    return this._cache;
  }

  /** Force a recompute (rare; tests/tools) */
  public static forceRecompute(): void {
    const mgr = PlayerGlobalPassiveManager.getInstance();
    this.recompute(mgr);
    this._lastVersion = mgr.getVersion();
  }

  // === Internal ===

  private static recompute(mgr: PlayerGlobalPassiveManager): void {
    // Clear existing keys without replacing the object reference.
    // This minimizes churn for consumer references and avoids allocations.
    for (const k in this._cache) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (this._cache as any)[k];
    }

    // Aggregate over unlocked nodes without allocating arrays.
    mgr.forEachUnlockedNode((node: PassiveNode) => {
      const meta = node.metadata;
      for (const rawKey in meta) {
        const key = rawKey as keyof PassiveNodeMetadata;
        const value = meta[key];
        if (value == null) continue;

        const current = this._cache[key];

        if (typeof value === 'number') {
          (this._cache as any)[key] = (typeof current === 'number' ? current : 0) + value;
        }
        else if (typeof value === 'boolean') {
          (this._cache as any)[key] = Boolean(current) || value;
        }
        else if (Array.isArray(value)) {
          // Deduplicate with minimal churn; arrays are expected to be small.
          if (Array.isArray(current)) {
            // Append only missing elements
            const dst = current as unknown as unknown[];
            for (let i = 0; i < value.length; i++) {
              const v = value[i];
              // includes() is fine for small arrays; replace if profiling warrants
              if (!dst.includes(v)) (dst as any).push(v);
            }
          } else {
            // Copy once; consumers should treat arrays as read-only
            (this._cache as any)[key] = value.slice();
          }
        }
        else if (typeof value === 'string') {
          // Overwrite string keys by design (rare use-case)
          (this._cache as any)[key] = value;
        }
        else {
          // Unknown type — ignore but warn for authorship mistakes
          // eslint-disable-next-line no-console
          console.warn(`[UnlockedPassiveAggregator] Unhandled metadata type for key: ${String(key)}`, value);
        }
      }
    });
  }
}
