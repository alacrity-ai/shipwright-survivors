// src/ui/utils/getStyleIdFromTier.ts

export function getStyleIdFromTier(tier: number): 'gray' | 'green' | 'blue' | 'purple' | 'gold' {
  switch (tier) {
    case 0: return 'gray';
    case 1: return 'gray';
    case 2: return 'green';
    case 3: return 'blue';
    case 4: return 'purple';
    case 5: return 'gold';
    default: return 'gray';
  }
}
