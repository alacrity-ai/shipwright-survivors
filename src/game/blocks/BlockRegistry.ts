// src/game/blocks/BlockRegistry.ts

import type { BlockType } from '@/game/interfaces/types/BlockType';

import { getTierFromBlockId } from '@/systems/pickups/helpers/getTierFromBlockId';

const blockTypes: Record<string, BlockType> = {
  cockpit0: {
    id: 'cockpit0',
    tier: 0,
    name: 'Cockpit',
    armor: 20,
    cost: 50,
    mass: 50,
    behavior: {
      canFire: true,
      isCockpit: true,
      fire: {
        fireRate: 0.6,
        fireType: 'bullet',
        fireDamage: 4,
        projectileSpeed: 600,
        lifetime: 1.8,
        accuracy: 0.3
      } 
    },
    sprite: 'cockpit0',
    category: 'system',
    subcategory: 'system',
    dropRate: 0,
    metatags: ['cockpit']
  },
  cockpit1: {
    id: 'cockpit1',
    tier: 1,
    name: 'Cockpit',
    armor: 150,
    cost: 50,
    mass: 50,
    behavior: {
      canFire: true,
      isCockpit: true,
      fire: {
        fireRate: 0.8,
        fireType: 'bullet',
        fireDamage: 14,
        projectileSpeed: 800,
        lifetime: 1.8,
        accuracy: 0.75
      } 
    },
    sprite: 'cockpit1',
    category: 'system',
    subcategory: 'system',
    dropRate: 0,
    metatags: ['cockpit']
  },
  hull0: {
    id: 'hull0',
    tier: 0,
    name: 'Hull Mk 0',
    armor: 15,
    mass: 50,
    cost: 20,
    sprite: 'hull0',
    category: 'system',
    subcategory: 'hull',
    dropRate: 0.07,
    metatags: ['hull']
  },
  hull1: {
    id: 'hull1',
    tier: 1,
    name: 'Hull Mk I',
    armor: 50,
    mass: 50,
    cost: 20,
    sprite: 'hull1',
    category: 'hull',
    subcategory: 'hull',
    dropRate: 0.05,
    metatags: ['hull']
  },
  hull2: {
    id: 'hull2',
    tier: 2,
    name: 'Hull Mk II',
    armor: 75,
    mass: 60,
    cost: 40,
    sprite: 'hull2',
    category: 'hull',
    subcategory: 'hull',
    dropRate: 0.05,
    metatags: ['hull']
  },
  hull3: {
    id: 'hull3',
    tier: 3,
    name: 'Hull Mk III',
    armor: 100,
    mass: 75,
    cost: 80,
    sprite: 'hull3',
    category: 'hull',
    subcategory: 'hull',
    dropRate: 0.04,
    metatags: ['hull']
  },
  hull4: {
    id: 'hull4',
    tier: 4,
    name: 'Hull Mk IV',
    armor: 150,
    mass: 90,
    cost: 140,
    sprite: 'hull4',
    category: 'hull',
    subcategory: 'hull',
    dropRate: 0.03,
    metatags: ['hull']
  },
  facetplate0: {
    id: 'facetplate0',
    tier: 0,
    name: 'Facetplate Mk 0',
    armor: 20,
    mass: 30,
    cost: 30,
    sprite: 'facetplate0',
    category: 'system',
    subcategory: 'system',
    behavior: {
      rammingDamageMultiplier: 1.1,
      rammingArmor: 7,
    },
    dropRate: 0.05,
    metatags: ['facetplate']
  },
  facetplate1: {
    id: 'facetplate1',
    tier: 1,
    name: 'Facetplate Mk I',
    armor: 75,
    mass: 30,
    cost: 30,
    sprite: 'facetplate1',
    category: 'hull',
    subcategory: 'facetplate',
    dropRate: 0.05,
    behavior: {
      rammingDamageMultiplier: 1.3,
      rammingArmor: 7,
    },
    metatags: ['facetplate']
  },
  facetplate2: {
    id: 'facetplate2',
    tier: 2,
    name: 'Facetplate Mk II',
    armor: 100,
    mass: 40,
    cost: 60,
    sprite: 'facetplate2',
    category: 'hull',
    subcategory: 'facetplate',
    behavior: {
      rammingDamageMultiplier: 1.5,
      rammingArmor: 12,
    },
    dropRate: 0.04,
    metatags: ['facetplate']
  },
  facetplate3: {
    id: 'facetplate3',
    tier: 3,
    name: 'Facetplate Mk III',
    armor: 125,
    mass: 50,
    cost: 100,
    sprite: 'facetplate3',
    category: 'hull',
    subcategory: 'facetplate',
    behavior: {
      rammingDamageMultiplier: 1.7,
      rammingArmor: 17,
    },
    dropRate: 0.03,
    metatags: ['facetplate']
  },
  facetplate4: {
    id: 'facetplate4',
    tier: 4,
    name: 'Facetplate Mk IV',
    armor: 175,
    mass: 60,
    cost: 120,
    sprite: 'facetplate4',
    category: 'hull',
    subcategory: 'facetplate',
    behavior: {
      rammingDamageMultiplier: 2,
      rammingArmor: 22,
    },
    dropRate: 0.02,
    metatags: ['facetplate']
  },
  turret0: {
    id: 'turret0',
    tier: 0,
    name: 'Turret Mk 0',
    armor: 20,
    cost: 40,
    mass: 40,
    sprite: 'turret0',
    behavior: {
      canFire: true,
      fire: {
        fireRate: 0.6,
        fireType: 'bullet',
        fireDamage: 2,
        projectileSpeed: 400,
        lifetime: 2.2,
        accuracy: 0.5
      } 
    },
    category: 'system',
    subcategory: 'system',
    dropRate: 0.3,
    placementSound: 'assets/sounds/sfx/ship/attach_00.wav',
    metatags: ['turret']
  },
  turret1: {
    id: 'turret1',
    tier: 1,
    name: 'Turret Mk I',
    armor: 40,
    cost: 40,
    mass: 40,
    sprite: 'turret1',
    behavior: {
      canFire: true,
      fire: {
        fireRate: 0.6,
        fireType: 'turret',
        fireDamage: 10,
        projectileSpeed: 600,
        lifetime: 1.8,
        accuracy: 0.65,
      } 
    },
    category: 'weapon',
    subcategory: 'turret',
    dropRate: 0.3,
    placementSound: 'assets/sounds/sfx/ship/attach_00.wav',
    metatags: ['turret']
  },
  turret2: {
    id: 'turret2',
    tier: 2,
    name: 'Turret Mk II',
    armor: 50,
    cost: 100,
    mass: 50,
    sprite: 'turret2',
    behavior: {
      canFire: true,
      fire: {
        fireRate: 0.8,
        fireType: 'turret',
        fireDamage: 16,
        projectileSpeed: 700,
        lifetime: 2.2,
        accuracy: 0.75
      } 
    },
    category: 'weapon',
    subcategory: 'turret',
    dropRate: 0.2,
    placementSound: 'assets/sounds/sfx/ship/attach_00.wav',
    metatags: ['turret']
  },
  turret3: {
    id: 'turret3',
    tier: 3,
    name: 'Turret Mk III',
    armor: 75,
    cost: 200,
    mass: 60,
    sprite: 'turret3',
    behavior: {
      canFire: true,
      fire: {
        fireRate: 1.2,
        fireType: 'turret',
        fireDamage: 20,
        projectileSpeed: 800,
        lifetime: 2.2,
        accuracy: 0.9
      } 
    },
    category: 'weapon',
    subcategory: 'turret',
    dropRate: 0.15,
    placementSound: 'assets/sounds/sfx/ship/attach_00.wav',
    metatags: ['turret']
  },
  turret4: {
    id: 'turret4',
    tier: 4,
    name: 'Turret Mk IV',
    armor: 100,
    cost: 400,
    mass: 100,
    sprite: 'turret4',
    behavior: {
      canFire: true,
      fire: {
        fireRate: 1.4,
        fireType: 'turret',
        fireDamage: 28,
        projectileSpeed: 900,
        lifetime: 2.2,
        accuracy: 0.95
      } 
    },
    category: 'weapon',
    subcategory: 'turret',
    dropRate: 0.12,
    placementSound: 'assets/sounds/sfx/ship/attach_00.wav',
    metatags: ['turret']
  },
  explosiveLance0: {
    id: 'explosiveLance0',
    tier: 0,
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
        fireDamage: 1,
        explosionDamage: 2,
        explosionRadiusBlocks: 3,
        detonationDelayMs: 1500,
        projectileSpeed: 1000,
        lifetime: 0.8,
        accuracy: 0.95
      } 
    },
    dropRate: 0.2,
    metatags: ['explosiveLance']
  },
  explosiveLance1: {
    id: 'explosiveLance1',
    tier: 1,
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
        fireDamage: 1,
        explosionDamage: 20,
        explosionRadiusBlocks: 3,
        detonationDelayMs: 1500,
        projectileSpeed: 1600,
        lifetime: 0.8,
        accuracy: 0.95
      } 
    },
    dropRate: 0.15,
    metatags: ['explosiveLance']
  },
  explosiveLance2: {
    id: 'explosiveLance2',
    tier: 2,
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
        fireDamage: 1,
        explosionDamage: 25,
        explosionRadiusBlocks: 4,
        detonationDelayMs: 1500,
        projectileSpeed: 1600,
        lifetime: 0.85,
        accuracy: 0.97
      } 
    },
    dropRate: 0.14,
    metatags: ['explosiveLance']
  },
  explosiveLance3: {
    id: 'explosiveLance3',
    tier: 3,
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
        fireDamage: 1,
        explosionDamage: 30,
        explosionRadiusBlocks: 5,
        detonationDelayMs: 1500,
        projectileSpeed: 1600,
        lifetime: 0.9,
        accuracy: 0.98
      } 
    },
    dropRate: 0.13,
    metatags: ['explosiveLance']
  },
  explosiveLance4: {
    id: 'explosiveLance4',
    tier: 4,
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
        fireDamage: 1,
        explosionDamage: 40,
        explosionRadiusBlocks: 6,
        detonationDelayMs: 1500,
        projectileSpeed: 1600,
        lifetime: 1,
        accuracy: 0.99
      } 
    },
    dropRate: 0.1,
    metatags: ['explosiveLance']
  },
  laser0: {
    id: 'laser0',
    tier: 0,
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
        energyCost: 0.01,
        fireDamage: 1,
        projectileSpeed: 0,
        lifetime: 0, 
        accuracy: 1.0,
      },
    },
    dropRate: 0.12,
    metatags: ['laser']
  },
  laser1: {
    id: 'laser1',
    tier: 3,
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
    dropRate: 0.06,
    metatags: ['laser']
  },
  laser2: {
    id: 'laser2',
    tier: 4,
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
    dropRate: 0.08,
    metatags: ['laser']
  },
  laser3: {
    id: 'laser3',
    tier: 5,
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
    dropRate: 0.06,
    metatags: ['laser']
  },
  reactor0: {
    id: 'reactor0',
    tier: 0,
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
    dropRate: 0.08,
    metatags: ['reactor']
  },
  reactor1: {
    id: 'reactor1',
    tier: 3,
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
    dropRate: 0.06,
    metatags: ['reactor']
  },
  reactor2: {
    id: 'reactor2',
    tier: 4,
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
    dropRate: 0.03,
    metatags: ['reactor']
  },
  battery0: {
    id: 'battery0',
    tier: 0,
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
    dropRate: 0.08,
    metatags: ['battery']
  },
  battery1: {
    id: 'battery1',
    tier: 3,
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
    dropRate: 0.06,
    metatags: ['battery']
  },
  battery2: {
    id: 'battery2',
    tier: 4,
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
    dropRate: 0.03,
    metatags: ['battery']
  },
  shield0: {
    id: 'shield0',
    tier: 0,
    name: 'Shield Mk 0',
    armor: 20,
    cost: 200,
    mass: 40,
    behavior: {
      shieldEfficiency: 0.5,
      shieldRadius: 3,
      energyMaxIncrease: 30,
      shieldEnergyDrain: 1,
    },
    sprite: 'shield0',
    category: 'system',
    subcategory: 'system',
    dropRate: 0.08,
    metatags: ['shield']
  },
  shield1: {
    id: 'shield1',
    tier: 3,
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
    dropRate: 0.08,
    metatags: ['shield']
  },
  shield2: {
    id: 'shield2',
    tier: 4,
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
    dropRate: 0.03,
    metatags: ['shield']
  },
  shield3: {
    id: 'shield3',
    tier: 5,
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
    dropRate: 0.02,
    metatags: ['shield']
  },
  engine0: {
    id: 'engine0',
    tier: 0,
    name: 'Engine Mk 0',
    armor: 15,
    cost: 35,
    mass: 30,
    behavior: {
      canThrust: true,
      thrustPower: 50,
    },
    sprite: 'engine0',
    category: 'system',
    subcategory: 'system',
    dropRate: 0.08,
    metatags: ['engine']
  },
  engine1: {
    id: 'engine1',
    tier: 1,
    name: 'Engine Mk I',
    armor: 40,
    cost: 35,
    mass: 30,
    behavior: {
      canThrust: true,
      thrustPower: 50,
    },
    sprite: 'engine1',
    category: 'engine',
    subcategory: 'engine',
    dropRate: 0.05,
    metatags: ['engine']
  },
  engine2: {
    id: 'engine2',
    tier: 2,
    name: 'Engine Mk II',
    armor: 45,
    cost: 60,
    mass: 30,
    behavior: {
      canThrust: true,
      thrustPower: 75,
    },
    sprite: 'engine2',
    category: 'engine',
    subcategory: 'engine',
    dropRate: 0.08,
    metatags: ['engine']
  },
  engine3: {
    id: 'engine3',
    tier: 3,
    name: 'Engine Mk III',
    armor: 50,
    cost: 80,
    mass: 30,
    behavior: {
      canThrust: true,
      thrustPower: 90,
    },
    sprite: 'engine3',
    category: 'engine',
    subcategory: 'engine',
    dropRate: 0.05,
    metatags: ['engine']
  },
  engine4: {
    id: 'engine4',
    tier: 4,
    name: 'Engine Mk IV',
    armor: 55,
    mass: 30,
    cost: 160,
    behavior: {
      canThrust: true,
      thrustPower: 115,
    },
    sprite: 'engine4',
    category: 'engine',
    subcategory: 'engine',
    dropRate: 0.04,
    metatags: ['engine']
  },
  fin0: {
    id: 'fin0',
    tier: 0,
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
    dropRate: 0.06,
    metatags: ['fin']
  },
  fin1: {
    id: 'fin1',
    tier: 1,
    name: 'Fin Mk I',
    armor: 50,
    mass: 10,
    cost: 40,
    behavior: {
      turnPower: 0.5,
    },
    sprite: 'fin1',
    category: 'hull',
    subcategory: 'fin',
    dropRate: 0.06,
    metatags: ['fin']
  },
  fin2: {
    id: 'fin2',
    tier: 2,
    name: 'Fin Mk II',
    armor: 75,
    mass: 10,
    cost: 80,
    behavior: {
      turnPower: 1.0,
    },
    sprite: 'fin2',
    category: 'hull',
    subcategory: 'fin',
    dropRate: 0.06,
    metatags: ['fin']
  },
  fin3: {
    id: 'fin3',
    tier: 3,
    name: 'Fin Mk III',
    armor: 90,
    mass: 10,
    cost: 120,
    behavior: {
      turnPower: 1.5,
    },
    sprite: 'fin3',
    category: 'hull',
    subcategory: 'fin',
    dropRate: 0.05,
    metatags: ['fin']
  },
  fin4: {
    id: 'fin4',
    tier: 4,
    name: 'Fin Mk IV',
    armor: 120,
    mass: 10,
    cost: 200,
    behavior: {
      turnPower: 2.0,
    },
    sprite: 'fin4',
    category: 'hull',
    subcategory: 'fin',
    dropRate: 0.05,
    metatags: ['fin']
  },
  harvester0: {
    id: 'harvester0',
    tier: 0,
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
    dropRate: 0.1,
    metatags: ['harvester']
  },
  harvester1: {
    id: 'harvester1',
    tier: 1,
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
    dropRate: 0.1,
    metatags: ['harvester']
  },
  harvester2: {
    id: 'harvester2',
    tier: 2,
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
    dropRate: 0.1,
    metatags: ['harvester']
  },
  haloBlade0: {
    id: 'haloBlade0',
    tier: 0,
    name: 'Halo Blade Mk 0',
    armor: 100,
    mass: 80,
    cost: 400,
    behavior: {
      haloBladeProperties: {
        orbitingRadius: 500,
        orbitingSpeed: 1.2,
        size: 64,
        damage: 5,
        color: '#FFBF00',
        sprite: 'energyRing0'
      }
    },
    sprite: 'haloBlade0',
    category: 'system',
    subcategory: 'haloBlade',
    dropRate: 0.1,
    metatags: ['haloBlade']
  },
  haloBlade1: {
    id: 'haloBlade1',
    tier: 1,
    name: 'Halo Blade Mk I',
    armor: 120,
    mass: 80,
    cost: 400,
    behavior: {
      haloBladeProperties: {
        orbitingRadius: 500,
        orbitingSpeed: 2,
        size: 64,
        damage: 5,
        color: '#FFBF00',
        sprite: 'energyRing1'
      }
    },
    sprite: 'haloBlade1',
    category: 'weapon',
    subcategory: 'haloBlade',
    dropRate: 0.18,
    metatags: ['haloBlade']
  },
  haloBlade2: {
    id: 'haloBlade2',
    tier: 2,
    name: 'Halo Blade Mk II',
    armor: 140,
    mass: 80,
    cost: 600,
    behavior: {
      haloBladeProperties: {
        orbitingRadius: 700,
        orbitingSpeed: 2.4,
        size: 64,
        damage: 8,
        color: '#2CFF05',
        sprite: 'energyRing2'
      }
    },
    sprite: 'haloBlade2',
    category: 'weapon',
    subcategory: 'haloBlade',
    dropRate: 0.14,
    metatags: ['haloBlade']
  },
  haloBlade3: {
    id: 'haloBlade3',
    tier: 3,
    name: 'Halo Blade Mk III',
    armor: 160,
    mass: 80,
    cost: 900,
    behavior: {
      haloBladeProperties: {
        orbitingRadius: 900,
        orbitingSpeed: 2.8,
        size: 64,
        damage: 12,
        color: '#00FFFF',
        sprite: 'energyRing3'
      }
    },
    sprite: 'haloBlade3',
    category: 'weapon',
    subcategory: 'haloBlade',
    dropRate: 0.12,
    metatags: ['haloBlade']
  },
  haloBlade4: {
    id: 'haloBlade4',
    tier: 4,
    name: 'Halo Blade Mk IV',
    armor: 180,
    mass: 80,
    cost: 1200,
    behavior: {
      haloBladeProperties: {
        orbitingRadius: 1100,
        orbitingSpeed: 3.2,
        size: 64,
        damage: 15,
        color: '#7F00FF',
        sprite: 'energyRing4'
      }
    },
    sprite: 'haloBlade4',
    category: 'weapon',
    subcategory: 'haloBlade',
    dropRate: 0.1,
    metatags: ['haloBlade']
  },
  npcseeker0: {
    id: 'npcseeker0',
    tier: 0,
    name: 'NPC Seeker Mk 0',
    armor: 70,
    mass: 80,
    cost: 400,
    behavior: {
      canFire: true,
      fire: {
        fireRate: 0.2,
        fireType: 'heatSeeker',
        fireDamage: 1,
        explosionDamage: 3,
        explosionRadiusBlocks: 2,
        projectileSpeed: 400,
        turningPower: 0.08,
        targetingRange: 4000,
        lifetime: 6.0,
        seekerForwardFire: true,
      } 
    },
    sprite: 'heatSeeker0',
    category: 'system',
    subcategory: 'heatSeeker',
    dropRate: 0.42,
    blockDropOverride: 'heatSeeker1',
    metatags: ['heatSeeker']
  },
  heatSeeker0: {
    id: 'heatSeeker0',
    tier: 0,
    name: 'Heat Seeker Mk 0',
    armor: 70,
    mass: 80,
    cost: 400,
    behavior: {
      canFire: true,
      fire: {
        fireRate: 0.8,
        fireType: 'heatSeeker',
        fireDamage: 1,
        explosionDamage: 3,
        explosionRadiusBlocks: 2,
        projectileSpeed: 800,
        turningPower: 2.0,
        targetingRange: 3000,
        lifetime: 3.0,
      } 
    },
    sprite: 'heatSeeker0',
    category: 'weapon',
    subcategory: 'heatSeeker',
    dropRate: 0.28,
    metatags: ['heatSeeker']
  },
  heatSeeker1: {
    id: 'heatSeeker1',
    tier: 1,
    name: 'Heat Seeker Mk I',
    armor: 80,
    mass: 80,
    cost: 400,
    behavior: {
      canFire: true,
      fire: {
        fireRate: 0.8,
        fireType: 'heatSeeker',
        fireDamage: 1,
        explosionDamage: 5,
        explosionRadiusBlocks: 3,
        turningPower: 2.0,
        targetingRange: 3000,
        projectileSpeed: 800,
        lifetime: 3.0,
      } 
    },
    sprite: 'heatSeeker1',
    category: 'weapon',
    subcategory: 'heatSeeker',
    dropRate: 0.28,
    metatags: ['heatSeeker']
  },
  heatSeeker2: {
    id: 'heatSeeker2',
    tier: 2,
    name: 'Heat Seeker Mk II',
    armor: 90,
    mass: 80,
    cost: 800,
    behavior: {
      canFire: true,
      fire: {
        fireRate: 0.8,
        fireType: 'heatSeeker',
        fireDamage: 1,
        explosionDamage: 8,
        explosionRadiusBlocks: 4,
        turningPower: 2.2,
        targetingRange: 3000,
        projectileSpeed: 800,
        lifetime: 3.2,
      } 
    },
    sprite: 'heatSeeker2',
    category: 'weapon',
    subcategory: 'heatSeeker',
    dropRate: 0.28,
    metatags: ['heatSeeker']
  },
  heatSeeker3: {
    id: 'heatSeeker3',
    tier: 3,
    name: 'Heat Seeker Mk III',
    armor: 100,
    mass: 80,
    cost: 1200,
    behavior: {
      canFire: true,
      fire: {
        fireRate: 0.8,
        fireType: 'heatSeeker',
        fireDamage: 1,
        explosionDamage: 12,
        explosionRadiusBlocks: 5,
        turningPower: 2.4,
        targetingRange: 3000,
        projectileSpeed: 800,
        lifetime: 3.4,
      } 
    },
    sprite: 'heatSeeker3',
    category: 'weapon',
    subcategory: 'heatSeeker',
    dropRate: 0.28,
    metatags: ['heatSeeker']
  },
  heatSeeker4: {
    id: 'heatSeeker4',
    tier: 4,
    name: 'Heat Seeker Mk IV',
    armor: 120,
    mass: 80,
    cost: 1600,
    behavior: {
      canFire: true,
      fire: {
        fireRate: 0.8,
        fireType: 'heatSeeker',
        fireDamage: 1,
        explosionDamage: 15,
        explosionRadiusBlocks: 6,
        turningPower: 2.8,
        targetingRange: 3000,
        projectileSpeed: 800,
        lifetime: 3.6,
      } 
    },
    sprite: 'heatSeeker4',
    category: 'weapon',
    subcategory: 'heatSeeker',
    dropRate: 0.28,
    metatags: ['heatSeeker']
  },
  fuelTank0: {
    id: 'fuelTank0',
    tier: 0,
    name: 'Fuel Tank Mk 0',
    armor: 50,
    cost: 50,
    mass: 25,
    behavior: {
      fuelCapacityIncrease: 20,
    },
    sprite: 'fuelTank0',
    category: 'system',
    subcategory: 'system',
    dropRate: 0.08,
    metatags: ['fuelTank']
  },
  fuelTank1: {
    id: 'fuelTank1',
    tier: 1,
    name: 'Fuel Tank Mk I',
    armor: 60,
    cost: 50,
    mass: 25,
    behavior: {
      fuelCapacityIncrease: 25,
    },
    sprite: 'fuelTank1',
    category: 'utility',
    subcategory: 'fuel',
    dropRate: 0.08,
    metatags: ['fuelTank']
  },
  fuelTank2: {
    id: 'fuelTank2',
    tier: 2,
    name: 'Fuel Tank Mk II',
    armor: 70,
    cost: 50,
    mass: 30,
    behavior: {
      fuelCapacityIncrease: 35,
    },
    sprite: 'fuelTank2',
    category: 'utility',
    subcategory: 'fuel',
    dropRate: 0.08,
    metatags: ['fuelTank']
  },
  fuelTank3: {
    id: 'fuelTank3',
    tier: 3,
    name: 'Fuel Tank Mk III',
    armor: 80,
    cost: 50,
    mass: 35,
    behavior: {
      fuelCapacityIncrease: 50,
    },
    sprite: 'fuelTank3',
    category: 'utility',
    subcategory: 'fuel',
    dropRate: 0.08,
    metatags: ['fuelTank']
  },
  fuelTank4: {
    id: 'fuelTank4',
    tier: 4,
    name: 'Fuel Tank Mk IV',
    armor: 90,
    cost: 50,
    mass: 40,
    behavior: {
      fuelCapacityIncrease: 75,
    },
    sprite: 'fuelTank4',
    category: 'utility',
    subcategory: 'fuel',
    dropRate: 0.07,
    metatags: ['fuelTank']
  }
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

export function getAllBlocksInTier(tier: number): BlockType[] {
  return Object.values(blockTypes).filter(
    block => getTierFromBlockId(block.id) === tier && !block.id.includes('cockpit')
  );
}

export function getAllBlocksInTierFromBlockType(blockType: BlockType): BlockType[] {
  const tier = getTierFromBlockId(blockType.id);
  return Object.values(blockTypes).filter(
    block => getTierFromBlockId(block.id) === tier && !block.id.includes('cockpit')
  );
}

export function getTierFromBlockType(blockType: BlockType): number {
  return getTierFromBlockId(blockType.id);
}
