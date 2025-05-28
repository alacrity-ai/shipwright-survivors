// src/systems/combat/LaserSystem.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { Camera } from '@/core/Camera';
import type { CombatService } from '@/systems/combat/CombatService';
import type { Grid } from '@/systems/physics/Grid';
import type { Ship } from '@/game/ship/Ship';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { ShipTransform } from '@/systems/physics/MovementSystem';
import type { IUpdatable, IRenderable } from '@/core/interfaces/types';
import { ShipRegistry } from '@/game/ship/ShipRegistry';

interface LaserBeam {
  origin: { x: number; y: number };
  target: { x: number; y: number };
}

export class LaserSystem implements IUpdatable, IRenderable {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly beamLength = 2000;
  private activeBeams: LaserBeam[] = [];

  private intentMap: Map<Ship, { intent: WeaponIntent; transform: ShipTransform }> = new Map();

  constructor(
    canvasManager: CanvasManager,
    private readonly camera: Camera,
    private readonly grid: Grid,
    private readonly combatService: CombatService,
    private readonly shipRegistry: ShipRegistry
  ) {
    this.ctx = canvasManager.getContext('fx');
  }

  public queueUpdate(ship: Ship, transform: ShipTransform, intent: WeaponIntent): void {
    this.intentMap.set(ship, { intent, transform });
  }

  public update(dt: number): void {
    this.activeBeams = [];

    for (const [ship, { intent, transform }] of this.intentMap.entries()) {
      const energy = ship.getEnergyComponent();
      if (!intent?.fireSecondary) continue;

      const laserBlocks = ship.getAllBlocks().filter(([_, b]) =>
        b.type.id.startsWith('laser') &&
        b.type.behavior?.canFire &&
        b.type.behavior.fire?.fireType === 'laser'
      );

      if (laserBlocks.length === 0) continue;

      // Lazily initialize energy component if necessary
      if (!energy && laserBlocks.length > 0) {
        ship.enableEnergyComponent(); // initializes based on laser blocks
      }

      const energyComponent = ship.getEnergyComponent();
      if (!energyComponent) continue;

      const energyCostPerLaser = 0.25;
const totalEnergyCost = energyCostPerLaser * laserBlocks.length;
      if (!energyComponent.spend(totalEnergyCost)) continue;

      for (const [coord, block] of laserBlocks) {
        const fire = block.type.behavior!.fire!;
        const localX = coord.x * 32;
        const localY = coord.y * 32;

        // === Transform block-local offset into world-space ===
        const cos = Math.cos(transform.rotation);
        const sin = Math.sin(transform.rotation);
        const rotatedX = localX * cos - localY * sin;
        const rotatedY = localX * sin + localY * cos;

        const originX = transform.position.x + rotatedX;
        const originY = transform.position.y + rotatedY;

        // === If no aim target provided, skip ===
        if (!intent.aimAt) continue;

        const dx = intent.aimAt.x - originX;
        const dy = intent.aimAt.y - originY;
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag === 0) continue;

        const dirX = dx / mag;
        const dirY = dy / mag;

        // Combine ship's rotation with block's relative rotation (if any)
        const blockRotation = ('rotation' in block && typeof block.rotation === 'number') 
          ? block.rotation 
          : 0;

        const angle = transform.rotation + blockRotation - Math.PI / 2;

        const targetX = originX + Math.cos(angle) * this.beamLength;
        const targetY = originY + Math.sin(angle) * this.beamLength;

        const hitBlocks = this.grid.getBlocksAlongRay(
          { x: originX, y: originY },
          { x: targetX, y: targetY }
        );

        for (const hit of hitBlocks) {
          if (hit.ownerShipId === ship.id) continue;

          const targetShip = this.shipRegistry.getById(hit.ownerShipId);
          if (!targetShip) continue;

          const coord = targetShip.findBlockCoord(hit);
          if (!coord) continue;

          this.combatService.applyDamageToBlock(
            targetShip,
            hit,
            coord,
            fire.fireDamage,
            'laser'
          );

          break; // Only damage first hit block per beam
        }

        this.activeBeams.push({
          origin: { x: originX, y: originY },
          target: { x: targetX, y: targetY },
        });
      }

    }

    this.intentMap.clear();
  }

  public render(): void {
    const ctx = this.ctx;
    ctx.save();

    // ❌ REMOVE this — already handled inside `worldToScreen`
    // ctx.scale(this.camera.zoom, this.camera.zoom);

    for (const beam of this.activeBeams) {
      const start = this.camera.worldToScreen(beam.origin.x, beam.origin.y);
      const end = this.camera.worldToScreen(beam.target.x, beam.target.y);

      // Core beam
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#00CCFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      // Glow
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#00FFFF';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }

    ctx.restore();
  }
}
