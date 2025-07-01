// src/game/tradepost/interfaces/PurchaseableItem.ts

// Defines an item that can be purchased in a tradepost.
// It can be either a block (to enqueue into PlayerResources) or a ship blueprint.

export type PurchaseableItem =
  | {
      type: 'block';
      id: string;               // BlockType.id
      wants: string[];          // Required block type IDs (e.g., ['turret-mk1', 'turret-mk1', 'turret-mk1'])
      label?: string;           // Optional override display label
      quantity?: number;        // Optional quantity (default 1)
    }
  | {
      type: 'ship';
      id: string;               // ShipDefinition.name
      wants: string[];          // Required block type IDs
      label?: string;           // Optional override display label
      quantity?: number;        // Optional quantity (default 1)
    };
