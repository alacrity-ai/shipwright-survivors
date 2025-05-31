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
    armor: 150,
    mass: 90,
    cost: 140,
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
    armor: 175,
    mass: 60,
    cost: 120,
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
  explosiveLance0: {
    id: 'explosiveLance0',
    name: 'Explosive Lance Mk 0',
    armor: 60,
    cost: 120,
    mass: 80,
    sprite: 'explosiveLance0',
    category: 'system',
    subcategory: 'system',
    behavior: {
      canFire: true,
      fire: {
        fireRate: 0.5,
        fireType: 'explosiveLance',
        fireDamage: 5,
        explosionDamage: 10,
        explosionRadiusBlocks: 3,
        detonationDelayMs: 1500,
        projectileSpeed: 1600,
        lifetime: 0.8,
        accuracy: 0.95
      } 
    },
  },
  explosiveLance1: {
    id: 'explosiveLance1',
    name: 'Explosive Lance Mk I',
    armor: 60,
    cost: 140,
    mass: 80,
    sprite: 'explosiveLance1',
    category: 'weapon',
    subcategory: 'explosiveLance',
    behavior: {
      canFire: true,
      fire: {
        fireRate: 0.5,
        fireType: 'explosiveLance',
        fireDamage: 10,
        explosionDamage: 20,
        explosionRadiusBlocks: 3,
        detonationDelayMs: 1500,
        projectileSpeed: 1600,
        lifetime: 0.8,
        accuracy: 0.95
      } 
    },
  },
  explosiveLance2: {
    id: 'explosiveLance2',
    name: 'Explosive Lance Mk II',
    armor: 80,
    cost: 220,
    mass: 90,
    sprite: 'explosiveLance2',
    category: 'weapon',
    subcategory: 'explosiveLance',
    behavior: {
      canFire: true,
      fire: {
        fireRate: 0.6,
        fireType: 'explosiveLance',
        fireDamage: 15,
        explosionDamage: 25,
        explosionRadiusBlocks: 4,
        detonationDelayMs: 1500,
        projectileSpeed: 1600,
        lifetime: 0.85,
        accuracy: 0.97
      } 
    },
  },
  explosiveLance3: {
    id: 'explosiveLance3',
    name: 'Explosive Lance Mk III',
    armor: 90,
    cost: 360,
    mass: 110,
    sprite: 'explosiveLance3',
    category: 'weapon',
    subcategory: 'explosiveLance',
    behavior: {
      canFire: true,
      fire: {
        fireRate: 0.7,
        fireType: 'explosiveLance',
        fireDamage: 20,
        explosionDamage: 30,
        explosionRadiusBlocks: 5,
        detonationDelayMs: 1500,
        projectileSpeed: 1600,
        lifetime: 0.9,
        accuracy: 0.98
      } 
    },
  },
  explosiveLance4: {
    id: 'explosiveLance4',
    name: 'Explosive Lance Mk IV',
    armor: 100,
    cost: 600,
    mass: 120,
    sprite: 'explosiveLance4',
    category: 'weapon',
    subcategory: 'explosiveLance',
    behavior: {
      canFire: true,
      fire: {
        fireRate: 0.8,
        fireType: 'explosiveLance',
        fireDamage: 25,
        explosionDamage: 40,
        explosionRadiusBlocks: 6,
        detonationDelayMs: 1500,
        projectileSpeed: 1600,
        lifetime: 1,
        accuracy: 0.99
      } 
    },
  },
  laser0: {
    id: 'laser0',
    name: 'Laser Emitter Mk 0',
    armor: 40,
    cost: 500,
    mass: 80,
    sprite: 'laser0',
    category: 'system',
    subcategory: 'system',
    behavior: {
      canFire: true,
      fire: {
        fireType: 'laser',
        fireRate: 0,
        energyCost: 0.15,
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
    cost: 500,
    mass: 100,
    sprite: 'laser1',
    category: 'weapon',
    subcategory: 'laser',
    behavior: {
      canFire: true,
      energyMaxIncrease: 60,
      fire: {
        fireType: 'laser',
        fireDamage: 2,
        energyCost: 0.15,
      },
    },
  },
  laser2: {
    id: 'laser2',
    name: 'Laser Emitter Mk II',
    armor: 100,
    cost: 1000,
    mass: 160,
    sprite: 'laser2',
    category: 'weapon',
    subcategory: 'laser',
    behavior: {
      canFire: true,
      energyMaxIncrease: 80,
      fire: {
        fireType: 'laser',
        fireDamage: 3.5,
        energyCost: 0.2,
      },
    },
  },
  laser3: {
    id: 'laser3',
    name: 'Laser Emitter Mk III',
    armor: 100,
    cost: 1800,
    mass: 160,
    sprite: 'laser3',
    category: 'weapon',
    subcategory: 'laser',
    behavior: {
      canFire: true,
      energyMaxIncrease: 100,
      fire: {
        fireType: 'laser',
        fireDamage: 5,
        energyCost: 0.3,
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
      energyChargeRate: 10,
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
      energyChargeRate: 10,
    },
    sprite: 'reactor1',
    category: 'utility',
    subcategory: 'energy',
  },
  reactor2: {
    id: 'reactor2',
    name: 'Reactor Mk II',
    armor: 75,
    cost: 800,
    mass: 80,
    behavior: {
      energyChargeRate: 20,
    },
    sprite: 'reactor2',
    category: 'utility',
    subcategory: 'energy',
  },
  battery0: {
    id: 'battery0',
    name: 'Battery Mk 0',
    armor: 20,
    cost: 200,
    mass: 40,
    behavior: {
      energyMaxIncrease: 100,
    },
    sprite: 'battery0',
    category: 'system',
    subcategory: 'system',
  },
  battery1: {
    id: 'battery1',
    name: 'Battery Mk I',
    armor: 30,
    cost: 200,
    mass: 50,
    behavior: {
      energyMaxIncrease: 50,
    },
    sprite: 'battery1',
    category: 'utility',
    subcategory: 'energy',
  },
  battery2: {
    id: 'battery2',
    name: 'Battery Mk II',
    armor: 40,
    cost: 400,
    mass: 60,
    behavior: {
      energyMaxIncrease: 100,
    },
    sprite: 'battery2',
    category: 'utility',
    subcategory: 'energy',
  },
  shield0: {
    id: 'shield0',
    name: 'Shield Mk 0',
    armor: 20,
    cost: 200,
    mass: 40,
    behavior: {
      shieldEfficiency: 0.5,
      shieldRadius: 2,
      energyMaxIncrease: 30,
      shieldEnergyDrain: 1,
    },
    sprite: 'shield0',
    category: 'system',
    subcategory: 'system',
  },
  shield1: {
    id: 'shield1',
    name: 'Shield Mk I',
    armor: 60,
    cost: 160,
    mass: 50,
    behavior: {
      shieldEfficiency: 0.65,
      shieldRadius: 2,
      energyMaxIncrease: 30,
      shieldEnergyDrain: 3,
    },
    sprite: 'shield1',
    category: 'utility',
    subcategory: 'shield',
  },
  shield2: {
    id: 'shield2',
    name: 'Shield Mk II',
    armor: 80,
    cost: 300,
    mass: 60,
    behavior: {
      shieldEfficiency: 0.80,
      shieldRadius: 3,
      energyMaxIncrease: 40,
      shieldEnergyDrain: 5,
    },
    sprite: 'shield2',
    category: 'utility',
    subcategory: 'shield',
  },
  shield3: {
    id: 'shield3',
    name: 'Shield Mk III',
    armor: 100,
    cost: 600,
    mass: 70,
    behavior: {
      shieldEfficiency: 1,
      shieldRadius: 4,
      energyMaxIncrease: 50,
      shieldEnergyDrain: 7,
    },
    sprite: 'shield3',
    category: 'utility',
    subcategory: 'shield',
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
    armor: 90,
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
    armor: 120,
    mass: 10,
    cost: 250,
    behavior: {
      turnPower: 2.8,
    },
    sprite: 'fin4',
    category: 'hull',
    subcategory: 'fin',
  },
  harvester0: {
    id: 'harvester0',
    name: 'Resource Harvester Mk 0',
    armor: 50,
    mass: 30,
    cost: 120,
    behavior: {
      harvestRate: 5,
    },
    sprite: 'harvester0',
    category: 'system',
    subcategory: 'system',
  },
  harvester1: {
    id: 'harvester1',
    name: 'Resource Harvester Mk I',
    armor: 50,
    mass: 30,
    cost: 120,
    behavior: {
      harvestRate: 3,
    },
    sprite: 'harvester1',
    category: 'utility',
    subcategory: 'exploration',
  },
  harvester2: {
    id: 'harvester2',
    name: 'Resource Harvester Mk II',
    armor: 80,
    mass: 40,
    cost: 200,
    behavior: {
      harvestRate: 5,
    },
    sprite: 'harvester2',
    category: 'utility',
    subcategory: 'exploration',
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
