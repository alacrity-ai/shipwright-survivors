// src/game/tradepost/helpers/createTradePostInstance.ts

import type { TradePostInstance } from '@/game/tradepost/interfaces/TradePostInstance';
import type { TradePost, TradePostItemEntry } from '@/game/tradepost/interfaces/TradePost';
import type { PurchaseableItem } from '@/game/tradepost/interfaces/PurchaseableItem';

import { getBlockType } from '@/game/blocks/BlockRegistry';

import { PlayerArtifactsManager } from '@/game/player/PlayerArtifactsManager';
import { ShipBlueprintRegistry } from '@/game/ship/ShipBlueprintRegistry';
import { getArtifactById } from '@/game/ship/artifacts/registry/ArtifactRegistry';

import { missionResultStore } from '@/game/missions/MissionResultStore';
import { PlayerResources } from '@/game/player/PlayerResources';
import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';

function multisetContains(inventory: string[], required: string[]): boolean {
  const inventoryCount = new Map<string, number>();
  for (const id of inventory) {
    inventoryCount.set(id, (inventoryCount.get(id) ?? 0) + 1);
  }

  for (const want of required) {
    const count = inventoryCount.get(want) ?? 0;
    if (count === 0) return false;
    inventoryCount.set(want, count - 1);
  }

  return true;
}

// Weighted sampling without replacement using priority sampling
function selectVisibleTradeItems(
  entries: TradePostItemEntry[],
  maxVisible: number,
): TradePostItemEntry[] {
  /* ───── 1. Partition ──────────────────────────────────────────────────── */
  const guaranteed      = entries.filter(e => e.guaranteed);
  const candidatePool   = entries.filter(e => !e.guaranteed);

  /* ───── 2. Purge already-unlocked ships ───────────────────────────────── */
  const shipCollection  = PlayerShipCollection.getInstance();
  const unlockedShipIds = new Set<string>(shipCollection.getUnlockedShipIds());
  const eligible        = candidatePool.filter(e =>
    e.item.type !== 'ship' || !unlockedShipIds.has(e.item.id),
  );

  /* ───── 3. Priority-sampling selection ───────────────────────────────── */
  const slotsRemaining  = Math.max(0, maxVisible - guaranteed.length);
  const keyed = eligible.flatMap(entry => {
    const weight = entry.appearanceChance ?? 1.0;
    return weight > 0
      ? [{ entry, priority: -Math.log(Math.random()) / weight }]
      : [];                               // weight ≤ 0 ⇒ impossible
  });

  keyed.sort((a, b) => a.priority - b.priority);         // ascending = lowest priority wins
  const selected = keyed.slice(0, slotsRemaining).map(k => k.entry);

  return [...guaranteed, ...selected];
}


function consumeBlocks(required: string[]): boolean {
  const player = PlayerResources.getInstance();
  const requiredCopy = [...required];

  while (requiredCopy.length > 0) {
    const queue = player.getBlockQueue(); // Fetch up-to-date queue
    let found = false;

    for (let i = 0; i < queue.length; i++) {
      if (queue[i].id === requiredCopy[0]) {
        player.removeBlockAt(i);
        requiredCopy.shift(); // Remove from requirements list
        found = true;
        break; // Re-enter while-loop with fresh queue
      }
    }

    if (!found) {
      return false; // Could not find required block
    }
  }

  return true;
}

export function createTradePostInstance(def: TradePost): TradePostInstance {
  const visibleItems = selectVisibleTradeItems(
    def.items,
    def.metaData?.maxVisibleItems ?? 3
  );

  const stock: number[] = visibleItems.map(e => e.quantity);

  return {
    id: def.id,

    getRemainingQuantity(index: number): number {
      return stock[index] ?? 0;
    },

    canAfford(index: number): boolean {
      const entry = visibleItems[index];
      if (!entry || stock[index] <= 0) return false;

      const { item } = entry;

      // Artifact: skip if already unlocked
      if (item.type === 'artifact' && PlayerArtifactsManager.getInstance().isUnlocked(item.id)) {
        return false;
      }

      const blockIds = PlayerResources.getInstance().getBlockQueue().map(b => b.id);
      return multisetContains(blockIds, item.wants);
    },

    executeTransaction(index: number): boolean {
      const entry = visibleItems[index];
      if (!entry || stock[index] <= 0) return false;
      if (!this.canAfford(index)) return false;

      if (!consumeBlocks(entry.item.wants)) return false;

      const item = entry.item;
      const player = PlayerResources.getInstance();

      if (item.type === 'block') {
        const blockType = getBlockType(item.id);
        player.enqueueBlockToFront(blockType!);

      } else if (item.type === 'ship') {
        const collection = PlayerShipCollection.getInstance();
        const shipName = ShipBlueprintRegistry.getByName(item.id)?.name
        if (!shipName) {
          console.warn(`[createTradePostInstance] Tried to unlock ship that doesn't exist: ${item.id}`);
          return false;
        }

        missionResultStore.addShipDiscovery(shipName);
        collection.discover(shipName);
        collection.unlock(shipName);
      } else if (item.type === 'artifact') {
        const artifacts = PlayerArtifactsManager.getInstance();

        // Guard against unlocking twice (redundant, but defensive)
        if (!artifacts.isUnlocked(item.id)) {
          artifacts.unlockArtifact(item.id);
        }
      }

      stock[index] -= 1;
      return true;
    },

    getAvailableItems() {
      const out: { entry: TradePostItemEntry; index: number }[] = [];
      for (let i = 0; i < visibleItems.length; i++) {
        if (this.canAfford(i)) {
          out.push({ entry: visibleItems[i], index: i });
        }
      }
      return out;
    },

    getAllEntries(): TradePostItemEntry[] {
      return visibleItems;
    },

    getOriginalDefinition(): TradePost {
      return def;
    }
  };
}
