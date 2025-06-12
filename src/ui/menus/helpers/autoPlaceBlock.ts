// src/ui/menus/helpers/autoPlaceBlock.ts

import type { BlockType } from '@/game/interfaces/types/BlockType';
import type { Ship } from '@/game/ship/Ship';
import { audioManager } from '@/audio/Audio';
import { isCoordConnectedToShip } from '@/systems/subsystems/utils/ShipBuildingUtils';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';

const SEARCH_RADIUS = 20;

  export function autoPlaceBlock(
    ship: Ship,
    blockType: BlockType,
    shipBuilderEffects: ShipBuilderEffectsSystem
  ): boolean {
    console.log('[autoPlaceBlock]', blockType.name);
    if (!blockType) return false;

    const placement = findOptimalPlacement(ship, blockType);
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


// === IMPROVED PLACEMENT SYSTEM ===

interface PlacementCandidate {
  coord: { x: number; y: number };
  rotation: number;
  score: number;
}

function findOptimalPlacement(ship: Ship, blockType: BlockType): PlacementCandidate | null {
  const cockpitCoord = ship.getCockpitCoord();
  if (!cockpitCoord) return null;

  const candidates: PlacementCandidate[] = [];
  
  // Generate all valid placement candidates
  for (let dx = -SEARCH_RADIUS; dx <= SEARCH_RADIUS; dx++) {
    for (let dy = -SEARCH_RADIUS; dy <= SEARCH_RADIUS; dy++) {
      const coord = { x: dx, y: dy };

      // Skip if position is occupied or not connected
      if (ship.hasBlockAt(coord)) continue;
      if (!isCoordConnectedToShip(ship, coord)) continue;

      // NEW: Check fin/facetplate support invariant for all blocks
      if (!isValidStructuralSupport(coord, ship)) continue;

      // Determine optimal rotation for this position
      if (blockType.name.toLowerCase().includes('facetplate')) {
        // For facetplates, try all rotations and find the best valid one
        for (const rotation of [0, 90, 180, 270]) {
          if (!isValidfacetplateAttachment(coord, rotation, ship)) continue;

          const score = calculatePlacementScore(blockType, coord, cockpitCoord, ship, rotation);
          candidates.push({ coord, rotation, score });
        }
      } else if (blockType.name.toLowerCase().includes('fin')) {
        // For fins, try all rotations and find valid ones
        for (const rotation of [0, 90, 180, 270]) {
          if (!isValidFinAttachment(coord, rotation, ship)) continue;

          const score = calculatePlacementScore(blockType, coord, cockpitCoord, ship, rotation);
          candidates.push({ coord, rotation, score });
        }
      } else {
        const rotation = getOptimalRotation(blockType, coord, cockpitCoord);
        if (!isValidPlacement(blockType, coord, rotation, ship)) continue;

        const score = calculatePlacementScore(blockType, coord, cockpitCoord, ship, rotation);
        candidates.push({ coord, rotation, score });
      }
    }
  }

  // Return the highest-scoring candidate
  return candidates.length > 0 
    ? candidates.reduce((best, current) => current.score > best.score ? current : best)
    : null;
}

// === PLACEMENT VALIDATION ===

function isValidPlacement(blockType: BlockType, coord: { x: number; y: number }, rotation: number, ship: Ship): boolean {
  // Special validation for facetplates - they need a supporting block
  if (blockType.name.toLowerCase().includes('facetplate')) {
    return isValidfacetplateAttachment(coord, rotation, ship);
  }
  
  // Special validation for fins - they need directional support
  if (blockType.name.toLowerCase().includes('fin')) {
    return isValidFinAttachment(coord, rotation, ship);
  }
  
  // Other blocks just need basic connectivity (already checked in main loop)
  return true;
}

// NEW: Validates that a block isn't supported only by fins or facetplates
function isValidStructuralSupport(coord: { x: number; y: number }, ship: Ship): boolean {
  const directions = [
    { x: 0, y: 1 }, { x: 0, y: -1 },
    { x: 1, y: 0 }, { x: -1, y: 0 }
  ];
  
  let hasStrongSupport = false;
  
  for (const dir of directions) {
    const adjacentCoord = { x: coord.x + dir.x, y: coord.y + dir.y };
    const adjacentBlock = ship.getBlock(adjacentCoord);
    
    if (adjacentBlock) {
      const blockName = adjacentBlock.type.name.toLowerCase();
      // If we find at least one adjacent block that's not a fin or facetplate, placement is valid
      if (!blockName.includes('fin') && !blockName.includes('facetplate')) {
        hasStrongSupport = true;
        break;
      }
    }
  }
  
  return hasStrongSupport;
}

function isValidFinAttachment(coord: { x: number; y: number }, rotation: number, ship: Ship): boolean {
  let requiredSupportCoords: { x: number; y: number }[];

  // Determine required support positions based on fin rotation
  switch (rotation) {
    case 0:   // Fin faces left, needs support to right or below
      requiredSupportCoords = [
        { x: coord.x + 1, y: coord.y },     // Right
        { x: coord.x, y: coord.y + 1 }      // Below
      ];
      break;
    case 90:  // Fin faces right, needs support to left or below
      requiredSupportCoords = [
        { x: coord.x - 1, y: coord.y },     // Left
        { x: coord.x, y: coord.y + 1 }      // Below
      ];
      break;
    case 180: // Fin faces right (flipped), needs support to left or above
      requiredSupportCoords = [
        { x: coord.x - 1, y: coord.y },     // Left
        { x: coord.x, y: coord.y - 1 }      // Above
      ];
      break;
    case 270: // Fin faces left (flipped), needs support to right or above
      requiredSupportCoords = [
        { x: coord.x + 1, y: coord.y },     // Right
        { x: coord.x, y: coord.y - 1 }      // Above
      ];
      break;
    default:
      return false;
  }

  // Check if at least one of the required support positions has a strong support block
  for (const supportCoord of requiredSupportCoords) {
    const supportBlock = ship.getBlock(supportCoord);
    if (supportBlock) {
      const name = supportBlock.type.name.toLowerCase();
      // Ensure the support block is NOT a facetplate or fin (strong structural support)
      if (!name.includes('facetplate') && !name.includes('fin')) {
        return true; // Found valid strong support
      }
    }
  }

  return false; // No valid support found
}

function isValidfacetplateAttachment(coord: { x: number; y: number }, rotation: number, ship: Ship): boolean {
  let supportCoord: { x: number; y: number };

  // Check for support block in the OPPOSITE direction of where facetplate faces
  switch (rotation) {
    case 0:   // Faces up, needs support below
      supportCoord = { x: coord.x, y: coord.y + 1 }; 
      break;
    case 90:  // Faces right, needs support left  
      supportCoord = { x: coord.x - 1, y: coord.y }; 
      break;
    case 180: // Faces down, needs support above
      supportCoord = { x: coord.x, y: coord.y - 1 }; 
      break;
    case 270: // Faces left, needs support right
      supportCoord = { x: coord.x + 1, y: coord.y }; 
      break;
    default:  
      return false;
  }

  const supportBlock = ship.getBlock(supportCoord);
  if (!supportBlock) return false;

  // Ensure the support block is NOT a facetplate or fin
  const name = supportBlock.type.name.toLowerCase();
  return !name.includes('facetplate') && !name.includes('fin');
}

// === ROTATION LOGIC ===

function getOptimalRotation(blockType: BlockType, coord: { x: number; y: number }, cockpitCoord: { x: number; y: number }): number {
  // Handle fins with directional rotation
  if (blockType.name.toLowerCase().includes('fin')) {
    return coord.x < cockpitCoord.x ? 0 : 90;
  }
  
  // Handle facetplates - this is now handled in findOptimalPlacement with scoring
  if (blockType.name.toLowerCase().includes('facetplate')) {
    // This shouldn't be called for facetplates anymore, but keep as fallback
    return getOptimalfacetplateRotation(coord, cockpitCoord);
  }
  
  // Handle weapons - point toward front
  if (blockType.category === 'weapon') {
    if (coord.y < cockpitCoord.y) return 0; // Front-facing
    if (coord.y > cockpitCoord.y) return 180; // Rear-facing (turrets)
    return coord.x < cockpitCoord.x ? 270 : 90; // Side-facing
  }
  
  // Handle engines - always face down (0 rotation)
  if (blockType.category === 'engine') {
    return 0; // Always face down for proper thrust direction
  }
  
  return 0; // Default rotation
}

function getOptimalfacetplateRotation(coord: { x: number; y: number }, cockpitCoord: { x: number; y: number }): number {
  const dx = coord.x - cockpitCoord.x;
  const dy = coord.y - cockpitCoord.y;
  
  // Handle exact diagonal cases by preferring horizontal
  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal placement (including diagonals)
    return dx > 0 ? 90 : dx < 0 ? 270 : 0; // Right, Left, or Up if exactly on cockpit
  } else {
    // Vertical placement
    return dy > 0 ? 180 : 0; // Down or Up
  }
}

