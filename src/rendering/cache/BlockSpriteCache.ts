// src/rendering/BlockSpriteCache.ts

import { BLOCK_SIZE, getAllBlockTypes } from '@/game/blocks/BlockRegistry';
import { renderLaserWeapon } from './blockRenderers/laserBlockRenderer';
import { renderHullBlock } from './blockRenderers/hullBlockRenderer';
import { renderFacetPlate } from './blockRenderers/facePlateBlockRenderer';
import { renderTurret } from './blockRenderers/turretBlockRenderer';
import { renderReactorCore } from './blockRenderers/reactorBlockRenderer';
import { renderEngine } from './blockRenderers/engineBlockRenderer';
import { renderFin } from './blockRenderers/finBlockRenderer';
import { renderBatteryModule } from './blockRenderers/batteryBlockRenderer';
import { renderShieldGenerator } from './blockRenderers/shieldBlockRenderer';
import { renderHarvester } from './blockRenderers/harvestBlockRenderer';
import { renderExplosiveLance } from './blockRenderers/explosiveLanceBlockRenderer';
import { createTextureFromCanvas } from '@/rendering/gl/glTextureUtils';
import { renderHaloBladeBlock } from './blockRenderers/haloBladeBlockRenderer';

// --- Damage Level Enum ---

export enum DamageLevel {
  NONE = 'none',
  LIGHT = 'light',
  MODERATE = 'moderate',
  HEAVY = 'heavy',
}

// --- Sprite Interfaces ---

export interface BlockSprite {
  base: HTMLCanvasElement;
  overlay?: HTMLCanvasElement;
}

export interface DamagedBlockSprite {
  [DamageLevel.NONE]: BlockSprite;
  [DamageLevel.LIGHT]: BlockSprite;
  [DamageLevel.MODERATE]: BlockSprite;
  [DamageLevel.HEAVY]: BlockSprite;
}

const spriteCache: Map<string, DamagedBlockSprite> = new Map();

// --- GL Sprite Interfaces ---

export interface GLBlockSprite {
  base: WebGLTexture;
  overlay?: WebGLTexture;
}

export interface GLDamagedBlockSprite {
  [DamageLevel.NONE]: GLBlockSprite;
  [DamageLevel.LIGHT]: GLBlockSprite;
  [DamageLevel.MODERATE]: GLBlockSprite;
  [DamageLevel.HEAVY]: GLBlockSprite;
}

const glSpriteCache: Map<string, GLDamagedBlockSprite> = new Map();

// --- Canvas Helpers ---

function createBlankCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = BLOCK_SIZE;
  canvas.height = BLOCK_SIZE;
  return canvas;
}

function applyDamageToCanvas(
  source: HTMLCanvasElement,
  level: DamageLevel
): HTMLCanvasElement {
  if (level === DamageLevel.NONE) return source;

  const damaged = createBlankCanvas();
  const ctx = damaged.getContext('2d')!;
  const tmp = createBlankCanvas();
  const tmpCtx = tmp.getContext('2d')!;

  const config = {
    [DamageLevel.LIGHT]: { opacity: 0.9, tint: 'rgba(255,0,0,0.1)', cracks: false },
    [DamageLevel.MODERATE]: { opacity: 0.7, tint: 'rgba(255,0,0,0.25)', cracks: true },
    [DamageLevel.HEAVY]: { opacity: 0.4, tint: 'rgba(255,0,0,0.4)', cracks: true },
  }[level]!;

  // Step 1: Copy source image to destination with opacity
  ctx.globalAlpha = config.opacity;
  ctx.drawImage(source, 0, 0);
  ctx.globalAlpha = 1;

  // Step 2: Prepare damage overlay
  tmpCtx.clearRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
  tmpCtx.fillStyle = config.tint;
  tmpCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);

  // Step 3: Mask the damage overlay using the alpha from the original
  tmpCtx.globalCompositeOperation = 'destination-in';
  tmpCtx.drawImage(source, 0, 0);
  tmpCtx.globalCompositeOperation = 'source-over';

  // Step 4: Draw masked damage overlay onto the final damaged canvas
  ctx.drawImage(tmp, 0, 0);

  // Step 5: Draw cracks, also clipped to alpha mask
  if (config.cracks) {
    tmpCtx.clearRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
    tmpCtx.strokeStyle = level === DamageLevel.HEAVY ? 'rgba(40,40,40,0.9)' : 'rgba(60,60,60,0.7)';
    tmpCtx.lineWidth = level === DamageLevel.HEAVY ? 2 : 1;
    const half = BLOCK_SIZE / 2;

    tmpCtx.beginPath();
    tmpCtx.moveTo(half * 0.2, half * 0.4);
    tmpCtx.lineTo(half * 1.6, half * 1.8);
    tmpCtx.moveTo(half * 0.4, half * 1.8);
    tmpCtx.lineTo(half * 1.8, half * 0.2);

    if (level === DamageLevel.HEAVY) {
      tmpCtx.moveTo(0, half);
      tmpCtx.lineTo(half * 0.8, half * 1.2);
      tmpCtx.moveTo(half * 1.2, half * 0.8);
      tmpCtx.lineTo(BLOCK_SIZE, half);
    }

    tmpCtx.stroke();

    // Clip the cracks to the alpha mask of the original shape
    tmpCtx.globalCompositeOperation = 'destination-in';
    tmpCtx.drawImage(source, 0, 0);
    tmpCtx.globalCompositeOperation = 'source-over';

    ctx.drawImage(tmp, 0, 0);
  }

  return damaged;
}

