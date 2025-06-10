// src/systems/pickups/helpers/getTierFromBlockId.ts

export function getTierFromBlockId(id: string): number {
  if (id.startsWith('cockpit')) return 10;
  const match = id.match(/(\d{1,2})$/);
  return match ? parseInt(match[1], 10) : 0;
}