// === ADVANCED SCORING SYSTEM ===

function calculatePlacementScore(
  blockType: BlockType, 
  coord: { x: number; y: number }, 
  cockpitCoord: { x: number; y: number },
  ship: Ship,
  rotation: number = 0  // NEW: Accept rotation parameter
): number {
  let score = 0;
  
  // Distance penalty - closer to cockpit is always better
  const distance = Math.sqrt(
    Math.pow(coord.x - cockpitCoord.x, 2) + 
    Math.pow(coord.y - cockpitCoord.y, 2)
  );
  score += Math.max(0, 50 - distance * 3); // Higher penalty for distance
  
  // Category-specific placement preferences
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
  
  // Special handling for fins (check by name since they might not have their own category)
  if (blockType.name.toLowerCase().includes('fin')) {
    score += getFinScore(coord, cockpitCoord, ship);
    // NEW: Add rotation-specific scoring for fins
    score += getFinRotationScore(coord, cockpitCoord, rotation);
  }
  
  // Special handling for facetplates - prefer outer positions AND optimal rotation
  if (blockType.name.toLowerCase().includes('facetplate')) {
    score += getfacetplateScore(coord, cockpitCoord, ship, rotation);
  }
  
  // Connectivity bonus - prefer positions with more adjacent blocks
  score += getConnectivityBonus(coord, ship);
  
  // Structural integrity bonus - avoid creating long unsupported arms
  score += getStructuralBonus(coord, cockpitCoord, ship);
  
  return score;
}

