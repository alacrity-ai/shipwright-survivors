// Example: src/game/pickups/CurrencyPickupType.ts

import type { PickupType } from '@/game/interfaces/types/PickupType';

export const currencyPickupType: PickupType = {
  id: 'currencyGoldCoin',
  name: 'Gold Coin',
  sprite: 'gold_coin_sprite.png',
  currencyAmount: 100,  // For example, this pickup gives 100 units of currency
  category: 'currency',
};
