// src/game/blocks/BlockRegistry.ts

import type { BlockType } from '@/game/interfaces/types/BlockType';

export const BLOCK_SIZE = 32;

const blockTypes: Record<string, BlockType> = {
  cockpit0: {
    id: 'cockpit0',
    name: 'Cockpit',
    armor: 20,
    cost: 50,
    mass: 50,
    behavior: { isCockpit: true },
    sprite: 'cockpit0',
    category: 'system',
    subcategory: 'system'
  },
  cockpit1: {
    id: 'cockpit1',
    name: 'Cockpit',
    armor: 150,
    cost: 50,
    mass: 50,
    behavior: { isCockpit: true },
    sprite: 'cockpit1',
    category: 'system',
    subcategory: 'system'
  },
  hull0: {
    id: 'hull0',
    name: 'Hull Mk 0',
    armor: 15,
    mass: 50,
    cost: 20,
    sprite: 'hull0',
    category: 'system',
    subcategory: 'hull'
  },
  hull1: {
    id: 'hull1',
    name: 'Hull Mk I',
    armor: 50,
    mass: 50,
    cost: 20,
    sprite: 'hull1',
    category: 'hull',
    subcategory: 'hull'
  },
  hull2: {
    id: 'hull2',
    name: 'Hull Mk II',
    armor: 75,
    mass: 60,
    cost: 40,
    sprite: 'hull2',
    category: 'hull',
    subcategory: 'hull'
  },
  hull3: {
    id: 'hull3',
    name: 'Hull Mk III',
    armor: 100,
    mass: 75,
    cost: 80,
    sprite: 'hull3',
    category: 'hull',
    subcategory: 'hull'
  },
  hull4: {
    id: 'hull4',
    name: 'Hull Mk IV',
    armor: 180,
    mass: 90,
    cost: 150,
    sprite: 'hull4',
    category: 'hull',
    subcategory: 'hull'
  },
  facetplate0: {
    id: 'facetplate0',
    name: 'Facetplate Mk 0',
    armor: 20,
    mass: 30,
    cost: 30,
    sprite: 'facetplate0',
    category: 'system',
    subcategory: 'system'
  },
  facetplate1: {
    id: 'facetplate1',
    name: 'Facetplate Mk I',
    armor: 75,
    mass: 30,
    cost: 30,
    sprite: 'facetplate1',
    category: 'hull',
    subcategory: 'facetplate'
  },
  facetplate2: {
    id: 'facetplate2',
    name: 'Facetplate Mk II',
    armor: 100,
    mass: 40,
    cost: 60,
    sprite: 'facetplate2',
    category: 'hull',
    subcategory: 'facetplate'
  },
  facetplate3: {
    id: 'facetplate3',
    name: 'Facetplate Mk III',
    armor: 125,
    mass: 50,
    cost: 100,
    sprite: 'facetplate3',
    category: 'hull',
    subcategory: 'facetplate'
  },
  facetplate4: {
    id: 'facetplate4',
    name: 'Facetplate Mk IV',
    armor: 150,
    mass: 60,
    cost: 150,
    sprite: 'facetplate4',
    category: 'hull',
    subcategory: 'facetplate'
  },
  turret0: {
    id: 'turret0',
    name: 'Turret Mk 0',
    armor: 20,
    cost: 40,
    mass: 40,
    sprite: 'turret0',
    behavior: {
      canFire: true,
      fire: {
        fireRate: 1,
        fireType: 'bullet',
        fireDamage: 2,
        projectileSpeed: 700,
        lifetime: 2.2,
        accuracy: 0.5
      } 
    },
    category: 'system',
    subcategory: 'system'
  },
  turret1: {
    id: 'turret1',
    name: 'Turret Mk I',
    armor: 40,
    cost: 40,
    mass: 40,
    sprite: 'turret1',
    behavior: {
      canFire: true,
      fire: {
        fireRate: 1,
        fireType: 'bullet',
        fireDamage: 10,
        projectileSpeed: 800,
        lifetime: 1.8,
        accuracy: 0.7
      } 
    },
    category: 'weapon',
    subcategory: 'turret'
  },
  turret2: {
    id: 'turret2',
    name: 'Turret Mk II',
    armor: 50,
    cost: 100,
    mass: 50,
    sprite: 'turret2',
    behavior: {
      canFire: true,
      fire: {
        fireRate: 2,
        fireType: 'bullet',
        fireDamage: 16,
        projectileSpeed: 800,
        lifetime: 2.2,
        accuracy: 0.8
      } 
    },
    category: 'weapon',
    subcategory: 'turret'
  },
  turret3: {
    id: 'turret3',
    name: 'Turret Mk III',
    armor: 75,
    cost: 200,
    mass: 60,
    sprite: 'turret3',
    behavior: {
      canFire: true,
      fire: {
        fireRate: 3,
        fireType: 'bullet',
        fireDamage: 20,
        projectileSpeed: 900,
        lifetime: 2.2,
        accuracy: 0.9
      } 
    },
    category: 'weapon',
    subcategory: 'turret'
  },
  turret4: {
    id: 'turret4',
    name: 'Turret Mk IV',
    armor: 100,
    cost: 400,
    mass: 100,
    sprite: 'turret4',
    behavior: {
      canFire: true,
      fire: {
        fireRate: 4,
        fireType: 'bullet',
        fireDamage: 30,
        projectileSpeed: 1000,
        lifetime: 2.2,
        accuracy: 0.95
      } 
    },
    category: 'weapon',
    subcategory: 'turret'
  },
  laser0: {
    id: 'laser0',
    name: 'Laser Emitter Mk 0',
    armor: 40,
    cost: 1000,
    mass: 100,
    sprite: 'laser0',
    category: 'system',
    subcategory: 'system',
    behavior: {
      canFire: true,
      fire: {
        fireType: 'laser',
        fireRate: 0,
        fireDamage: 1,
        projectileSpeed: 0,
        lifetime: 0, 
        accuracy: 1.0,
      },
    },
  },
  laser1: {
    id: 'laser1',
    name: 'Laser Emitter Mk I',
    armor: 80,
    cost: 1000,
    mass: 100,
    sprite: 'laser1',
    category: 'weapon',
    subcategory: 'laser',
    behavior: {
      canFire: true,
      fire: {
        fireType: 'laser',
        fireRate: 0,
        fireDamage: 1,
        projectileSpeed: 0,
        lifetime: 0,
        accuracy: 1.0,
      },
    },
  },
  reactor0: {
    id: 'reactor0',
    name: 'Reactor Mk 0',
    armor: 25,
    cost: 400,
    mass: 60,
    behavior: {
      energyOutput: 10,
    },
    sprite: 'reactor0',
    category: 'system',
    subcategory: 'system',
  },
  reactor1: {
    id: 'reactor1',
    name: 'Reactor Mk I',
    armor: 50,
    cost: 400,
    mass: 60,
    behavior: {
      energyOutput: 10,
    },
    sprite: 'reactor1',
    category: 'utility',
    subcategory: 'energy',
  },
  engine0: {
    id: 'engine0',
    name: 'Engine Mk 0',
    armor: 15,
    cost: 35,
    mass: 30,
    behavior: {
      canThrust: true,
      thrustPower: 25,
    },
    sprite: 'engine0',
    category: 'system',
    subcategory: 'system',
  },
  engine1: {
    id: 'engine1',
    name: 'Engine Mk I',
    armor: 40,
    cost: 35,
    mass: 30,
    behavior: {
      canThrust: true,
      thrustPower: 40,
    },
    sprite: 'engine1',
    category: 'engine',
    subcategory: 'engine',
  },
  engine2: {
    id: 'engine2',
    name: 'Engine Mk II',
    armor: 45,
    cost: 60,
    mass: 30,
    behavior: {
      canThrust: true,
      thrustPower: 60,
    },
    sprite: 'engine2',
    category: 'engine',
    subcategory: 'engine',
  },
  engine3: {
    id: 'engine3',
    name: 'Engine Mk III',
    armor: 50,
    cost: 80,
    mass: 30,
    behavior: {
      canThrust: true,
      thrustPower: 80,
    },
    sprite: 'engine3',
    category: 'engine',
    subcategory: 'engine',
  },
  engine4: {
    id: 'engine4',
    name: 'Engine Mk IV',
    armor: 55,
    mass: 30,
    cost: 160,
    behavior: {
      canThrust: true,
      thrustPower: 100,
    },
    sprite: 'engine4',
    category: 'engine',
    subcategory: 'engine',
  },
  fin0: {
    id: 'fin0',
    name: 'Fin Mk 0',
    armor: 10,
    mass: 20,
    cost: 30,
    behavior: {
      turnPower: 0.1,
    },
    sprite: 'fin0',
    category: 'system',
    subcategory: 'system',
  },
  fin1: {
    id: 'fin1',
    name: 'Fin Mk II',
    armor: 50,
    mass: 10,
    cost: 60,
    behavior: {
      turnPower: 1,
    },
    sprite: 'fin1',
    category: 'hull',
    subcategory: 'fin',
  },
  fin2: {
    id: 'fin2',
    name: 'Fin Mk III',
    armor: 75,
    mass: 10,
    cost: 120,
    behavior: {
      turnPower: 1.4,
    },
    sprite: 'fin2',
    category: 'hull',
    subcategory: 'fin',
  },
  fin3: {
    id: 'fin3',
    name: 'Fin Mk IV',
    armor: 100,
    mass: 10,
    cost: 180,
    behavior: {
      turnPower: 2,
    },
    sprite: 'fin3',
    category: 'hull',
    subcategory: 'fin',
  },
  fin4: {
    id: 'fin4',
    name: 'Fin Mk IV',
    armor: 150,
    mass: 10,
    cost: 250,
    behavior: {
      turnPower: 2.8,
    },
    sprite: 'fin4',
    category: 'hull',
    subcategory: 'fin',
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
