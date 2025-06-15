// Ship Archetype Auto-Placement System
// Interfaces and example implementations for guided ship building

import type { BlockType } from '@/game/interfaces/types/BlockType';
import type { Ship } from '@/game/ship/Ship';

// === CORE INTERFACES ===

export interface Coord {
  x: number;
  y: number;
}

export interface StructuralRule {
  zone: string;
  minCount: number;
  maxCount?: number;
  description?: string;
}

export interface BlockBias {
  preferredZones: string[];
  penaltyOutsideZone?: number;
  bonusInZone?: number;
  avoidZones?: string[];
}

export interface ShipArchetypeProfile {
  id: string;
  name: string;
  description?: string;
  
  // Shape guidance
  primaryAxis: 'vertical' | 'horizontal' | 'diagonal';
  symmetryAxis?: 'x' | 'y' | 'both' | 'none';
  
  // Core shape scoring function - returns desirability score for position
  shapeScoreMap: (coord: Coord, cockpitCoord: Coord) => number;
  
  // Named zones for different ship parts
  featureZones: Record<string, (coord: Coord, cockpitCoord: Coord) => boolean>;
  
  // Block type preferences for zones
  blockBiases?: Record<string, BlockBias>;
  
  // Hard constraints for ship structure
  minimumStructureRules?: StructuralRule[];
  
  // Optional weight multipliers
  weights?: {
    shapeScore?: number;
    symmetryScore?: number;
    zoneAffinityScore?: number;
    structuralGoalScore?: number;
  };
}

// === ARCHETYPE EXAMPLES ===

// Fighter: Long hull with lateral wings
export const FIGHTER_ARCHETYPE: ShipArchetypeProfile = {
  id: 'fighter',
  name: 'Fighter',
  description: 'Sleek fighter with forward hull and symmetric wings',
  primaryAxis: 'vertical',
  symmetryAxis: 'x',
  
  shapeScoreMap: (coord: Coord, cockpitCoord: Coord) => {
    const relativeX = coord.x - cockpitCoord.x;
    const relativeY = coord.y - cockpitCoord.y;
    
    let score = 0;
    
    // Encourage forward extension (negative Y from cockpit)
    if (relativeY <= 0) {
      score += 20 + Math.abs(relativeY) * 5; // Bonus for forward positions
    }
    
    // Encourage some rearward extension for engines
    if (relativeY > 0 && relativeY <= 3) {
      score += 15 - relativeY * 2; // Moderate rear extension
    }
    
    // Wing zones: encourage lateral extension at mid-ship
    if (Math.abs(relativeX) >= 2 && Math.abs(relativeX) <= 5 && relativeY >= -1 && relativeY <= 2) {
      score += 25; // Strong wing zone bonus
    }
    
    // Penalize excessive width near cockpit
    if (Math.abs(relativeX) > 1 && Math.abs(relativeY) <= 1) {
      score -= 15;
    }
    
    return score;
  },
  
  featureZones: {
    leftWing: (coord: Coord, cockpitCoord: Coord) => {
      const relativeX = coord.x - cockpitCoord.x;
      const relativeY = coord.y - cockpitCoord.y;
      return relativeX <= -2 && relativeY >= -1 && relativeY <= 3;
    },
    
    rightWing: (coord: Coord, cockpitCoord: Coord) => {
      const relativeX = coord.x - cockpitCoord.x;
      const relativeY = coord.y - cockpitCoord.y;
      return relativeX >= 2 && relativeY >= -1 && relativeY <= 3;
    },
    
    hull: (coord: Coord, cockpitCoord: Coord) => {
      const relativeX = coord.x - cockpitCoord.x;
      return Math.abs(relativeX) <= 1;
    },
    
    nose: (coord: Coord, cockpitCoord: Coord) => {
      const relativeX = coord.x - cockpitCoord.x;
      const relativeY = coord.y - cockpitCoord.y;
      return Math.abs(relativeX) <= 1 && relativeY <= -1;
    },
    
    engineBay: (coord: Coord, cockpitCoord: Coord) => {
      const relativeX = coord.x - cockpitCoord.x;
      const relativeY = coord.y - cockpitCoord.y;
      return Math.abs(relativeX) <= 1 && relativeY >= 1 && relativeY <= 3;
    }
  },
  
  blockBiases: {
    engine: {
      preferredZones: ['engineBay', 'hull'],
      bonusInZone: 30,
      penaltyOutsideZone: 20
    },
    
    weapon: {
      preferredZones: ['nose', 'leftWing', 'rightWing'],
      bonusInZone: 25,
      penaltyOutsideZone: 15
    },
    
    fin: {
      preferredZones: ['leftWing', 'rightWing'],
      bonusInZone: 35,
      penaltyOutsideZone: 25,
      avoidZones: ['hull']
    },
    
    facetplate: {
      preferredZones: ['leftWing', 'rightWing', 'nose'],
      bonusInZone: 20,
      penaltyOutsideZone: 10
    },
    
    hull: {
      preferredZones: ['hull'],
      bonusInZone: 15
    },
    
    system: {
      preferredZones: ['hull'],
      bonusInZone: 20,
      penaltyOutsideZone: 15
    },
    
    utility: {
      preferredZones: ['hull'],
      bonusInZone: 15
    }
  },
  
  minimumStructureRules: [
    { zone: 'leftWing', minCount: 3, description: 'Left wing needs structure' },
    { zone: 'rightWing', minCount: 3, description: 'Right wing needs structure' },
    { zone: 'engineBay', minCount: 1, description: 'Need rear propulsion' }
  ],
  
  weights: {
    shapeScore: 1.0,
    symmetryScore: 0.8,
    zoneAffinityScore: 1.2,
    structuralGoalScore: 1.5
  }
};

