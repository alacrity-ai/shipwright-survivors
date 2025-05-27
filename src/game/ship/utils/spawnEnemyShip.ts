// src/game/ship/utils/spawnEnemyShip.ts

import { Ship } from '@/game/ship/Ship';
import { MovementSystem } from '@/systems/physics/MovementSystem';
import { WeaponSystem } from '@/systems/combat/WeaponSystem';
import { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import { SeekTargetState } from '@/systems/ai/fsm/SeekTargetState';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import type { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import type { ThrusterParticleSystem } from '@/systems/physics/ThrusterParticleSystem';
import type { Grid } from '@/systems/physics/Grid';
import { ThrusterEmitter } from '@/systems/physics/ThrusterEmitter';

/**
 * Spawns a single enemy ship and attaches it to the AI orchestrator.
 */
export function spawnEnemyShip(
  near: { x: number; y: number },
  shipRegistry: ShipRegistry,
  aiOrchestrator: AIOrchestratorSystem,
  projectileSystem: ProjectileSystem,
  thrusterFx: ThrusterParticleSystem,
  target: Ship,
  grid: Grid
): void {
  const ship = new Ship(grid);

  // === Minimal AI ship structure ===
  ship.placeBlockById({ x: 0, y: 0 }, 'cockpit');
  ship.placeBlockById({ x: 0, y: 1 }, 'engine0');
  ship.placeBlockById({ x: -1, y: 0 }, 'turret0');
  ship.placeBlockById({ x: 1, y: 0 }, 'turret0');

  // Position near the player
  ship.getTransform().position.x = near.x + 500;
  ship.getTransform().position.y = near.y;

  shipRegistry.add(ship);

  const emitter = new ThrusterEmitter(thrusterFx);
  const movement = new MovementSystem(ship, emitter);
  const weapons = new WeaponSystem(projectileSystem);
  const controller = new AIControllerSystem(ship, movement, weapons);

  // Set initial state to seek player
  controller['currentState'] = new SeekTargetState(controller, ship, target);

  aiOrchestrator.addController(controller);
}