function generateDamageVariants(base: BlockSprite): DamagedBlockSprite {
  return {
    [DamageLevel.NONE]: base,
    [DamageLevel.LIGHT]: {
      base: applyDamageToCanvas(base.base, DamageLevel.LIGHT),
      overlay: base.overlay ? applyDamageToCanvas(base.overlay, DamageLevel.LIGHT) : undefined,
    },
    [DamageLevel.MODERATE]: {
      base: applyDamageToCanvas(base.base, DamageLevel.MODERATE),
      overlay: base.overlay ? applyDamageToCanvas(base.overlay, DamageLevel.MODERATE) : undefined,
    },
    [DamageLevel.HEAVY]: {
      base: applyDamageToCanvas(base.base, DamageLevel.HEAVY),
      overlay: base.overlay ? applyDamageToCanvas(base.overlay, DamageLevel.HEAVY) : undefined,
    },
  };
}

// --- Block Drawing ---

function drawProceduralBlock(typeId: string): void {
  const baseCanvas = createBlankCanvas();
  const baseCtx = baseCanvas.getContext('2d')!;
  const overlayCanvas = createBlankCanvas();
  const overlayCtx = overlayCanvas.getContext('2d')!;

  switch (typeId) {
    case 'cockpit0':
      baseCtx.fillStyle = '#444';
      baseCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
      baseCtx.fillStyle = '#ff2222';
      baseCtx.beginPath();
      baseCtx.arc(BLOCK_SIZE / 2, BLOCK_SIZE / 2, 8, 0, Math.PI * 2);
      baseCtx.fill();
      break;
    case 'cockpit1':
      baseCtx.fillStyle = '#444';
      baseCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
      baseCtx.fillStyle = '#0ff';
      baseCtx.beginPath();
      baseCtx.arc(BLOCK_SIZE / 2, BLOCK_SIZE / 2, 8, 0, Math.PI * 2);
      baseCtx.fill();
      break;

    case 'hull0':
    case 'hull1':
      renderHullBlock(baseCtx, BLOCK_SIZE, [
        [0, '#C0C0C0'],  // Bright metallic silver
        [0.3, '#A0A0A0'], // Medium grey
        [0.7, '#808080'], // Darker grey
        [1, '#606060'],   // Deep shadow
      ]);
      break;

    case 'hull2':
      renderHullBlock(baseCtx, BLOCK_SIZE, [
        [0, '#66FF66'],   // Bright neon green
        [0.2, '#4CAF50'], // Vibrant green
        [0.6, '#388E3C'], // Medium green
        [1, '#1B5E20'],   // Deep forest green
      ]);
      break;

    case 'hull3':
      renderHullBlock(baseCtx, BLOCK_SIZE, [
        [0, '#64B5F6'],   // Bright cyan-blue
        [0.2, '#2196F3'], // Rich blue
        [0.6, '#1976D2'], // Medium blue
        [1, '#0D47A1'],   // Deep navy blue
      ]);
      break;

    case 'hull4':
      renderHullBlock(baseCtx, BLOCK_SIZE, [
        [0, '#E1BEE7'],   // Bright metallic purple highlight
        [0.15, '#BA68C8'],// Vibrant purple
        [0.4, '#9C27B0'], // Rich purple
        [0.7, '#7B1FA2'], // Deep purple
        [1, '#4A148C'],   // Dark shadow purple
      ]);
      break;

    case 'facetplate0':
    case 'facetplate1':
      renderFacetPlate(baseCtx, BLOCK_SIZE, [
        [0, '#C0C0C0'],
        [0.3, '#A0A0A0'],
        [0.7, '#808080'],
        [1, '#606060'],
      ]);
      break;

    case 'facetplate2':
      renderFacetPlate(baseCtx, BLOCK_SIZE, [
        [0, '#66FF66'],
        [0.2, '#4CAF50'],
        [0.6, '#388E3C'],
        [1, '#1B5E20'],
      ]);
      break;

    case 'facetplate3':
      renderFacetPlate(baseCtx, BLOCK_SIZE, [
        [0, '#64B5F6'],
        [0.2, '#2196F3'],
        [0.6, '#1976D2'],
        [1, '#0D47A1'],
      ]);
      break;

    case 'facetplate4':
      renderFacetPlate(baseCtx, BLOCK_SIZE, [
        [0, '#E1BEE7'],
        [0.15, '#BA68C8'],
        [0.4, '#9C27B0'],
        [0.7, '#7B1FA2'],
        [1, '#4A148C'],
      ]);
      break;

    case 'turret0':
    case 'turret1':
      renderTurret(baseCtx, overlayCtx, BLOCK_SIZE, {
        baseGradientColors: ['#777', '#555', '#333'],
        rotatingBaseColors: ['#888', '#666', '#444'],
        barrelGradientStops: [
          [0, '#444'],
          [0.3, '#f44'],
          [0.7, '#c22'],
          [1, '#822']
        ],
        barrelWidth: 6,
        barrelLength: BLOCK_SIZE * 0.6,
      });
      break;

    case 'turret2':
      renderTurret(baseCtx, overlayCtx, BLOCK_SIZE, {
        baseGradientColors: ['#66BB6A', '#4CAF50', '#2E7D32'],
        rotatingBaseColors: ['#81C784', '#4CAF50', '#1B5E20'],
        barrelGradientStops: [
          [0, '#1B5E20'],
          [0.2, '#388E3C'],
          [0.5, '#4CAF50'],
          [0.8, '#66BB6A'],
          [1, '#2E7D32']
        ],
        barrelWidth: 7,
        barrelLength: BLOCK_SIZE * 0.65,
      });
      break;

    case 'turret3':
      renderTurret(baseCtx, overlayCtx, BLOCK_SIZE, {
        baseGradientColors: ['#64B5F6', '#2196F3', '#1565C0'],
        rotatingBaseColors: ['#90CAF9', '#42A5F5', '#1976D2', '#0D47A1'],
        barrelGradientStops: [
          [0, '#0D47A1'],
          [0.15, '#1565C0'],
          [0.4, '#1976D2'],
          [0.6, '#2196F3'],
          [0.85, '#64B5F6'],
          [1, '#1565C0']
        ],
        barrelWidth: 8,
        barrelLength: BLOCK_SIZE * 0.7,
      });
      break;

    case 'turret4':
      renderTurret(baseCtx, overlayCtx, BLOCK_SIZE, {
        baseGradientColors: ['#E1BEE7', '#BA68C8', '#9C27B0', '#7B1FA2', '#4A148C'],
        rotatingBaseColors: ['#F3E5F5', '#E1BEE7', '#CE93D8', '#AB47BC', '#8E24AA'],
        barrelGradientStops: [
          [0, '#4A148C'],
          [0.1, '#6A1B99'],
          [0.25, '#7B1FA2'],
          [0.4, '#8E24AA'],
          [0.6, '#AB47BC'],
          [0.75, '#CE93D8'],
          [0.9, '#E1BEE7'],
          [1, '#7B1FA2']
        ],
        barrelWidth: 10,
        barrelLength: BLOCK_SIZE * 0.75,
      });
      break;

    case 'laser0':
      renderLaserWeapon(baseCtx, BLOCK_SIZE, {
        body: ['#3A3A3A', '#2A2A2A', '#1A1A1A', '#101010'],
        housing: '#64B5F6',
        innerHousing: '#1565C0',
        barrel: ['#81D4FA', '#0288D1', '#81D4FA'],
        barrelDetail: '#B3E5FC',
        glow: ['#4FC3F7', '#0288D1', 'rgba(2, 136, 209, 0)'],
        muzzleGlow: ['#FFFFFF', '#4FC3F7', '#0288D1', 'rgba(2, 136, 209, 0)'],
        muzzleCore: '#FFFFFF'
      });
      break;

    case 'laser1':
      renderLaserWeapon(baseCtx, BLOCK_SIZE, {
        body: ['#555D66', '#3C444D', '#2B3036', '#1E2227'], // Grey-steel
        housing: '#90A4AE',          // Blue-grey
        innerHousing: '#546E7A',     // Darker slate blue
        barrel: ['#B0BEC5', '#78909C', '#B0BEC5'],
        barrelDetail: '#CFD8DC',
        glow: ['#4FC3F7', '#0288D1', 'rgba(2, 136, 209, 0)'], // soft electric blue
        muzzleGlow: ['#E1F5FE', '#81D4FA', '#0288D1', 'rgba(2, 136, 209, 0)'],
        muzzleCore: '#E0F7FA'
      });
      break;
    case 'laser2':
      renderLaserWeapon(baseCtx, BLOCK_SIZE, {
        body: ['#355E3B', '#254D32', '#1B3C29', '#122D21'], // Jungle/olive tones
        housing: '#AED581',           // Light green
        innerHousing: '#7CB342',      // Lime green
        barrel: ['#C5E1A5', '#8BC34A', '#C5E1A5'],
        barrelDetail: '#DCEDC8',
        glow: ['#76FF03', '#64DD17', 'rgba(100, 221, 23, 0)'],
        muzzleGlow: ['#CCFF90', '#AEEA00', '#64DD17', 'rgba(174, 234, 0, 0)'],
        muzzleCore: '#F0F4C3'
      });
      break;
    case 'laser3':
      renderLaserWeapon(baseCtx, BLOCK_SIZE, {
        body: ['#2E003E', '#1D002A', '#14001F', '#0A0014'], // Near-black purples
        housing: '#9575CD',           // Soft lavender
        innerHousing: '#673AB7',      // Deep purple
        barrel: ['#B39DDB', '#7E57C2', '#B39DDB'],
        barrelDetail: '#D1C4E9',
        glow: ['#D500F9', '#AA00FF', 'rgba(170, 0, 255, 0)'],
        muzzleGlow: ['#E1BEE7', '#BA68C8', '#8E24AA', 'rgba(142, 36, 170, 0)'],
        muzzleCore: '#F3E5F5'
      });
      break;

    case 'reactor0':
    case 'reactor1':
      renderReactorCore(baseCtx, BLOCK_SIZE, {
        chassisStops: [
          [0, '#2C2C2C'],    // Top: dark steel
          [0.5, '#1E1E1E'],  // Mid: graphite
          [1, '#0F0F0F'],    // Bottom: deep shadow
        ],
        coreRingStops: [
          [0.0, '#4FC3F7'],          // Cyan outer rim
          [0.4, '#0288D1'],          // Plasma blue
          [1.0, '#00000000'],        // Transparent
        ],
        coreRingInnerRadius: 4,
        coreGlowStops: [
          [0, '#81D4FA'],            // Bright spark
          [0.4, '#4FC3F7'],
          [1, 'rgba(129, 212, 250, 0)'],
        ],
        coreGlowRadius: 6,
        boltColor: '#64B5F6',
      });
      break;
    case 'reactor2':
      renderReactorCore(baseCtx, BLOCK_SIZE, {
        chassisStops: [
          [0, '#1C0D2B'],     // Dark violet top
          [0.5, '#2A1850'],   // Rich purple core
          [1, '#100820'],     // Deep base
        ],
        coreRingStops: [
          [0.0, '#BA68C8'],   // Light magenta rim
          [0.4, '#8E24AA'],   // Core arc
          [1.0, '#00000000'], // Fade out
        ],
        coreRingInnerRadius: 5,
        coreGlowStops: [
          [0, '#CE93D8'],     // Soft lilac core
          [0.5, '#AB47BC'],
          [1, 'rgba(171, 71, 188, 0)'],
        ],
        coreGlowRadius: 7,
        boltColor: '#D1C4E9',
      });
      break;

    case 'battery0':
    case 'battery1':
      renderBatteryModule(baseCtx, BLOCK_SIZE, {
        chassisStops: [
          [0, '#263238'],
          [0.5, '#37474F'],
          [1, '#102027'],
        ],
        cellGlowStops: [
          [0, '#B2EBF2'],
          [0.5, '#4DD0E1'],
          [1, 'rgba(77, 208, 225, 0)'],
        ],
        coreRadius: 7,
        terminalColor: '#B0BEC5',
        terminalSize: 3,
      });
      break;
    case 'battery2':
      renderBatteryModule(baseCtx, BLOCK_SIZE, {
        chassisStops: [
          [0, '#311B92'],
          [0.5, '#512DA8'],
          [1, '#1A237E'],
        ],
        cellGlowStops: [
          [0, '#D1C4E9'],
          [0.5, '#9575CD'],
          [1, 'rgba(149, 117, 205, 0)'],
        ],
        coreRadius: 8,
        terminalColor: '#EDE7F6',
        terminalSize: 3,
      });
      break;

    case 'shield0':
    case 'shield1':
      renderShieldGenerator(baseCtx, BLOCK_SIZE, {
        chassisStops: [
          [0, '#1A1A2E'],
          [0.5, '#16213E'],
          [1, '#0F3460'],
        ],
        emitterGlowStops: [
          [0, '#BBDEFB'],
          [0.5, '#42A5F5'],
          [1, 'rgba(66, 165, 245, 0)'],
        ],
        emitterRadius: 10,
        ringColor: '#90CAF9',
        terminalColor: '#E3F2FD',
      });
      break;

    case 'shield2':
      renderShieldGenerator(baseCtx, BLOCK_SIZE, {
        chassisStops: [
          [0, '#003322'],           // Deep jungle green
          [0.5, '#005533'],         // Rich viridian
          [1, '#00261A'],           // Subsurface shadow
        ],
        emitterGlowStops: [
          [0, '#66FFCC'],           // Mint core
          [0.5, '#00CC88'],         // Vivid teal
          [1, 'rgba(0, 204, 136, 0)'],
        ],
        emitterRadius: 11,
        ringColor: '#00E6A8',       // Neon green-cyan blend
        terminalColor: '#CCFFEE',
      });
      break;

    case 'shield3':
      renderShieldGenerator(baseCtx, BLOCK_SIZE, {
        chassisStops: [
          [0, '#4A0033'],           // Velvet crimson
          [0.5, '#800080'],         // Royal purple
          [1, '#2E003E'],           // Deep ultraviolet
        ],
        emitterGlowStops: [
          [0, '#FFB3E6'],           // Pale pink plasma
          [0.5, '#E040FB'],         // Bright magenta
          [1, 'rgba(224, 64, 251, 0)'],
        ],
        emitterRadius: 12,
        ringColor: '#FF80AB',       // Radiant rose edge
        terminalColor: '#FFD6F9',
      });
      break;

    case 'engine0':
    case 'engine1':
      renderEngine(baseCtx, BLOCK_SIZE, {
        bodyStops: [
          [0, '#C0C0C0'],
          [0.5, '#A0A0A0'],
          [1, '#808080'],
        ],
        thrustColor: '#09f', // Electric blue
      });
      break;

    case 'engine2':
      renderEngine(baseCtx, BLOCK_SIZE, {
        bodyStops: [
          [0, '#66FF66'],
          [0.5, '#4CAF50'],
          [1, '#388E3C'],
        ],
        thrustColor: '#0f0', // Green
      });
      break;

    case 'engine3':
      renderEngine(baseCtx, BLOCK_SIZE, {
        bodyStops: [
          [0, '#64B5F6'],
          [0.5, '#2196F3'],
          [1, '#1976D2'],
        ],
        thrustColor: '#00f', // Deep blue
      });
      break;

    case 'engine4':
      renderEngine(baseCtx, BLOCK_SIZE, {
        bodyStops: [
          [0, '#B39DDB'],
          [0.5, '#7B1FA2'],
          [1, '#4A148C'],
        ],
        thrustColor: '#f0f', // Purple glow
      });
      break;

    case 'fin0':
    case 'fin1':
      renderFin(baseCtx, BLOCK_SIZE, [
        [0, '#E0E0E0'],
        [0.3, '#B0B0B0'],
        [0.7, '#808080'],
        [1, '#404040'],
      ]);
      break;

    case 'fin2':
      renderFin(baseCtx, BLOCK_SIZE, [
        [0, '#81C784'],
        [0.2, '#66BB6A'],
        [0.5, '#4CAF50'],
        [0.8, '#2E7D32'],
        [1, '#1B5E20'],
      ]);
      break;

    case 'fin3':
      renderFin(baseCtx, BLOCK_SIZE, [
        [0, '#90CAF9'],
        [0.15, '#64B5F6'],
        [0.4, '#42A5F5'],
        [0.7, '#1E88E5'],
        [0.9, '#1565C0'],
        [1, '#0D47A1'],
      ]);
      break;

    case 'fin4':
      renderFin(baseCtx, BLOCK_SIZE, [
        [0, '#F3E5F5'],
        [0.1, '#E1BEE7'],
        [0.25, '#CE93D8'],
        [0.45, '#BA68C8'],
        [0.65, '#AB47BC'],
        [0.8, '#8E24AA'],
        [0.95, '#6A1B99'],
        [1, '#4A148C'],
      ]);
      break;

    case 'harvester0':
    case 'harvester1':
      renderHarvester(baseCtx, BLOCK_SIZE, {
        intakeColor: '#00ACC1',
        vortexColor: '#4DD0E1',
        ringColor: 'rgba(0, 200, 255, 0.35)',
        casingStops: [
          [0, '#263238'],
          [0.5, '#37474F'],
          [1, '#212121']
        ]
      });
      break;
    case 'harvester2':
      renderHarvester(baseCtx, BLOCK_SIZE, {
        intakeColor: '#00BFA5',
        vortexColor: '#1DE9B6',
        ringColor: 'rgba(106, 0, 255, 0.4)',
        casingStops: [
          [0, '#004D40'],
          [0.5, '#00695C'],
          [1, '#00251A']
        ]
      });
      break;

    // Explosive Lance variants
    case 'explosiveLance0':
    case 'explosiveLance1':
      renderExplosiveLance(baseCtx, overlayCtx, BLOCK_SIZE, {
        baseGradientColors: ['#2e2e2e', '#3c3c3c', '#121212'],
        barrelGradientStops: [
          [0, '#cccccc'],
          [0.5, '#888888'],
          [1, '#444444']
        ]
      });
      break;

    case 'explosiveLance2':
      renderExplosiveLance(baseCtx, overlayCtx, BLOCK_SIZE, {
        baseGradientColors: ['#1b3d2f', '#2c704f', '#09251a'],
        barrelGradientStops: [
          [0, '#a8e6cf'],
          [0.5, '#56c596'],
          [1, '#228b22']
        ]
      });
      break;

    case 'explosiveLance3':
      renderExplosiveLance(baseCtx, overlayCtx, BLOCK_SIZE, {
        baseGradientColors: ['#0d47a1', '#1976d2', '#0a1a3f'],
        barrelGradientStops: [
          [0, '#82b1ff'],
          [0.5, '#448aff'],
          [1, '#2962ff']
        ]
      });
      break;

    case 'explosiveLance4':
      renderExplosiveLance(baseCtx, overlayCtx, BLOCK_SIZE, {
        baseGradientColors: ['#4a148c', '#7b1fa2', '#12002e'],
        barrelGradientStops: [
          [0, '#e1bee7'],
          [0.5, '#ba68c8'],
          [1, '#8e24aa']
        ]
      });
      break;

    case 'haloBlade0':
    case 'haloBlade1':
      renderHaloBladeBlock(baseCtx, BLOCK_SIZE, {
        ringColor: '#FFBF00',
        coreColor: '#FFEB3B',
        glowColor: 'rgba(255, 191, 0, 0.4)',
        casingStops: [
          [0, '#3A3A3A'],
          [0.5, '#2A2A2A'],
          [1, '#101010']
        ]
      });
      break;

    case 'haloBlade2':
      renderHaloBladeBlock(baseCtx, BLOCK_SIZE, {
        ringColor: '#2CFF05',
        coreColor: '#B2FF59',
        glowColor: 'rgba(44, 255, 5, 0.35)',
        casingStops: [
          [0, '#1B3C29'],
          [0.5, '#254D32'],
          [1, '#122D21']
        ]
      });
      break;

    case 'haloBlade3':
      renderHaloBladeBlock(baseCtx, BLOCK_SIZE, {
        ringColor: '#00FFFF',
        coreColor: '#80DEEA',
        glowColor: 'rgba(0, 255, 255, 0.35)',
        casingStops: [
          [0, '#263238'],
          [0.5, '#37474F'],
          [1, '#212121']
        ]
      });
      break;

    case 'haloBlade4':
      renderHaloBladeBlock(baseCtx, BLOCK_SIZE, {
        ringColor: '#7F00FF',
        coreColor: '#D1C4E9',
        glowColor: 'rgba(127, 0, 255, 0.4)',
        casingStops: [
          [0, '#2E003E'],
          [0.5, '#1D002A'],
          [1, '#0A0014']
        ]
      });
      break;
  }

  const baseSprite: BlockSprite = {
    base: baseCanvas,
    overlay: (
      typeId.startsWith('turret') ||
      typeId.startsWith('explosiveLance')
    )
      ? overlayCanvas
      : undefined,
  };

  const damagedVariants = generateDamageVariants(baseSprite);
  spriteCache.set(typeId, damagedVariants);
}