// Carrier: Wide, deck-focused design
export const CARRIER_ARCHETYPE: ShipArchetypeProfile = {
  id: 'carrier',
  name: 'Carrier',
  description: 'Broad carrier with wide deck and central command',
  primaryAxis: 'horizontal',
  symmetryAxis: 'y',
  
  shapeScoreMap: (coord: Coord, cockpitCoord: Coord) => {
    const relativeX = coord.x - cockpitCoord.x;
    const relativeY = coord.y - cockpitCoord.y;
    
    let score = 0;
    
    // Encourage horizontal extension
    if (Math.abs(relativeX) <= 6) {
      score += 25 - Math.abs(relativeX) * 2; // Diminishing bonus for width
    }
    
    // Prefer positions near the centerline (deck area)
    if (Math.abs(relativeY) <= 2) {
      score += 30; // Strong deck bonus
    }
    
    // Moderate penalty for excessive vertical extension
    if (Math.abs(relativeY) > 3) {
      score -= Math.abs(relativeY) * 8;
    }
    
    return score;
  },
  
  featureZones: {
    centralHull: (coord: Coord, cockpitCoord: Coord) => {
      const relativeX = coord.x - cockpitCoord.x;
      const relativeY = coord.y - cockpitCoord.y;
      return Math.abs(relativeX) <= 2 && Math.abs(relativeY) <= 1;
    },
    
    deck: (coord: Coord, cockpitCoord: Coord) => {
      const relativeX = coord.x - cockpitCoord.x;
      const relativeY = coord.y - cockpitCoord.y;
      return Math.abs(relativeX) <= 6 && Math.abs(relativeY) <= 2;
    },
    
    leftFlank: (coord: Coord, cockpitCoord: Coord) => {
      const relativeX = coord.x - cockpitCoord.x;
      const relativeY = coord.y - cockpitCoord.y;
      return relativeX <= -3 && Math.abs(relativeY) <= 2;
    },
    
    rightFlank: (coord: Coord, cockpitCoord: Coord) => {
      const relativeX = coord.x - cockpitCoord.x;
      const relativeY = coord.y - cockpitCoord.y;
      return relativeX >= 3 && Math.abs(relativeY) <= 2;
    },
    
    superstructure: (coord: Coord, cockpitCoord: Coord) => {
      const relativeX = coord.x - cockpitCoord.x;
      const relativeY = coord.y - cockpitCoord.y;
      return Math.abs(relativeX) <= 1 && relativeY <= -1;
    }
  },
  
  blockBiases: {
    weapon: {
      preferredZones: ['deck', 'leftFlank', 'rightFlank', 'superstructure'],
      bonusInZone: 25,
      penaltyOutsideZone: 10
    },
    
    engine: {
      preferredZones: ['centralHull'],
      bonusInZone: 30,
      penaltyOutsideZone: 25
    },
    
    system: {
      preferredZones: ['centralHull', 'superstructure'],
      bonusInZone: 20,
      penaltyOutsideZone: 15
    },
    
    utility: {
      preferredZones: ['centralHull', 'deck'],
      bonusInZone: 15
    },
    
    hull: {
      preferredZones: ['deck'],
      bonusInZone: 10
    },
    
    facetplate: {
      preferredZones: ['leftFlank', 'rightFlank'],
      bonusInZone: 20
    }
  },
  
  minimumStructureRules: [
    { zone: 'deck', minCount: 8, description: 'Need substantial deck area' },
    { zone: 'centralHull', minCount: 4, description: 'Need central structure' }
  ],
  
  weights: {
    shapeScore: 1.2,
    symmetryScore: 1.0,
    zoneAffinityScore: 1.1,
    structuralGoalScore: 1.3
  }
};