// === CATEGORY-SPECIFIC SCORING ===

function getEngineScore(coord: { x: number; y: number }, cockpitCoord: { x: number; y: number }, ship: Ship): number {
  const relativeY = coord.y - cockpitCoord.y;
  
  // Strong preference for rear placement
  if (relativeY > 0) return 30 + relativeY * 5;
  if (relativeY === 0) return 10; // Acceptable at cockpit level
  return -20; // Penalize front placement
}

function getWeaponScore(coord: { x: number; y: number }, cockpitCoord: { x: number; y: number }, ship: Ship): number {
  const relativeY = coord.y - cockpitCoord.y;
  const relativeX = Math.abs(coord.x - cockpitCoord.x);
  
  // Prefer front and sides for weapon placement
  if (relativeY < 0) return 25; // Front placement bonus
  if (relativeY === 0 && relativeX > 0) return 20; // Side placement bonus
  if (relativeY > 0) return 5; // Rear weapons (turrets) acceptable
  return 0;
}

function getHullScore(coord: { x: number; y: number }, cockpitCoord: { x: number; y: number }, ship: Ship): number {
  // Hull blocks prefer to fill in gaps and create solid structure
  const adjacentBlocks = getAdjacentBlockCount(coord, ship);
  return adjacentBlocks * 8; // Strong bonus for filling gaps
}

function getSystemScore(coord: { x: number; y: number }, cockpitCoord: { x: number; y: number }, ship: Ship): number {
  // Systems prefer protected interior positions
  const relativeDistance = Math.abs(coord.x - cockpitCoord.x) + Math.abs(coord.y - cockpitCoord.y);
  return relativeDistance === 1 ? 15 : 5; // Prefer adjacent to cockpit
}

function getFinScore(coord: { x: number; y: number }, cockpitCoord: { x: number; y: number }, ship: Ship): number {
  const isLeftOfCockpit = coord.x < cockpitCoord.x;
  const isRightOfCockpit = coord.x > cockpitCoord.x;
  
  // Base score for fin placement
  let score = 10;
  
  // Bonus for having clear space on the appropriate side
  if (isLeftOfCockpit) {
    // For left fins, prefer positions with nothing to their left
    const leftCoord = { x: coord.x - 1, y: coord.y };
    if (!ship.hasBlockAt(leftCoord)) {
      score += 25; // Strong bonus for clear left side
    }
  } else if (isRightOfCockpit) {
    // For right fins, prefer positions with nothing to their right
    const rightCoord = { x: coord.x + 1, y: coord.y };
    if (!ship.hasBlockAt(rightCoord)) {
      score += 25; // Strong bonus for clear right side
    }
  }
  
  return score;
}

// NEW: Special scoring for fin rotations based on cockpit side preference
function getFinRotationScore(coord: { x: number; y: number }, cockpitCoord: { x: number; y: number }, rotation: number): number {
  const isLeftOfCockpit = coord.x < cockpitCoord.x;
  const isRightOfCockpit = coord.x > cockpitCoord.x;
  
  // Apply cockpit-side rotation preference
  if (isLeftOfCockpit && rotation === 0) {
    return 20; // Strong preference for 0° rotation on left side
  } else if (isRightOfCockpit && rotation === 90) {
    return 20; // Strong preference for 90° rotation on right side
  } else if ((isLeftOfCockpit && rotation === 90) || (isRightOfCockpit && rotation === 0)) {
    return -5; // Small penalty for opposite-side rotations
  }
  
  // Neutral score for 180° and 270° rotations
  return 0;
}

