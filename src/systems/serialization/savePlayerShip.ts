// src/systems/serialization/savePlayerShip.ts

import { Ship } from '@/game/ship/Ship';
import { serializeShip } from '@/systems/serialization/ShipSerializer';

/**
 * Saves the current player ship to a JSON string.
 * @param ship The player’s ship to save.
 * @param filename The desired filename for saving the ship (e.g., 'player_ship.json').
 * @returns A promise indicating when the ship is saved.
 */
export function savePlayerShip(ship: Ship, filename: string): void {
  const serializedShip = serializeShip(ship);
  const jsonString = JSON.stringify(serializedShip, null, 2); // Pretty print with 2 spaces

  // Saving to localStorage (For browser-based use)
  localStorage.setItem(filename, jsonString);

  // Optionally: Create a Blob and trigger download for systems that allow file saving
  const blob = new Blob([jsonString], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
