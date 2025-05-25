// src/game/blocks/BlockRegistry.ts

import type { BlockType } from '@/game/interfaces/types/BlockType';

export const BLOCK_SIZE = 32;

const blockTypes: Record<string, BlockType> = {
  cockpit: {
    id: 'cockpit',
    name: 'Cockpit',
    armor: 100,
    cost: 50,
    mass: 50,
    behavior: { isCockpit: true },
    sprite: 'cockpit',
    category: 'system',
  },
  hull0: {
    id: 'hull0',
    name: 'Hull Mk I',
    armor: 50,
    mass: 50,
    cost: 20,
    sprite: 'hull0',
    category: 'hull',
  },
  hull1: {
    id: 'hull1',
    name: 'Hull Mk II',
    armor: 75, // More armor
    mass: 60, // Slightly more mass
    cost: 40, // Higher cost
    sprite: 'hull1',
    category: 'hull',
  },
  hull2: {
    id: 'hull2',
    name: 'Hull Mk III',
    armor: 100, // More armor
    mass: 75, // Increased mass
    cost: 80, // Increased cost
    sprite: 'hull2',
    category: 'hull',
  },
  hull3: {
    id: 'hull3',
    name: 'Hull Mk IV',
    armor: 180, // Even more armor
    mass: 90, // Increased mass
    cost: 150, // Highest cost
    sprite: 'hull3',
    category: 'hull',
  },
  turret0: {
    id: 'turret0',
    name: 'Turret Mk I',
    armor: 40,
    cost: 40,
    mass: 40,
    sprite: 'turret0',
    behavior: {
      canFire: true,
      fire: {
        fireRate: 1,
        fireType: 'bullet',
        fireDamage: 10,
        projectileSpeed: 800,
        lifetime: 2.6,
        accuracy: 0.5
      } 
    },
    category: 'weapon',
  },
  turret1: {
    id: 'turret1',
    name: 'Turret Mk II',
    armor: 50,
    cost: 100,
    mass: 50,
    sprite: 'turret1',
    behavior: {
      canFire: true,
      fire: {
        fireRate: 2,
        fireType: 'bullet',
        fireDamage: 16,
        projectileSpeed: 800,
        lifetime: 2.6,
        accuracy: 0.6
      } 
    },
    category: 'weapon',
  },
  turret2: {
    id: 'turret2',
    name: 'Turret Mk III',
    armor: 75,
    cost: 200,
    mass: 60,
    sprite: 'turret2',
    behavior: {
      canFire: true,
      fire: {
        fireRate: 3,
        fireType: 'bullet',
        fireDamage: 20,
        projectileSpeed: 1000,
        lifetime: 2.2,
        accuracy: 0.7
      } 
    },
    category: 'weapon',
  },
  turret3: {
    id: 'turret3',
    name: 'Turret Mk IV',
    armor: 100,
    cost: 400,
    mass: 100,
    sprite: 'turret3',
    behavior: {
      canFire: true,
      fire: {
        fireRate: 4,
        fireType: 'bullet',
        fireDamage: 30,
        projectileSpeed: 1000,
        lifetime: 2.4,
        accuracy: 0.8
      } 
    },
    category: 'weapon',
  },
  engine0: {
    id: 'engine0',
    name: 'Engine Mk I',
    armor: 40,
    cost: 35,
    mass: 30,
    behavior: {
      canThrust: true,
      thrustPower: 10, // custom field
    },
    sprite: 'engine0',
    category: 'engine',
  },
  engine1: {
    id: 'engine1',
    name: 'Engine Mk II',
    armor: 45,
    cost: 60,
    mass: 30,
    behavior: {
      canThrust: true,
      thrustPower: 20,
    },
    sprite: 'engine1',
    category: 'engine',
  },
  engine2: {
    id: 'engine2',
    name: 'Engine Mk III',
    armor: 50,
    cost: 80,
    mass: 30,
    behavior: {
      canThrust: true,
      thrustPower: 40,
    },
    sprite: 'engine2',
    category: 'engine',
  },
  engine3: {
    id: 'engine3',
    name: 'Engine Mk IV',
    armor: 55,
    mass: 30,
    cost: 160,
    behavior: {
      canThrust: true,
      thrustPower: 100,
    },
    sprite: 'engine3',
    category: 'engine',
  },
  fin0: {
    id: 'fin0',
    name: 'Fin Mk I',
    armor: 20,
    mass: 20,
    cost: 30,
    behavior: {
      turnPower: 1,
    },
    sprite: 'fin0',
    category: 'hull',
  },
  fin1: {
    id: 'fin1',
    name: 'Fin Mk II',
    armor: 30,
    mass: 20,
    cost: 60,
    behavior: {
      turnPower: 3,
    },
    sprite: 'fin1',
    category: 'hull',
  },
  fin2: {
    id: 'fin2',
    name: 'Fin Mk III',
    armor: 50,
    mass: 20,
    cost: 120,
    behavior: {
      turnPower: 5,
    },
    sprite: 'fin2',
    category: 'hull',
  },
  fin3: {
    id: 'fin3',
    name: 'Fin Mk IV',
    armor: 75,
    mass: 20,
    cost: 200,
    behavior: {
      turnPower: 7,
    },
    sprite: 'fin3',
    category: 'hull',
  },
};

export function getAllBlockTypes(): BlockType[] {
  return Object.values(blockTypes);
}

export function getBlockType(id: string): BlockType | undefined {
  return blockTypes[id];
}

export function getBlockCost(id: string): number | undefined {
  const blockType = getBlockType(id);
  return blockType ? blockType.cost : undefined;
}
