// src/game/ship/utils/populateWorld.ts

import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import { SeekTargetState } from '@/systems/ai/fsm/SeekTargetState';
import { loadShipFromJson } from '@/systems/serialization/ShipSerializer';
import { MovementSystem } from '@/systems/physics/MovementSystem';
import { WeaponSystem } from '@/systems/combat/WeaponSystem';
import { ThrusterEmitter } from '@/systems/physics/ThrusterEmitter';
import { WORLD_WIDTH, WORLD_HEIGHT } from '@/config/world';
import type { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import type { Camera } from '@/core/Camera';
import type { ThrusterParticleSystem } from '@/systems/physics/ThrusterParticleSystem';
import type { Ship } from '@/game/ship/Ship';
import type { Grid } from '@/systems/physics/Grid';

/**
 * Populates the world with 100 ships, with varying tiers of ship scrappers.
 */
export async function populateWorldWithShips(
  shipRegistry: ShipRegistry,
  aiOrchestrator: AIOrchestratorSystem,
  targetShip: Ship,
  projectileSystem: ProjectileSystem,
  camera: Camera,
  thrusterFx: ThrusterParticleSystem,
  grid: Grid
): Promise<void> {

  // Distribution of ship tiers: More common lower-tier ships, rarer higher-tier ships
  const shipTierDistribution = [
    { tier: 'ship_scrapper_0.json', count: 60 }, // Most common
    { tier: 'ship_scrapper_1.json', count: 15 },
    { tier: 'ship_scrapper_2.json', count: 10 },
    { tier: 'ship_scrapper_3.json', count: 7 },
    { tier: 'ship_scrapper_4.json', count: 5 },
    { tier: 'ship_scrapper_5.json', count: 2 },
    { tier: 'ship_scrapper_6.json', count: 1 }, // Rarest
  ];

  // Randomly select ships from each tier based on the distribution
  for (const { tier, count } of shipTierDistribution) {
    for (let i = 0; i < count; i++) {
      const ship = await loadShipFromJson(tier, grid);

      // Randomize ship position within world bounds (including negative x and y)
      const posX = Math.random() * WORLD_WIDTH - WORLD_WIDTH / 2; // Ranges from -16000 to 16000
      const posY = Math.random() * WORLD_HEIGHT - WORLD_HEIGHT / 2; // Ranges from -16000 to 16000
      ship.getTransform().position.x = posX;
      ship.getTransform().position.y = posY;

      // Register the ship
      shipRegistry.add(ship);

      // Initialize AI systems for this ship
      const emitter = new ThrusterEmitter(thrusterFx);
      const movement = new MovementSystem(ship, emitter);
      const weapons = new WeaponSystem(projectileSystem, camera);

      const controller = new AIControllerSystem(ship, movement, weapons);

      // Set initial AI state to seek the player
      controller['currentState'] = new SeekTargetState(controller, ship, targetShip);

      // Add the controller to the orchestrator
      aiOrchestrator.addController(controller);
    }
  }
}
