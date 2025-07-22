// src/shared/hashUtils.ts

export function hashStringToInt32(str: string): number {
  let hash = 0x811c9dc5; // FNV-1a offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0; // FNV-1a prime, force unsigned 32-bit
  }
  return hash >>> 0; // Ensure non-negative
}
