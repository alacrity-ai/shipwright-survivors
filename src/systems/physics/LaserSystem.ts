import type { CanvasManager } from '@/core/CanvasManager';
import type { Camera } from '@/core/Camera';
import type { CombatService } from '@/systems/combat/CombatService';
import type { Grid } from '@/systems/physics/Grid';
import type { Ship } from '@/game/ship/Ship';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { IUpdatable, IRenderable } from '@/core/interfaces/types';
import type { ParticleManager } from '@/systems/fx/ParticleManager';

import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { createBeamLight } from '@/lighting/lights/createBeamLight';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { randomFromArray } from '@/shared/arrayUtils';

import { LASER_BEAM_COLORS } from '@/game/blocks/BlockColorSchemes';
import { 
  findObjectByBlock, 
  findBlockCoordinatesInObject, 
  getWorldPositionFromObjectCoord, 
  rotate } from '@/game/entities/utils/universalBlockInterfaceUtils';

interface LaserBeam {
  origin: { x: number; y: number };
  target: { x: number; y: number };
  age: number;
  intensity: number;
  coreWidth: number;
  glowPulse: number;
  blockTypeId: string;
}

export class LaserSystem implements IUpdatable, IRenderable {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly beamLength = 2000;
  private activeBeams: LaserBeam[] = [];
  private intentMap: Map<Ship, { intent: WeaponIntent; transform: BlockEntityTransform }> = new Map();

  constructor(
    canvasManager: CanvasManager,
    private readonly camera: Camera,
    private readonly grid: Grid,
    private readonly combatService: CombatService,
    private readonly particleManager: ParticleManager,
    private readonly playerShip: Ship
  ) {
    this.ctx = canvasManager.getContext('fx');
  }

  public queueUpdate(ship: Ship, transform: BlockEntityTransform, intent: WeaponIntent): void {
    this.intentMap.set(ship, { intent, transform });
  }

