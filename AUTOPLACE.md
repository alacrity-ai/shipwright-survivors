PROMPT:
This is my block autoplace system, which allows for the user to automatically construct their ship as they get blocks.

We have a lot of semantics and heuristics in here:
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

function getOptimalRotation(
  blockType: BlockType,
  coord: { x: number; y: number },
  cockpitCoord: { x: number; y: number }
): number {
  // Handle fins with directional rotation
  if (blockType.name.toLowerCase().includes('fin')) {
    return coord.x < cockpitCoord.x ? 0 : 90;
  }

  // Handle facetplates - this is now handled in findOptimalPlacement with scoring
  if (blockType.name.toLowerCase().includes('facetplate')) {
    // This shouldn't be called for facetplates anymore, but keep as fallback
    return getOptimalfacetplateRotation(coord, cockpitCoord);
  }

  // Handle all weapons - always face forward ===
  if (blockType.category === 'weapon') {
    return 0; // Force all weapons to face forward
  }

  // Handle engines - always face down (0 rotation)
  if (blockType.category === 'engine') {
    return 0;
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
  visited.add(${cockpitCoord.x},${cockpitCoord.y});
  
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
      const key = ${next.x},${next.y};
      
      if (!visited.has(key) && (ship.hasBlockAt(next) || (next.x === coord.x && next.y === coord.y))) {
        visited.add(key);
        queue.push({ coord: next, distance: current.distance + 1 });
      }
    }
  }
  
  return 999; // No path found
}





QUERY:
Should I want to refine this auto placement system in the future by doing the following:
Given the player's selected base ship, when using autoplace block on that ship, the base ship should guide the "shape" of the ship that is created.
E.g., while all of these heuristics here are sacrosanct, e.g. fin facing directions, weapons always face rotation 0, etc.
Presently this model results in ships basically being a circular blob (liekly due to proximity to cockpit being a priority).
What if for different ships, I wanted the buildign process to preference specific ship shapes.  E.g. a long body and two wings.  Or a more square carrier like shape, e.g.

How would I accomplish such a thing? (high level).  Would we define certain features, e.g. "Wings", "Hull shapes" etc... and then supply a list of features to the function.. e.g. must have two large wings on either side, must have a long hull that is 5 blocks in width, must have etc...??
How would you go about such a thing?


ChatGPT said:
To guide auto-placement toward player-defined or archetypal structural motifs—such as long fuselages, lateral wings, or multi-pod carriers—while preserving your current semantic heuristics (e.g., fin attachment constraints, weapon orientation, structural integrity), you’ll need to introduce a layer of abstract morphological intent into the placement pipeline. At a high level, this entails the following architectural augmentation:

✅ Conceptual Model: Structural Archetype Profiles
Introduce a system of parametric archetypes—abstract ship shape guides—which serve as shape priors for block placement. These can be encoded declaratively and evaluated as soft or hard constraints during scoring.

🧩 Each archetype defines:
Feature	Description
primaryAxis	e.g., 'vertical', 'horizontal', or custom vector
symmetryAxis	Optional; guides bilateral symmetry (e.g., X for wings)
shapeProfile	A heatmap or scalar field indicating desirability of block presence
featureZones	Semantic zones like leftWing, rearThrusterZone, centralHull, with bounding boxes or region predicates
placementBiasRules	Affinity modifiers for certain block categories in zones
structuralGoals	Hard constraints: e.g. “at least 2 blocks in each wing zone”

You’d then load a ShipAutobuildProfile that looks like:

ts
Copy
Edit
interface ShipAutobuildProfile {
  id: string;
  primaryAxis: 'vertical' | 'horizontal';
  symmetryAxis?: 'x' | 'y';
  shapeScoreMap: (coord: Coord) => number;
  featureZones: Record<string, (coord: Coord) => boolean>;
  blockBiases?: {
    [blockCategoryOrName: string]: {
      preferredZones: string[];
      penaltyOutsideZone?: number;
    }
  };
  minimumStructureRules?: Array<{ zone: string; minCount: number }>;
}
🔧 Integration Strategy
Ship Selection Drives Profile
Each ship starts with a reference to a predefined ShipAutobuildProfile. This can be statically defined or procedurally derived from its layout.

Augment calculatePlacementScore with Shape Awareness
Add the following layers into your calculatePlacementScore function:

+ profile.shapeScoreMap(coord)

+ featureZoneAffinity(coord, blockType)

+ symmetryScore(coord, profile.symmetryAxis)

+ proximityToFeatureZone(coord, desiredZone) if blockType prefers specific zones.

Enforce Structural Goals Post-Hoc or Mid-Build
Periodically evaluate minimumStructureRules and boost score for candidates that would fulfill an unmet quota (e.g., if wingZone has < 2 blocks, then heavily favor that region).

Visual Debug Tooling (Optional but Powerful)
Allow debug rendering of shapeScoreMap, symmetry axes, feature zones, and candidate scores to fine-tune profile parameters.

📐 Example Profiles
Fighter with Wings
ts
Copy
Edit
{
  id: 'fighter-archetype',
  primaryAxis: 'vertical',
  symmetryAxis: 'x',
  shapeScoreMap: (coord) => {
    // Encourage elongation in y, and lateral extension in x at certain y-levels
    const distFromCenterY = Math.abs(coord.y);
    const distFromCenterX = Math.abs(coord.x);
    return -distFromCenterY + (Math.abs(coord.y) > 2 ? -distFromCenterX * 0.5 : 5);
  },
  featureZones: {
    leftWing: (c) => c.x <= -3 && c.y >= -1 && c.y <= 3,
    rightWing: (c) => c.x >= 3 && c.y >= -1 && c.y <= 3,
    hull: (c) => c.x >= -1 && c.x <= 1
  },
  blockBiases: {
    engine: { preferredZones: ['hull'], penaltyOutsideZone: 20 },
    fin: { preferredZones: ['leftWing', 'rightWing'], penaltyOutsideZone: 30 }
  },
  minimumStructureRules: [
    { zone: 'leftWing', minCount: 2 },
    { zone: 'rightWing', minCount: 2 }
  ]
}
Carrier with Broad Deck
ts
Copy
Edit
{
  id: 'carrier-archetype',
  primaryAxis: 'horizontal',
  symmetryAxis: 'y',
  shapeScoreMap: (coord) => {
    return -Math.abs(coord.x) + (Math.abs(coord.y) < 2 ? 15 : 0);
  },
  featureZones: {
    centralHull: (c) => Math.abs(c.y) <= 1,
    deck: (c) => Math.abs(c.y) <= 3 && Math.abs(c.x) <= 5
  },
  blockBiases: {
    utility: { preferredZones: ['centralHull'] },
    weapon: { preferredZones: ['deck'] }
  }
}
🧠 Optional: Learning from Existing Ships (Procedural Profiles)
In the long term, you could reverse-engineer profiles from example ships using:

Spatial histogramming of block categories

Principal axis analysis of mass or functional block distribution

Zone labelling by clustering parts with common function or orientation

This enables:

Emergent archetypes

Dynamic shape extrapolation for AI or enemy design

Adaptive blueprint refinement

Summary
To enable archetype-guided auto-building while preserving local semantic correctness, you must separate structural intent from placement logic, and then reintroduce it as a modulating influence via scoring and zone-specific heuristics.

In implementation terms:

Keep your existing rules as local constraints

Introduce a ShipAutobuildProfile layer as global shape intent

Blend both in the calculatePlacementScore function

Optionally, enforce hard constraints over the course of the build

Let me know if you’d like an example implementation of one of these shapeScoreMap or blockBiases systems.


