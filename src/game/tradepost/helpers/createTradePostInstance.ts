// src/game/tradepost/helpers/createTradePostInstance.ts

import type { TradePostInstance } from '@/game/tradepost/interfaces/TradePostInstance';
import type { TradePost, TradePostItemEntry } from '@/game/tradepost/interfaces/TradePost';
import type { PurchaseableItem } from '@/game/tradepost/interfaces/PurchaseableItem';

import { getBlockType } from '@/game/blocks/BlockRegistry';

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
  const stock: number[] = def.items.map(e => e.quantity);

  return {
    id: def.id,

    getRemainingQuantity(index: number): number {
      return stock[index] ?? 0;
    },

    canAfford(index: number): boolean {
      const entry = def.items[index];
      if (!entry || stock[index] <= 0) return false;
      const blockIds = PlayerResources.getInstance().getBlockQueue().map(b => b.id);
      return multisetContains(blockIds, entry.item.wants);
    },

    executeTransaction(index: number): boolean {
      const entry = def.items[index];
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
        missionResultStore.addShipDiscovery(item.id);
        collection.discover(item.id);
        collection.unlock(item.id);
      }

      stock[index] -= 1;
      return true;
    },

    getAvailableItems() {
      const out: { entry: TradePostItemEntry; index: number }[] = [];
      for (let i = 0; i < def.items.length; i++) {
        if (this.canAfford(i)) {
          out.push({ entry: def.items[i], index: i });
        }
      }
      return out;
    },

    getAllEntries(): TradePostItemEntry[] {
      return def.items;
    },

    getOriginalDefinition(): TradePost {
      return def;
    }
  };
}