// --- API ---

export function initializeBlockSpriteCache(): void {
  for (const block of getAllBlockTypes()) {
    drawProceduralBlock(block.id);
  }
}

export function initializeGLBlockSpriteCache(gl: WebGLRenderingContext): void {
  let convertedCount = 0;

  for (const block of getAllBlockTypes()) {
    const raster = spriteCache.get(block.id);
    if (!raster) {
      console.warn(`[GLCache] No raster sprite found for block: ${block.id}`);
      continue;
    }

    try {
      const glVariants: GLDamagedBlockSprite = {
        [DamageLevel.NONE]: {
          base: createTextureFromCanvas(gl, raster[DamageLevel.NONE].base),
          overlay: raster[DamageLevel.NONE].overlay
            ? createTextureFromCanvas(gl, raster[DamageLevel.NONE].overlay!)
            : undefined,
        },
        [DamageLevel.LIGHT]: {
          base: createTextureFromCanvas(gl, raster[DamageLevel.LIGHT].base),
          overlay: raster[DamageLevel.LIGHT].overlay
            ? createTextureFromCanvas(gl, raster[DamageLevel.LIGHT].overlay!)
            : undefined,
        },
        [DamageLevel.MODERATE]: {
          base: createTextureFromCanvas(gl, raster[DamageLevel.MODERATE].base),
          overlay: raster[DamageLevel.MODERATE].overlay
            ? createTextureFromCanvas(gl, raster[DamageLevel.MODERATE].overlay!)
            : undefined,
        },
        [DamageLevel.HEAVY]: {
          base: createTextureFromCanvas(gl, raster[DamageLevel.HEAVY].base),
          overlay: raster[DamageLevel.HEAVY].overlay
            ? createTextureFromCanvas(gl, raster[DamageLevel.HEAVY].overlay!)
            : undefined,
        },
      };

      glSpriteCache.set(block.id, glVariants);
      convertedCount++;
    } catch (e) {
      console.error(`[GLCache] Failed to convert block sprite to GL texture: ${block.id}`, e);
    }
  }

  console.log(`[GLCache] Total GL textures initialized: ${convertedCount}`);
}

