// src/scenes/hub/passives_menu/types/Passives.ts

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
  tiers: Record<PassiveTier, number | string>; // Numeric or formatted string
  unit?: string; // Optional, e.g. "%", "+" for cosmetic UI
  description?: string; // Optional: future tooltip
}

export const PassiveMetadata: Record<PassiveId, PassiveMetadataEntry> = {
  'harvester-range': {
    label: 'Harvester Range',
    category: 'utility',
    tiers: { 1: 20, 2: 40, 3: 60 },
    unit: '%'
  },
  'laser-damage': {
    label: 'Laser Damage',
    category: 'offense',
    tiers: { 1: 5, 2: 10, 3: 15 },
    unit: '%'
  },
  'laser-energy-drain': {
    label: 'Laser Energy Drain',
    category: 'offense',
    tiers: { 1: -10, 2: -20, 3: -30 },
    unit: '%'
  },
  'laser-block-cost': {
    label: 'Laser Block Cost',
    category: 'offense',
    tiers: { 1: -10, 2: -20, 3: -30 },
    unit: '%'
  },
  'explosive-lance-radius': {
    label: 'Explosive Lance Radius',
    category: 'offense',
    tiers: { 1: 1, 2: 2, 3: 3 }
  },
  'explosive-lance-firing-rate': {
    label: 'Explosive Lance Firing Rate',
    category: 'offense',
    tiers: { 1: 5, 2: 10, 3: 15 },
    unit: '%'
  },
  'block-durability': {
    label: 'Block Durability',
    category: 'defense',
    tiers: { 1: 5, 2: 10, 3: 15 },
    unit: '%'
  },
  'fin-turn-power': {
    label: 'Fin Turn Power',
    category: 'utility',
    tiers: { 1: 10, 2: 20, 3: 30 },
    unit: '%'
  },
  'engine-thrust': {
    label: 'Engine Thrust',
    category: 'utility',
    tiers: { 1: 10, 2: 20, 3: 30 },
    unit: '%'
  },
  'charger-rate': {
    label: 'Charger Rate',
    category: 'utility',
    tiers: { 1: 10, 2: 20, 3: 30 },
    unit: '%'
  },
  'battery-capacity': {
    label: 'Battery Capacity',
    category: 'utility',
    tiers: { 1: 10, 2: 20, 3: 30 },
    unit: '%'
  },
  'turret-firing-rate': {
    label: 'Turret Firing Rate',
    category: 'offense',
    tiers: { 1: 5, 2: 10, 3: 15 },
    unit: '%'
  },
  'turret-damage': {
    label: 'Turret Damage',
    category: 'offense',
    tiers: { 1: 5, 2: 10, 3: 15 },
    unit: '%'
  },
  'turret-accuracy': {
    label: 'Turret Accuracy',
    category: 'offense',
    tiers: { 1: 10, 2: 20, 3: 30 },
    unit: '%'
  },
  'shield-energy-drain': {
    label: 'Shield Energy Drain',
    category: 'defense',
    tiers: { 1: -10, 2: -20, 3: -30 },
    unit: '%'
  },
  'shield-radius': {
    label: 'Shield Radius',
    category: 'defense',
    tiers: { 1: 1, 2: 2, 3: 3 }
  },
  'shield-efficiency': {
    label: 'Shield Efficiency',
    category: 'defense',
    tiers: { 1: 10, 2: 20, 3: 30 },
    unit: '%'
  },
  'facetplate-armor': {
    label: 'Facetplate Armor',
    category: 'defense',
    tiers: { 1: 10, 2: 20, 3: 30 },
    unit: '%'
  },
  'hull-armor': {
    label: 'Hull Armor',
    category: 'defense',
    tiers: { 1: 10, 2: 20, 3: 30 },
    unit: '%'
  },
  'hull-mass': {
    label: 'Hull Mass',
    category: 'utility',
    tiers: { 1: -10, 2: -20, 3: -30 },
    unit: '%'
  },
  'cockpit-armor': {
    label: 'Cockpit Armor',
    category: 'defense',
    tiers: { 1: 30, 2: 60, 3: 100 }
  },
  'block-repair-cost': {
    label: 'Block Repair Cost',
    category: 'utility',
    tiers: { 1: -10, 2: -20, 3: -30 },
    unit: '%'
  },
  'entropium-pickup-bonus': {
    label: 'Entropium Pickup Bonus',
    category: 'utility',
    tiers: { 1: 5, 2: 10, 3: 15 },
    unit: '%'
  },
  'block-drop-rate': {
    label: 'Block Drop Rate',
    category: 'utility',
    tiers: { 1: 10, 2: 20, 3: 30 },
    unit: '%'
  },
};