// FIXED: Updated to consider rotation in scoring
function getfacetplateScore(coord: { x: number; y: number }, cockpitCoord: { x: number; y: number }, ship: Ship, rotation: number): number {
  // Base score for facetplate placement
  let score = 5;
  
  // VERY strong preference for outer edge positions
  const adjacentCount = getAdjacentBlockCount(coord, ship);
  
  // facetplates strongly prefer positions with fewer adjacent blocks (outer edge)
  if (adjacentCount === 1) {
    score += 50; // Very strong bonus for true edge positions
  } else if (adjacentCount === 2) {
    score += 25; // Good bonus for corner positions
  } else if (adjacentCount === 3) {
    score -= 15; // Penalty for mostly interior positions
  } else {
    score -= 30; // Strong penalty for completely interior positions
  }
  
  // NEW: Rotation-based scoring - prefer rotations that face away from ship center
  const rotationScore = getfacetplateRotationScore(coord, cockpitCoord, rotation);
  score += rotationScore;
  
  // Count exposed sides (sides with no blocks)
  const directions = [
    { x: 0, y: 1 }, { x: 0, y: -1 },
    { x: 1, y: 0 }, { x: -1, y: 0 }
  ];
  
  const exposedSides = directions.filter(dir => {
    const adjacentCoord = { x: coord.x + dir.x, y: coord.y + dir.y };
    return !ship.hasBlockAt(adjacentCoord);
  }).length;
  
  // Much stronger bonus for exposed sides (exterior positions)
  score += exposedSides * 15;
  
  // Extra bonus for positions that are far from the ship's center of mass
  const distanceFromCockpit = Math.abs(coord.x - cockpitCoord.x) + Math.abs(coord.y - cockpitCoord.y);
  if (distanceFromCockpit >= 2) {
    score += 20; // Bonus for positions further from cockpit (more likely to be exterior)
  }
  
  return score;
}

// NEW: Dedicated function to score facetplate rotations
function getfacetplateRotationScore(coord: { x: number; y: number }, cockpitCoord: { x: number; y: number }, rotation: number): number {
  const dx = coord.x - cockpitCoord.x;
  const dy = coord.y - cockpitCoord.y;
  
  // Determine the "ideal" rotation based on position relative to cockpit
  let idealRotation: number;
  
  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal placement (including diagonals)
    idealRotation = dx > 0 ? 90 : dx < 0 ? 270 : 0; // Right, Left, or Up if exactly on cockpit
  } else {
    // Vertical placement
    idealRotation = dy > 0 ? 180 : 0; // Down or Up
  }
  
  // Strong bonus for ideal rotation, penalty for others
  if (rotation === idealRotation) {
    return 30; // Strong bonus for optimal rotation
  } else {
    return -10; // Penalty for non-optimal rotation
  }
}

// === UTILITY FUNCTIONS ===

function getConnectivityBonus(coord: { x: number; y: number }, ship: Ship): number {
  const adjacentCount = getAdjacentBlockCount(coord, ship);
  return adjacentCount * 5; // Bonus for each adjacent block
}

function getAdjacentBlockCount(coord: { x: number; y: number }, ship: Ship): number {
  const directions = [
    { x: 0, y: 1 }, { x: 0, y: -1 },
    { x: 1, y: 0 }, { x: -1, y: 0 }
  ];
  
  return directions.reduce((count, dir) => {
    const adjacentCoord = { x: coord.x + dir.x, y: coord.y + dir.y };
    return ship.hasBlockAt(adjacentCoord) ? count + 1 : count;
  }, 0);
}

function getStructuralBonus(coord: { x: number; y: number }, cockpitCoord: { x: number; y: number }, ship: Ship): number {
  // Penalize positions that would create long unsupported arms
  const pathLength = getShortestPathToCockpit(coord, cockpitCoord, ship);
  if (pathLength > 3) return -10 * (pathLength - 3); // Penalty for long paths
  
  // Bonus for positions that would strengthen existing structure
  const adjacentToMultiple = getAdjacentBlockCount(coord, ship) >= 2;
  return adjacentToMultiple ? 10 : 0;
}

function getShortestPathToCockpit(coord: { x: number; y: number }, cockpitCoord: { x: number; y: number }, ship: Ship): number {
  // Simple BFS to find shortest path through existing blocks
  const queue = [{ coord: cockpitCoord, distance: 0 }];
  const visited = new Set<string>();
  visited.add(`${cockpitCoord.x},${cockpitCoord.y}`);
  
  const directions = [
    { x: 0, y: 1 }, { x: 0, y: -1 },
    { x: 1, y: 0 }, { x: -1, y: 0 }
  ];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.coord.x === coord.x && current.coord.y === coord.y) {
      return current.distance;
    }
    
    for (const dir of directions) {
      const next = { x: current.coord.x + dir.x, y: current.coord.y + dir.y };
      const key = `${next.x},${next.y}`;
      
      if (!visited.has(key) && (ship.hasBlockAt(next) || (next.x === coord.x && next.y === coord.y))) {
        visited.add(key);
        queue.push({ coord: next, distance: current.distance + 1 });
      }
    }
  }
  
  return 999; // No path found
}