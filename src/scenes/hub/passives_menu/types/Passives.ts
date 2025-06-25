import type { PassiveId } from '@/game/player/PlayerPassiveManager';
import type { PassiveTier } from '@/game/player/PlayerPassiveManager';

export type PassiveCategory = 'offense' | 'defense' | 'utility';

export const PassiveCategoryLabels: Record<PassiveCategory, string> = {
  offense: 'Offense',
  defense: 'Defense',
  utility: 'Utility'
};

interface PassiveMetadataEntry {
  label: string;
  category: PassiveCategory;
  tiers: Record<PassiveTier, number | string>;
  unit?: string;
  description?: string;
}

export const PassiveMetadata: Record<PassiveId, PassiveMetadataEntry> = {
  'harvester-range': {
    label: 'Harvester Range',
    category: 'utility',
    tiers: { 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 },
    unit: '%'
  },
  'laser-damage': {
    label: 'Laser Damage',
    category: 'offense',
    tiers: { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 },
    unit: '%'
  },
  'laser-energy-drain': {
    label: 'Laser Energy Drain',
    category: 'offense',
    tiers: { 1: -10, 2: -20, 3: -30, 4: -40, 5: -50 },
    unit: '%'
  },
  'explosive-lance-radius': {
    label: 'Explosive Lance Radius',
    category: 'offense',
    tiers: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }
  },
  'explosive-lance-firing-rate': {
    label: 'Explosive Lance Firing Rate',
    category: 'offense',
    tiers: { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 },
    unit: '%'
  },
  'block-durability': {
    label: 'Block Durability',
    category: 'defense',
    tiers: { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 },
    unit: '%'
  },
  'fin-turn-power': {
    label: 'Fin Turn Power',
    category: 'utility',
    tiers: { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50 },
    unit: '%'
  },
  'engine-thrust': {
    label: 'Engine Thrust',
    category: 'utility',
    tiers: { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50 },
    unit: '%'
  },
  'charger-rate': {
    label: 'Charger Rate',
    category: 'utility',
    tiers: { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50 },
    unit: '%'
  },
  'battery-capacity': {
    label: 'Battery Capacity',
    category: 'utility',
    tiers: { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50 },
    unit: '%'
  },
  'turret-firing-rate': {
    label: 'Turret Firing Rate',
    category: 'offense',
    tiers: { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 },
    unit: '%'
  },
  'turret-damage': {
    label: 'Turret Damage',
    category: 'offense',
    tiers: { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 },
    unit: '%'
  },
  'turret-accuracy': {
    label: 'Turret Accuracy',
    category: 'offense',
    tiers: { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50 },
    unit: '%'
  },
  'heat-seeker-damage': {
    label: 'Heat Seeker Damage',
    category: 'offense',
    tiers: { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 },
    unit: '%'
  },
  'heat-seeker-firing-rate': {
    label: 'Heat Seeker Firing Rate',
    category: 'offense',
    tiers: { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 },
    unit: '%'
  },
  'halo-blade-damage': {
    label: 'Halo Blade Damage',
    category: 'offense',
    tiers: { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 },
    unit: '%'
  },
  'halo-blade-size': {
    label: 'Halo Blade Size',
    category: 'offense',
    tiers: { 1: 15, 2: 30, 3: 45, 4: 60, 5: 75 },
    unit: '%'
  },
  'shield-energy-drain': {
    label: 'Shield Energy Drain',
    category: 'defense',
    tiers: { 1: -10, 2: -20, 3: -30, 4: -40, 5: -50 },
    unit: '%'
  },
  'shield-radius': {
    label: 'Shield Radius',
    category: 'defense',
    tiers: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }
  },
  'shield-efficiency': {
    label: 'Shield Efficiency',
    category: 'defense',
    tiers: { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50 },
    unit: '%'
  },
  'facetplate-armor': {
    label: 'Facetplate Armor',
    category: 'defense',
    tiers: { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50 },
    unit: '%'
  },
  'hull-armor': {
    label: 'Hull Armor',
    category: 'defense',
    tiers: { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50 },
    unit: '%'
  },
  'cockpit-armor': {
    label: 'Cockpit Armor',
    category: 'defense',
    tiers: { 1: 30, 2: 60, 3: 100, 4: 150, 5: 200 }
  },
  'repair-orb-drop-rate': {
    label: 'Repair Orb Drop Rate',
    category: 'utility',
    tiers: { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50 },
    unit: '%'
  },
  'entropium-pickup-bonus': {
    label: 'Entropium Pickup Bonus',
    category: 'utility',
    tiers: { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 },
    unit: '%'
  },
  'block-drop-rate': {
    label: 'Block Drop Rate',
    category: 'utility',
    tiers: { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50 },
    unit: '%'
  }
};