// Interceptor: Fast, compact design
export const INTERCEPTOR_ARCHETYPE: ShipArchetypeProfile = {
  id: 'interceptor',
  name: 'Interceptor',
  description: 'Compact, fast interceptor with minimal profile',
  primaryAxis: 'vertical',
  symmetryAxis: 'x',
  
  shapeScoreMap: (coord: Coord, cockpitCoord: Coord) => {
    const relativeX = coord.x - cockpitCoord.x;
    const relativeY = coord.y - cockpitCoord.y;
    const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
    
    let score = 0;
    
    // Strong preference for compact design
    if (distance <= 3) {
      score += 35 - distance * 8; // High penalty for distance
    } else {
      score -= distance * 15; // Very high penalty for sprawl
    }
    
    // Slight forward bias
    if (relativeY <= 0) {
      score += 5;
    }
    
    // Minimal width preference
    if (Math.abs(relativeX) <= 1) {
      score += 15;
    }
    
    return score;
  },
  
  featureZones: {
    core: (coord: Coord, cockpitCoord: Coord) => {
      const relativeX = coord.x - cockpitCoord.x;
      const relativeY = coord.y - cockpitCoord.y;
      return Math.abs(relativeX) <= 1 && Math.abs(relativeY) <= 2;
    },
    
    wingtips: (coord: Coord, cockpitCoord: Coord) => {
      const relativeX = coord.x - cockpitCoord.x;
      const relativeY = coord.y - cockpitCoord.y;
      return Math.abs(relativeX) === 2 && Math.abs(relativeY) <= 1;
    }
  },
  
  blockBiases: {
    engine: {
      preferredZones: ['core'],
      bonusInZone: 35,
      penaltyOutsideZone: 30
    },
    
    weapon: {
      preferredZones: ['core', 'wingtips'],
      bonusInZone: 25,
      penaltyOutsideZone: 20
    },
    
    fin: {
      preferredZones: ['wingtips'],
      bonusInZone: 30,
      penaltyOutsideZone: 25
    }
  },
  
  minimumStructureRules: [
    { zone: 'core', minCount: 5, maxCount: 12, description: 'Compact core design' }
  ],
  
  weights: {
    shapeScore: 1.5,
    symmetryScore: 0.6,
    zoneAffinityScore: 1.3,
    structuralGoalScore: 1.4
  }
};

// === ARCHETYPE REGISTRY ===

export const SHIP_ARCHETYPES: Record<string, ShipArchetypeProfile> = {
  fighter: FIGHTER_ARCHETYPE,
  carrier: CARRIER_ARCHETYPE,
  interceptor: INTERCEPTOR_ARCHETYPE
};

// === UTILITY FUNCTIONS ===

export function getArchetypeById(id: string): ShipArchetypeProfile | null {
  return SHIP_ARCHETYPES[id] || null;
}

export function listAvailableArchetypes(): string[] {
  return Object.keys(SHIP_ARCHETYPES);
}

// === INTEGRATION HELPERS ===

// Helper to evaluate if a coordinate is in any of the specified zones
export function isInZones(
  coord: Coord, 
  cockpitCoord: Coord, 
  zones: string[], 
  profile: ShipArchetypeProfile
): boolean {
  return zones.some(zoneName => {
    const zoneFunction = profile.featureZones[zoneName];
    return zoneFunction && zoneFunction(coord, cockpitCoord);
  });
}

// Helper to get all zones a coordinate belongs to
export function getCoordZones(
  coord: Coord, 
  cockpitCoord: Coord, 
  profile: ShipArchetypeProfile
): string[] {
  const zones: string[] = [];
  
  for (const [zoneName, zoneFunction] of Object.entries(profile.featureZones)) {
    if (zoneFunction(coord, cockpitCoord)) {
      zones.push(zoneName);
    }
  }
  
  return zones;
}

// Helper to calculate symmetry score
export function calculateSymmetryScore(
  coord: Coord, 
  cockpitCoord: Coord, 
  symmetryAxis: string | undefined,
  ship: Ship
): number {
  if (!symmetryAxis || symmetryAxis === 'none') return 0;
  
  let score = 0;
  
  if (symmetryAxis === 'x' || symmetryAxis === 'both') {
    // Check for symmetric counterpart across X axis
    const mirrorCoord = { 
      x: cockpitCoord.x - (coord.x - cockpitCoord.x), 
      y: coord.y 
    };
    
    if (ship.hasBlockAt(mirrorCoord)) {
      score += 15; // Bonus for maintaining X symmetry
    } else {
      score -= 5; // Small penalty for breaking symmetry
    }
  }
  
  if (symmetryAxis === 'y' || symmetryAxis === 'both') {
    // Check for symmetric counterpart across Y axis
    const mirrorCoord = { 
      x: coord.x, 
      y: cockpitCoord.y - (coord.y - cockpitCoord.y) 
    };
    
    if (ship.hasBlockAt(mirrorCoord)) {
      score += 15; // Bonus for maintaining Y symmetry
    } else {
      score -= 5; // Small penalty for breaking symmetry
    }
  }
  
  return score;
}