// src/game/tradepost/registry/TradePostRegistry.ts

import type { TradePost } from '@/game/tradepost/interfaces/TradePost';
import type { TradePostInstance } from '@/game/tradepost/interfaces/TradePostInstance';

import { createTradePostInstance } from '@/game/tradepost/helpers/createTradePostInstance';

import { mission1TradePost0 } from './definitions/mission1TradePost0';
import { mission2TradePost0 } from './definitions/mission2TradePost0';
import { mission2TradePost1 } from './definitions/mission2TradePost1';
import { mission3TradePost0 } from './definitions/mission3TradePost0';

const tradePostMap: Map<string, TradePost> = new Map();

function registerTradePost(def: TradePost): void {
  if (tradePostMap.has(def.id)) {
    throw new Error(`Duplicate tradepost registration: ${def.id}`);
  }
  tradePostMap.set(def.id, def);
}

// === Register All TradePosts ===
registerTradePost(mission1TradePost0);
registerTradePost(mission2TradePost0);
registerTradePost(mission2TradePost1);
registerTradePost(mission3TradePost0);

export const TradePostRegistry = {
  getById(id: string): TradePost {
    const post = tradePostMap.get(id);
    if (!post) {
      throw new Error(`TradePost with ID "${id}" not found in registry`);
    }
    return post;
  },

  getAll(): TradePost[] {
    return Array.from(tradePostMap.values());
  },

  getInstanceById(id: string): TradePostInstance {
    const def = this.getById(id);
    return createTradePostInstance(def);
  }
};