export function destroyGLBlockSpriteCache(gl: WebGLRenderingContext): void {
  for (const [typeId, damagedVariants] of glSpriteCache.entries()) {
    for (const level of Object.values(DamageLevel)) {
      const sprite = damagedVariants[level];
      if (sprite.base && gl.isTexture(sprite.base)) {
        gl.deleteTexture(sprite.base);
      }
      if (sprite.overlay && gl.isTexture(sprite.overlay)) {
        gl.deleteTexture(sprite.overlay);
      }
    }
  }

  glSpriteCache.clear();
}


export function getDamageLevel(currentHp: number, maxHp: number): DamageLevel {
  const ratio = Math.max(0, currentHp / maxHp);
  if (ratio > 0.75) return DamageLevel.NONE;
  if (ratio > 0.5) return DamageLevel.LIGHT;
  if (ratio > 0.25) return DamageLevel.MODERATE;
  return DamageLevel.HEAVY;
}

export function getBlockSprite(typeId: string, level: DamageLevel = DamageLevel.NONE): BlockSprite {
  const entry = spriteCache.get(typeId);
  if (!entry) throw new Error(`Block sprite not cached: ${typeId}`);
  return entry[level];
}

export function getGLBlockSprite(typeId: string, level: DamageLevel = DamageLevel.NONE): GLBlockSprite {
  const entry = glSpriteCache.get(typeId);
  if (!entry) throw new Error(`GL block sprite not cached: ${typeId}`);
  return entry[level];
}
