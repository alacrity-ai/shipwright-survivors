// src/shared/isElectron.ts

export function isElectron(): boolean {
  return typeof window !== 'undefined' &&
    typeof navigator === 'object' &&
    navigator.userAgent.toLowerCase().includes('electron');
}