  public update(dt: number): void {
    // Animate existing beams
    for (const beam of this.activeBeams) {
      beam.age += dt;
      beam.intensity = 0.75 + 0.25 * Math.sin(beam.age * 10);
      beam.glowPulse = 0.5 + 0.5 * Math.sin(beam.age * 4);
    }

    this.activeBeams = [];

    for (const [ship, { intent, transform }] of this.intentMap.entries()) {
      if (!intent?.fireSecondary) continue;

      const laserBlocks = ship.getAllBlocks().filter(([_, b]) =>
        b.type.id.startsWith('laser') &&
        b.type.behavior?.canFire &&
        b.type.behavior.fire?.fireType === 'laser'
      );
      if (laserBlocks.length === 0) continue;

      let energyComponent = ship.getEnergyComponent();
      if (!energyComponent) {
        ship.enableEnergyComponent();
        energyComponent = ship.getEnergyComponent();
      }
      if (!energyComponent) continue;

      let totalEnergyCost = 0;
      for (const [, block] of laserBlocks) {
        const blockCost = block.type.behavior?.fire?.energyCost ?? 0.25;
        totalEnergyCost += blockCost;
      }

      if (!energyComponent.spend(totalEnergyCost)) continue;

      for (const [coord, block] of laserBlocks) {
        const fire = block.type.behavior!.fire!;
        const origin = getWorldPositionFromObjectCoord(transform, coord);
        if (!intent.aimAt) continue;

        // With this corrected calculation (following thruster pattern):
        const blockRotation = typeof block.rotation === 'number' ? block.rotation : 0;
        const blockRotRad = blockRotation * (Math.PI / 180);

        // Local direction the block is facing (assuming 0° = facing up in local space)
        // Adjust this base direction if your blocks have a different 0° orientation
        const localDirection = { x: 0, y: -1 }; // or { x: 1, y: 0 } if 0° = facing right

        // Rotate local direction by block rotation
        const blockRotatedDir = rotate(localDirection.x, localDirection.y, blockRotRad);

        // Rotate by ship rotation to get world direction
        const worldDirection = rotate(blockRotatedDir.x, blockRotatedDir.y, transform.rotation);

        const dirX = worldDirection.x;
        const dirY = worldDirection.y;
        const targetX = origin.x + dirX * this.beamLength;
        const targetY = origin.y + dirY * this.beamLength;

        let beamTargetX = targetX;
        let beamTargetY = targetY;

        const hit = this.grid.getFirstBlockAlongRay(origin, { x: targetX, y: targetY }, ship.id);

        if (hit) {
          beamTargetX = hit.point.x;
          beamTargetY = hit.point.y;

          const targetShip = findObjectByBlock(hit.block);
          const hitCoord = targetShip ? findBlockCoordinatesInObject(hit.block, targetShip) : null;
          if (targetShip && hitCoord) {
            this.combatService.applyDamageToBlock(
              targetShip,
              hit.block,
              hitCoord,
              fire.fireDamage!,
              'laser',
              this.playerShip
            );
          }
        }

        // Compute beam extension
        const overshoot = 128;
        const dx = beamTargetX - origin.x;
        const dy = beamTargetY - origin.y;
        const magSq = dx * dx + dy * dy;

        let visualTargetX = beamTargetX;
        let visualTargetY = beamTargetY;
        let invMag = 0;
        let orthoX = 0;
        let orthoY = 0;

        if (magSq > 1e-4) {
          invMag = 1 / Math.sqrt(magSq);
          visualTargetX += dx * invMag * overshoot;
          visualTargetY += dy * invMag * overshoot;

          orthoX = -dy * invMag;
          orthoY = dx * invMag;
        }

        this.activeBeams.push({
          origin: { x: origin.x, y: origin.y },
          target: { x: visualTargetX, y: visualTargetY },
          age: 0,
          intensity: Math.random() * 0.5 + 0.75,
          coreWidth: 3 + Math.random(),
          glowPulse: Math.random() * Math.PI * 2,
          blockTypeId: block.type.id,
        });

        // Stochastic random chance to create the light:
        if (Math.random() < 0.1) {
          const palette = LASER_BEAM_COLORS[block.type.id];
          const lightingOrchestrator = LightingOrchestrator.getInstance();
          if (PlayerSettingsManager.getInstance().isLightingEnabled() && palette) {
            const color = randomFromArray(palette);
            const light = createBeamLight({
              start: { x: origin.x, y: origin.y },
              end: { x: visualTargetX, y: visualTargetY },
              width: 12 + Math.random() * 4,
              color,
              intensity: 0.6 + Math.random() * 0.4,
              life: 150,
              expires: true,
            });

            lightingOrchestrator.registerLight(light);
          }
        }
      }
    }

    this.intentMap.clear();
  }

  public render(): void {
    const ctx = this.ctx;
    ctx.save();

    for (const beam of this.activeBeams) {
      const start = this.camera.worldToScreen(beam.origin.x, beam.origin.y);
      const end = this.camera.worldToScreen(beam.target.x, beam.target.y);

      const colors = LASER_BEAM_COLORS[beam.blockTypeId] ?? ['#FFFFFF', '#00CCFF', '#00FFFF'];
      const [coreColor, glowColor1, glowColor2] = colors;

      // Core beam (tight center line)
      ctx.globalAlpha = beam.intensity;
      ctx.strokeStyle = coreColor;
      ctx.lineWidth = beam.coreWidth + Math.sin(beam.age * 20) * 0.5;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      // Glow layer 1 (pulsing outer line)
      ctx.globalAlpha = 0.2 + 0.2 * beam.glowPulse;
      ctx.strokeStyle = glowColor1;
      ctx.lineWidth = 7 + Math.sin(beam.age * 4);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      // Glow layer 2 (wide halo)
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = glowColor2;
      ctx.lineWidth = 11 + 2 * Math.sin(beam.age * 2);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }

    ctx.restore();
  }
}
