// Enhanced placement scoring system with archetype integration
// This integrates with your existing autoPlaceBlock.ts system

import type { BlockType } from '@/game/interfaces/types/BlockType';
import type { Ship } from '@/game/ship/Ship';
import type { ShipArchetypeProfile } from '@/systems/autoplacement/ShipArchetypeSystem';

import { calculateSymmetryScore, getCoordZones, isInZones } from '@/systems/autoplacement/ShipArchetypeSystem';
import { audioManager } from '@/audio/Audio';
import { isCoordConnectedToShip } from '@/systems/subsystems/utils/ShipBuildingUtils';
import { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';
import { 
  getEngineScore, 
  getWeaponScore, 
  getHullScore, 
  getSystemScore, 
  getFinScore, 
  getFinRotationScore, 
  getfacetplateScore, 
  getfacetplateRotationScore, 
  getConnectivityBonus, 
  getAdjacentBlockCount, 
  getStructuralBonus,
  getShortestPathToCockpit,
  isValidStructuralSupport,
  isValidfacetplateAttachment,
  isValidFinAttachment,
  getOptimalRotation,
  getOptimalfacetplateRotation,
  isValidPlacement
} from '@/systems/autoplacement/autoPlaceUtils';

interface Coord {
  x: number;
  y: number;
}

// Modified version of your calculatePlacementScore function
export function calculatePlacementScoreWithArchetype(
  blockType: BlockType, 
  coord: Coord, 
  cockpitCoord: Coord,
  ship: Ship,
  rotation: number = 0,
  archetype?: ShipArchetypeProfile  // NEW: Optional archetype parameter
): number {
  let score = 0;
  
  // === EXISTING SCORING (preserved) ===
  
  // Distance penalty - closer to cockpit is better (but less important with archetypes)
  const distance = Math.sqrt(
    Math.pow(coord.x - cockpitCoord.x, 2) + 
    Math.pow(coord.y - cockpitCoord.y, 2)
  );
  const distanceWeight = archetype ? 0.5 : 1.0; // Reduce distance importance with archetypes
  score += Math.max(0, 50 - distance * 3) * distanceWeight;
  
  // Category-specific placement preferences (your existing logic)
  switch (blockType.category) {
    case 'engine':
      score += getEngineScore(coord, cockpitCoord, ship);
      break;
    case 'weapon':
      score += getWeaponScore(coord, cockpitCoord, ship);
      break;
    case 'hull':
      score += getHullScore(coord, cockpitCoord, ship);
      break;
    case 'system':
    case 'utility':
      score += getSystemScore(coord, cockpitCoord, ship);
      break;
  }
  
  // Special handling for fins (your existing logic)
  if (blockType.name.toLowerCase().includes('fin')) {
    score += getFinScore(coord, cockpitCoord, ship);
    score += getFinRotationScore(coord, cockpitCoord, rotation);
  }
  
  // Special handling for facetplates (your existing logic)
  if (blockType.name.toLowerCase().includes('facetplate')) {
    score += getfacetplateScore(coord, cockpitCoord, ship, rotation);
  }
  
  // Connectivity bonus (your existing logic)
  score += getConnectivityBonus(coord, ship);
  
  // Structural integrity bonus (your existing logic)
  score += getStructuralBonus(coord, cockpitCoord, ship);
  
  // === NEW ARCHETYPE-BASED SCORING ===
  
  if (archetype) {
    const weights = archetype.weights || {};
    
    // 1. Shape Score - fundamental shape guidance
    const shapeScore = archetype.shapeScoreMap(coord, cockpitCoord);
    score += shapeScore * (weights.shapeScore ?? 1.0);
    
    // 2. Symmetry Score - maintain architectural symmetry
    const symmetryScore = calculateSymmetryScore(coord, cockpitCoord, archetype.symmetryAxis, ship);
    score += symmetryScore * (weights.symmetryScore ?? 1.0);
    
    // 3. Zone Affinity Score - block type preferences for zones
    const zoneAffinityScore = calculateZoneAffinityScore(
      blockType, coord, cockpitCoord, archetype
    );
    score += zoneAffinityScore * (weights.zoneAffinityScore ?? 1.0);
    
    // 4. Structural Goal Score - encourage meeting minimum requirements
    const structuralGoalScore = calculateStructuralGoalScore(
      coord, cockpitCoord, ship, archetype
    );
    score += structuralGoalScore * (weights.structuralGoalScore ?? 1.0);
  }
  
  return score;
}

// === NEW ARCHETYPE SCORING FUNCTIONS ===

function calculateZoneAffinityScore(
  blockType: BlockType,
  coord: Coord,
  cockpitCoord: Coord,
  archetype: ShipArchetypeProfile
): number {
  const blockBiases = archetype.blockBiases;
  if (!blockBiases) return 0;
  
  // Check for bias by exact block type name first
  let bias = blockBiases[blockType.name.toLowerCase()];
  
  // Fall back to category if no specific block bias found
  if (!bias && blockType.category) {
    bias = blockBiases[blockType.category.toLowerCase()];
  }
  
  // Check for special block types (fins, facetplates)
  if (!bias) {
    if (blockType.name.toLowerCase().includes('fin')) {
      bias = blockBiases['fin'];
    } else if (blockType.name.toLowerCase().includes('facetplate')) {
      bias = blockBiases['facetplate'];
    }
  }
  
  if (!bias) return 0;
  
  let score = 0;
  
  // Check if we're in a preferred zone
  if (bias.preferredZones && bias.preferredZones.length > 0) {
    const inPreferredZone = isInZones(coord, cockpitCoord, bias.preferredZones, archetype);
    
    if (inPreferredZone) {
      score += bias.bonusInZone ?? 20;
    } else {
      score -= bias.penaltyOutsideZone ?? 10;
    }
  }
  
  // Check if we're in an avoided zone
  if (bias.avoidZones && bias.avoidZones.length > 0) {
    const inAvoidedZone = isInZones(coord, cockpitCoord, bias.avoidZones, archetype);
    
    if (inAvoidedZone) {
      score -= 25; // Strong penalty for avoided zones
    }
  }
  
  return score;
}

function calculateStructuralGoalScore(
  coord: Coord,
  cockpitCoord: Coord,
  ship: Ship,
  archetype: ShipArchetypeProfile
): number {
  if (!archetype.minimumStructureRules) return 0;
  
  let score = 0;
  
  // Check each structural rule
  for (const rule of archetype.minimumStructureRules) {
    const zoneFunction = archetype.featureZones[rule.zone];
    if (!zoneFunction) continue;
    
    // Count existing blocks in this zone
    let existingCount = 0;
    const allBlocks = ship.getAllBlocks();
    
    for (const [coord, block] of allBlocks) {
      if (zoneFunction(coord, cockpitCoord)) {
        existingCount++;
      }
    }

    // If this coordinate is in the zone, check if we need more blocks here
    if (zoneFunction(coord, cockpitCoord)) {
      if (existingCount < rule.minCount) {
        // We need more blocks in this zone - strong bonus
        const deficit = rule.minCount - existingCount;
        score += 30 + deficit * 10; // Increasing bonus for larger deficits
      } else if (rule.maxCount && existingCount >= rule.maxCount) {
        // We have too many blocks in this zone - penalty
        score -= 20;
      }
    }
  }
  
  return score;
}

// === MODIFIED FINDOPTIMALPLACEMENT FUNCTION ===

export function findOptimalPlacementWithArchetype(
  ship: Ship, 
  blockType: BlockType,
  archetype?: ShipArchetypeProfile
): { coord: Coord; rotation: number; score: number } | null {
  const cockpitCoord = ship.getCockpitCoord();
  if (!cockpitCoord) return null;

  const candidates: Array<{ coord: Coord; rotation: number; score: number }> = [];
  const SEARCH_RADIUS = 20;
  
  // Generate all valid placement candidates
  for (let dx = -SEARCH_RADIUS; dx <= SEARCH_RADIUS; dx++) {
    for (let dy = -SEARCH_RADIUS; dy <= SEARCH_RADIUS; dy++) {
      const coord = { x: dx, y: dy };

      // Skip if position is occupied or not connected (your existing checks)
      if (ship.hasBlockAt(coord)) continue;
      if (!isCoordConnectedToShip(ship, coord)) continue;
      if (!isValidStructuralSupport(coord, ship)) continue;

      // Determine optimal rotation for this position
      if (blockType.name.toLowerCase().includes('facetplate')) {
        // For facetplates, try all rotations and find the best valid one
        for (const rotation of [0, 90, 180, 270]) {
          if (!isValidfacetplateAttachment(coord, rotation, ship)) continue;

          const score = calculatePlacementScoreWithArchetype(
            blockType, coord, cockpitCoord, ship, rotation, archetype
          );
          candidates.push({ coord, rotation, score });
        }
      } else if (blockType.name.toLowerCase().includes('fin')) {
        // For fins, try all rotations and find valid ones
        for (const rotation of [0, 90, 180, 270]) {
          if (!isValidFinAttachment(coord, rotation, ship)) continue;

          const score = calculatePlacementScoreWithArchetype(
            blockType, coord, cockpitCoord, ship, rotation, archetype
          );
          candidates.push({ coord, rotation, score });
        }
      } else {
        const rotation = archetype 
          ? getOptimalRotationWithArchetype(blockType, coord, cockpitCoord, archetype)
          : getOptimalRotation(blockType, coord, cockpitCoord);
          
        if (!isValidPlacement(blockType, coord, rotation, ship)) continue;

        const score = calculatePlacementScoreWithArchetype(
          blockType, coord, cockpitCoord, ship, rotation, archetype
        );
        candidates.push({ coord, rotation, score });
      }
    }
  }

  // Return the highest-scoring candidate
  return candidates.length > 0 
    ? candidates.reduce((best, current) => current.score > best.score ? current : best)
    : null;
}

// === ARCHETYPE-AWARE ROTATION FUNCTION ===

function getOptimalRotationWithArchetype(
  blockType: BlockType,
  coord: Coord,
  cockpitCoord: Coord,
  archetype: ShipArchetypeProfile
): number {
  // Keep your existing rotation logic for specific block types
  if (blockType.category === 'weapon') {
    return 0; // Force all weapons to face forward
  }
  
  if (blockType.category === 'engine') {
    return 0; // Engines face down
  }
  
  // For other blocks, consider archetype guidance
  const coordZones = getCoordZones(coord, cockpitCoord, archetype);
  
  // If this block type has zone-specific rotation preferences, apply them
  // This could be extended based on your needs
  
  return 0; // Default rotation
}

// === INTEGRATION WITH YOUR EXISTING SYSTEM ===

export function autoPlaceBlockWithArchetype(
  ship: Ship,
  blockType: BlockType,
  shipBuilderEffects: any, // ShipBuilderEffectsSystem
  archetype?: ShipArchetypeProfile
): boolean {
  console.log('[autoPlaceBlockWithArchetype]', blockType.name, archetype?.id);
  if (!blockType) return false;

  const placement = findOptimalPlacementWithArchetype(ship, blockType, archetype);
  if (!placement) return false;

  const success = ship.placeBlockById(placement.coord, blockType.id, placement.rotation);
  if (!success) return false;

  const placedBlock = ship.getBlock(placement.coord);
  if (placedBlock?.position) {
    shipBuilderEffects.createRepairEffect(placedBlock.position);
  }

  const placementSound = blockType.placementSound ?? 'assets/sounds/sfx/ship/gather_00.wav';
  audioManager.play(placementSound, 'sfx', { maxSimultaneous: 3 });

  return true;
}
