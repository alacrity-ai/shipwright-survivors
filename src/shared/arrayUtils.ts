// src/shared/arrayUtils.ts

export function randomFromArray<T>(arr: readonly T[]): T {
  if (!arr.length) {
    throw new Error('randomFromArray: cannot select from an empty array');
  }
  const index = Math.floor(Math.random() * arr.length);
  return arr[index];
}
