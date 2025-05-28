// src/rendering/BlockSpriteCache.ts
import { BLOCK_SIZE, getAllBlockTypes } from '@/game/blocks/BlockRegistry';

export interface BlockSprite {
  base: HTMLCanvasElement;
  overlay?: HTMLCanvasElement; // optional rotating layer (e.g. turret barrel)
}

const spriteCache: Map<string, BlockSprite> = new Map();

function createBlankCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = BLOCK_SIZE;
  canvas.height = BLOCK_SIZE;
  return canvas;
}

function drawProceduralBlock(typeId: string): void {
  const baseCanvas = createBlankCanvas();
  const baseCtx = baseCanvas.getContext('2d')!;

  const overlayCanvas = createBlankCanvas();
  const overlayCtx = overlayCanvas.getContext('2d')!;

  switch (typeId) {
    case 'cockpit':
      baseCtx.fillStyle = '#444';
      baseCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
      baseCtx.fillStyle = '#0ff';
      baseCtx.beginPath();
      baseCtx.arc(BLOCK_SIZE / 2, BLOCK_SIZE / 2, 8, 0, Math.PI * 2);
      baseCtx.fill();
      break;

    case 'hull0':
      const hull0Gradient = baseCtx.createLinearGradient(0, 0, 0, BLOCK_SIZE);
      hull0Gradient.addColorStop(0, '#C0C0C0'); // Bright metallic silver
      hull0Gradient.addColorStop(0.3, '#A0A0A0'); // Medium grey
      hull0Gradient.addColorStop(0.7, '#808080'); // Darker grey
      hull0Gradient.addColorStop(1, '#606060'); // Deep shadow
      baseCtx.fillStyle = hull0Gradient;
      baseCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
      break;

    case 'hull1':
      const hull1Gradient = baseCtx.createLinearGradient(0, 0, 0, BLOCK_SIZE);
      hull1Gradient.addColorStop(0, '#66FF66'); // Bright neon green
      hull1Gradient.addColorStop(0.2, '#4CAF50'); // Vibrant green
      hull1Gradient.addColorStop(0.6, '#388E3C'); // Medium green
      hull1Gradient.addColorStop(1, '#1B5E20'); // Deep forest green
      baseCtx.fillStyle = hull1Gradient;
      baseCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
      break;

    case 'hull2':
      const hull2Gradient = baseCtx.createLinearGradient(0, 0, 0, BLOCK_SIZE);
      hull2Gradient.addColorStop(0, '#64B5F6'); // Bright cyan-blue
      hull2Gradient.addColorStop(0.2, '#2196F3'); // Rich blue
      hull2Gradient.addColorStop(0.6, '#1976D2'); // Medium blue
      hull2Gradient.addColorStop(1, '#0D47A1'); // Deep navy blue
      baseCtx.fillStyle = hull2Gradient;
      baseCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
      break;

    case 'hull3':
      const hull3Gradient = baseCtx.createLinearGradient(0, 0, 0, BLOCK_SIZE);
      hull3Gradient.addColorStop(0, '#E1BEE7'); // Bright metallic purple highlight
      hull3Gradient.addColorStop(0.15, '#BA68C8'); // Vibrant purple
      hull3Gradient.addColorStop(0.4, '#9C27B0'); // Rich purple
      hull3Gradient.addColorStop(0.7, '#7B1FA2'); // Deep purple
      hull3Gradient.addColorStop(1, '#4A148C'); // Dark shadow purple
      baseCtx.fillStyle = hull3Gradient;
      baseCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
      break;

    case 'facetplate0':
      const facet0Gradient = baseCtx.createLinearGradient(0, BLOCK_SIZE / 2, 0, BLOCK_SIZE);
      facet0Gradient.addColorStop(0, '#C0C0C0');
      facet0Gradient.addColorStop(0.3, '#A0A0A0');
      facet0Gradient.addColorStop(0.7, '#808080');
      facet0Gradient.addColorStop(1, '#606060');
      baseCtx.fillStyle = facet0Gradient;

      baseCtx.beginPath();
      baseCtx.moveTo(BLOCK_SIZE / 2, BLOCK_SIZE / 2); // Top of the triangle (middle of block)
      baseCtx.lineTo(0, BLOCK_SIZE);                 // Bottom-left
      baseCtx.lineTo(BLOCK_SIZE, BLOCK_SIZE);        // Bottom-right
      baseCtx.closePath();
      baseCtx.fill();
      break;

    case 'facetplate1':
      const facet1Gradient = baseCtx.createLinearGradient(0, BLOCK_SIZE / 2, 0, BLOCK_SIZE);
      facet1Gradient.addColorStop(0, '#66FF66');
      facet1Gradient.addColorStop(0.2, '#4CAF50');
      facet1Gradient.addColorStop(0.6, '#388E3C');
      facet1Gradient.addColorStop(1, '#1B5E20');
      baseCtx.fillStyle = facet1Gradient;

      baseCtx.beginPath();
      baseCtx.moveTo(BLOCK_SIZE / 2, BLOCK_SIZE / 2); // Top of the triangle (middle of block)
      baseCtx.lineTo(0, BLOCK_SIZE);                 // Bottom-left
      baseCtx.lineTo(BLOCK_SIZE, BLOCK_SIZE);        // Bottom-right
      baseCtx.closePath();
      baseCtx.fill();
      break;

    case 'facetplate2':
      const facet2Gradient = baseCtx.createLinearGradient(0, BLOCK_SIZE / 2, 0, BLOCK_SIZE);
      facet2Gradient.addColorStop(0, '#64B5F6');
      facet2Gradient.addColorStop(0.2, '#2196F3');
      facet2Gradient.addColorStop(0.6, '#1976D2');
      facet2Gradient.addColorStop(1, '#0D47A1');
      baseCtx.fillStyle = facet2Gradient;

      baseCtx.beginPath();
      baseCtx.moveTo(BLOCK_SIZE / 2, BLOCK_SIZE / 2); // Top of the triangle (middle of block)
      baseCtx.lineTo(0, BLOCK_SIZE);                 // Bottom-left
      baseCtx.lineTo(BLOCK_SIZE, BLOCK_SIZE);        // Bottom-right
      baseCtx.closePath();
      baseCtx.fill();
      break;

    case 'facetplate3':
      const facet3Gradient = baseCtx.createLinearGradient(0, BLOCK_SIZE / 2, 0, BLOCK_SIZE);
      facet3Gradient.addColorStop(0, '#E1BEE7');
      facet3Gradient.addColorStop(0.15, '#BA68C8');
      facet3Gradient.addColorStop(0.4, '#9C27B0');
      facet3Gradient.addColorStop(0.7, '#7B1FA2');
      facet3Gradient.addColorStop(1, '#4A148C');
      baseCtx.fillStyle = facet3Gradient;

      baseCtx.beginPath();
      baseCtx.moveTo(BLOCK_SIZE / 2, BLOCK_SIZE / 2); // Top of the triangle (middle of block)
      baseCtx.lineTo(0, BLOCK_SIZE);                 // Bottom-left
      baseCtx.lineTo(BLOCK_SIZE, BLOCK_SIZE);        // Bottom-right
      baseCtx.closePath();
      baseCtx.fill();
      break;

    // Turret 0
    case 'turret0':
      const turretBaseGradient0 = createRadialGradient(baseCtx, BLOCK_SIZE / 2, BLOCK_SIZE / 2, BLOCK_SIZE / 2, ['#777', '#555', '#333']);
      baseCtx.fillStyle = turretBaseGradient0;
      baseCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);

      const centerX0 = BLOCK_SIZE / 2, centerY0 = BLOCK_SIZE / 2, baseRadius0 = BLOCK_SIZE * 0.35;
      const rotatingBaseGradient0 = createRadialGradient(overlayCtx, centerX0, centerY0, baseRadius0, ['#888', '#666', '#444']);
      drawRotatingBase(overlayCtx, centerX0, centerY0, baseRadius0, rotatingBaseGradient0);
      drawDirectionalLines(overlayCtx, centerX0, centerY0, baseRadius0);

      const barrelGradient0 = overlayCtx.createLinearGradient(centerX0 - 6 / 2, 0, centerX0 + 6 / 2, 0);
      barrelGradient0.addColorStop(0, '#444');
      barrelGradient0.addColorStop(0.3, '#f44');
      barrelGradient0.addColorStop(0.7, '#c22');
      barrelGradient0.addColorStop(1, '#822');
      drawBarrel(overlayCtx, centerX0, 6, BLOCK_SIZE * 0.6, barrelGradient0);

      drawEnergyMuzzle(overlayCtx, centerX0);
      break;

    // Turret 1
    case 'turret1':
      const turretBaseGradient1 = createRadialGradient(baseCtx, BLOCK_SIZE / 2, BLOCK_SIZE / 2, BLOCK_SIZE / 2, ['#66BB6A', '#4CAF50', '#2E7D32']);
      baseCtx.fillStyle = turretBaseGradient1;
      baseCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);

      const centerX1 = BLOCK_SIZE / 2, centerY1 = BLOCK_SIZE / 2, baseRadius1 = BLOCK_SIZE * 0.35;
      const rotatingBaseGradient1 = createRadialGradient(overlayCtx, centerX1, centerY1, baseRadius1, ['#81C784', '#4CAF50', '#1B5E20']);
      drawRotatingBase(overlayCtx, centerX1, centerY1, baseRadius1, rotatingBaseGradient1);
      drawDirectionalLines(overlayCtx, centerX1, centerY1, baseRadius1);

      const barrelGradient1 = overlayCtx.createLinearGradient(centerX1 - 7 / 2, 0, centerX1 + 7 / 2, 0);
      barrelGradient1.addColorStop(0, '#1B5E20');
      barrelGradient1.addColorStop(0.2, '#388E3C');
      barrelGradient1.addColorStop(0.5, '#4CAF50');
      barrelGradient1.addColorStop(0.8, '#66BB6A');
      barrelGradient1.addColorStop(1, '#2E7D32');
      drawBarrel(overlayCtx, centerX1, 7, BLOCK_SIZE * 0.65, barrelGradient1);

      drawEnergyMuzzle(overlayCtx, centerX1);
      break;

    // Turret 2
    case 'turret2':
      const turretBaseGradient2 = createRadialGradient(baseCtx, BLOCK_SIZE / 2, BLOCK_SIZE / 2, BLOCK_SIZE / 2, ['#64B5F6', '#2196F3', '#1565C0']);
      baseCtx.fillStyle = turretBaseGradient2;
      baseCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);

      const centerX2 = BLOCK_SIZE / 2, centerY2 = BLOCK_SIZE / 2, baseRadius2 = BLOCK_SIZE * 0.35;
      const rotatingBaseGradient2 = createRadialGradient(overlayCtx, centerX2, centerY2, baseRadius2, ['#90CAF9', '#42A5F5', '#1976D2', '#0D47A1']);
      drawRotatingBase(overlayCtx, centerX2, centerY2, baseRadius2, rotatingBaseGradient2);
      drawDirectionalLines(overlayCtx, centerX2, centerY2, baseRadius2);

      const barrelGradient2 = overlayCtx.createLinearGradient(centerX2 - 8 / 2, 0, centerX2 + 8 / 2, 0);
      barrelGradient2.addColorStop(0, '#0D47A1');
      barrelGradient2.addColorStop(0.15, '#1565C0');
      barrelGradient2.addColorStop(0.4, '#1976D2');
      barrelGradient2.addColorStop(0.6, '#2196F3');
      barrelGradient2.addColorStop(0.85, '#64B5F6');
      barrelGradient2.addColorStop(1, '#1565C0');
      drawBarrel(overlayCtx, centerX2, 8, BLOCK_SIZE * 0.7, barrelGradient2);

      drawEnergyMuzzle(overlayCtx, centerX2);
      break;

    // Turret 3
    case 'turret3':
      const turretBaseGradient3 = createRadialGradient(baseCtx, BLOCK_SIZE / 2, BLOCK_SIZE / 2, BLOCK_SIZE / 2, ['#E1BEE7', '#BA68C8', '#9C27B0', '#7B1FA2', '#4A148C']);
      baseCtx.fillStyle = turretBaseGradient3;
      baseCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);

      const centerX3 = BLOCK_SIZE / 2, centerY3 = BLOCK_SIZE / 2, baseRadius3 = BLOCK_SIZE * 0.35;
      const rotatingBaseGradient3 = createRadialGradient(overlayCtx, centerX3, centerY3, baseRadius3, ['#F3E5F5', '#E1BEE7', '#CE93D8', '#AB47BC', '#8E24AA']);
      drawRotatingBase(overlayCtx, centerX3, centerY3, baseRadius3, rotatingBaseGradient3);
      drawDirectionalLines(overlayCtx, centerX3, centerY3, baseRadius3);

      const barrelGradient3 = overlayCtx.createLinearGradient(centerX3 - 10 / 2, 0, centerX3 + 10 / 2, 0);
      barrelGradient3.addColorStop(0, '#4A148C');
      barrelGradient3.addColorStop(0.1, '#6A1B99');
      barrelGradient3.addColorStop(0.25, '#7B1FA2');
      barrelGradient3.addColorStop(0.4, '#8E24AA');
      barrelGradient3.addColorStop(0.6, '#AB47BC');
      barrelGradient3.addColorStop(0.75, '#CE93D8');
      barrelGradient3.addColorStop(0.9, '#E1BEE7');
      barrelGradient3.addColorStop(1, '#7B1FA2');
      drawBarrel(overlayCtx, centerX3, 10, BLOCK_SIZE * 0.75, barrelGradient3);

      drawEnergyMuzzle(overlayCtx, centerX3);
      break;

    case 'laser0':
      // Main body gradient (gunmetal to near-black)
      const laserBodyGradient = baseCtx.createLinearGradient(0, 0, 0, BLOCK_SIZE);
      laserBodyGradient.addColorStop(0, '#3A3A3A');   // Gunmetal top
      laserBodyGradient.addColorStop(0.3, '#2A2A2A'); // Dark steel
      laserBodyGradient.addColorStop(0.7, '#1A1A1A'); // Almost black
      laserBodyGradient.addColorStop(1, '#101010');   // Deep base
      baseCtx.fillStyle = laserBodyGradient;
      baseCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);

      // Weapon housing (steel blue chassis)
      baseCtx.fillStyle = '#64B5F6'; // Light steel-blue
      baseCtx.fillRect(2, 6, BLOCK_SIZE - 4, BLOCK_SIZE - 8);
      
      // Inner housing shadow (deep cobalt)
      baseCtx.fillStyle = '#1565C0';
      baseCtx.fillRect(3, 7, BLOCK_SIZE - 6, BLOCK_SIZE - 10);

      // Primary barrel (electric cyan core)
      const barrelGradient = baseCtx.createLinearGradient(0, 0, BLOCK_SIZE, 0);
      barrelGradient.addColorStop(0, '#81D4FA');     // Pale cyan
      barrelGradient.addColorStop(0.5, '#0288D1');   // Blue core
      barrelGradient.addColorStop(1, '#81D4FA');
      baseCtx.fillStyle = barrelGradient;
      baseCtx.fillRect(BLOCK_SIZE / 2 - 3, 2, 6, BLOCK_SIZE - 4);

      // Secondary barrel detail (ice blue)
      baseCtx.fillStyle = '#B3E5FC';
      baseCtx.fillRect(BLOCK_SIZE / 2 - 1, 1, 2, BLOCK_SIZE - 2);

      // Charging chamber (glow node near base)
      const glowGradient = baseCtx.createRadialGradient(
        BLOCK_SIZE / 2, BLOCK_SIZE - 6, 0,
        BLOCK_SIZE / 2, BLOCK_SIZE - 6, 4
      );
      glowGradient.addColorStop(0, '#4FC3F7');         // Bright blue
      glowGradient.addColorStop(0.7, '#0288D1');       // Deeper blue
      glowGradient.addColorStop(1, 'rgba(2, 136, 209, 0)'); // Fade to transparent
      baseCtx.fillStyle = glowGradient;
      baseCtx.beginPath();
      baseCtx.arc(BLOCK_SIZE / 2, BLOCK_SIZE - 6, 4, 0, Math.PI * 2);
      baseCtx.fill();

      // Muzzle glow (blue plasma burst)
      const muzzleGlow = baseCtx.createRadialGradient(
        BLOCK_SIZE / 2, 2, 0,
        BLOCK_SIZE / 2, 2, 5
      );
      muzzleGlow.addColorStop(0, '#FFFFFF');         // White core
      muzzleGlow.addColorStop(0.3, '#4FC3F7');       // Electric cyan
      muzzleGlow.addColorStop(0.6, '#0288D1');       // Dense glow
      muzzleGlow.addColorStop(1, 'rgba(2, 136, 209, 0)');
      baseCtx.fillStyle = muzzleGlow;
      baseCtx.beginPath();
      baseCtx.arc(BLOCK_SIZE / 2, 2, 5, 0, Math.PI * 2);
      baseCtx.fill();

      // Bright muzzle core
      baseCtx.fillStyle = '#FFFFFF';
      baseCtx.beginPath();
      baseCtx.arc(BLOCK_SIZE / 2, 2, 1.5, 0, Math.PI * 2);
      baseCtx.fill();

      break;

    case 'reactor0': {
      // === Base reactor chassis: dark alloy casing ===
      const chassisGradient = baseCtx.createLinearGradient(0, 0, 0, BLOCK_SIZE);
      chassisGradient.addColorStop(0, '#2C2C2C');  // Top: dark steel
      chassisGradient.addColorStop(0.5, '#1E1E1E'); // Mid: graphite black
      chassisGradient.addColorStop(1, '#0F0F0F');  // Bottom: deep shadow
      baseCtx.fillStyle = chassisGradient;
      baseCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);

      // === Reactor core ring: glowing fusion rim ===
      const coreRingGradient = baseCtx.createRadialGradient(
        BLOCK_SIZE / 2, BLOCK_SIZE / 2, 4,
        BLOCK_SIZE / 2, BLOCK_SIZE / 2, BLOCK_SIZE / 2
      );
      coreRingGradient.addColorStop(0.0, '#4FC3F7');   // Bright cyan ring
      coreRingGradient.addColorStop(0.4, '#0288D1');   // Mid plasma blue
      coreRingGradient.addColorStop(1.0, '#00000000'); // Fade to transparent
      baseCtx.fillStyle = coreRingGradient;
      baseCtx.beginPath();
      baseCtx.arc(BLOCK_SIZE / 2, BLOCK_SIZE / 2, BLOCK_SIZE / 2, 0, Math.PI * 2);
      baseCtx.fill();

      // === Reactor core: central glow node ===
      const coreGlow = baseCtx.createRadialGradient(
        BLOCK_SIZE / 2, BLOCK_SIZE / 2, 0,
        BLOCK_SIZE / 2, BLOCK_SIZE / 2, 6
      );
      coreGlow.addColorStop(0, '#81D4FA');        // Cyan-white fusion spark
      coreGlow.addColorStop(0.4, '#4FC3F7');      // Cyan
      coreGlow.addColorStop(1, 'rgba(129, 212, 250, 0)'); // Transparent edge
      baseCtx.fillStyle = coreGlow;
      baseCtx.beginPath();
      baseCtx.arc(BLOCK_SIZE / 2, BLOCK_SIZE / 2, 6, 0, Math.PI * 2);
      baseCtx.fill();

      // === Reactor casing bolts / tech lines ===
      baseCtx.strokeStyle = '#64B5F6';
      baseCtx.lineWidth = 1;
      baseCtx.beginPath();
      baseCtx.moveTo(4, 4);
      baseCtx.lineTo(BLOCK_SIZE - 4, 4);
      baseCtx.moveTo(4, BLOCK_SIZE - 4);
      baseCtx.lineTo(BLOCK_SIZE - 4, BLOCK_SIZE - 4);
      baseCtx.moveTo(4, 4);
      baseCtx.lineTo(4, BLOCK_SIZE - 4);
      baseCtx.moveTo(BLOCK_SIZE - 4, 4);
      baseCtx.lineTo(BLOCK_SIZE - 4, BLOCK_SIZE - 4);
      baseCtx.stroke();
      break;
    }

    // Engine 0 (Grey)
    case 'engine0':
      const engine0Gradient = baseCtx.createLinearGradient(0, 0, 0, BLOCK_SIZE);
      engine0Gradient.addColorStop(0, '#C0C0C0'); // Light metallic grey
      engine0Gradient.addColorStop(0.5, '#A0A0A0'); // Medium grey
      engine0Gradient.addColorStop(1, '#808080'); // Darker grey
      baseCtx.fillStyle = engine0Gradient;
      baseCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);

      // Thrust (blue)
      baseCtx.fillStyle = '#09f'; // Blue thrust
      baseCtx.fillRect(6, BLOCK_SIZE - 6, BLOCK_SIZE - 12, 4);
      break;

    // Engine 1 (Green)
    case 'engine1':
      const engine1Gradient = baseCtx.createLinearGradient(0, 0, 0, BLOCK_SIZE);
      engine1Gradient.addColorStop(0, '#66FF66'); // Bright neon green
      engine1Gradient.addColorStop(0.5, '#4CAF50'); // Medium green
      engine1Gradient.addColorStop(1, '#388E3C'); // Dark green
      baseCtx.fillStyle = engine1Gradient;
      baseCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);

      // Thrust (green)
      baseCtx.fillStyle = '#0f0'; // Green thrust
      baseCtx.fillRect(6, BLOCK_SIZE - 6, BLOCK_SIZE - 12, 4);
      break;

    // Engine 2 (Blue)
    case 'engine2':
      const engine2Gradient = baseCtx.createLinearGradient(0, 0, 0, BLOCK_SIZE);
      engine2Gradient.addColorStop(0, '#64B5F6'); // Bright cyan-blue
      engine2Gradient.addColorStop(0.5, '#2196F3'); // Rich blue
      engine2Gradient.addColorStop(1, '#1976D2'); // Dark blue
      baseCtx.fillStyle = engine2Gradient;
      baseCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);

      // Thrust (blue)
      baseCtx.fillStyle = '#00f'; // Blue thrust
      baseCtx.fillRect(6, BLOCK_SIZE - 6, BLOCK_SIZE - 12, 4);
      break;

    // Engine 3 (Purple)
    case 'engine3':
      const engine3Gradient = baseCtx.createLinearGradient(0, 0, 0, BLOCK_SIZE);
      engine3Gradient.addColorStop(0, '#B39DDB'); // Light purple
      engine3Gradient.addColorStop(0.5, '#7B1FA2'); // Rich purple
      engine3Gradient.addColorStop(1, '#4A148C'); // Dark purple
      baseCtx.fillStyle = engine3Gradient;
      baseCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);

      // Thrust (purple)
      baseCtx.fillStyle = '#f0f'; // Purple thrust
      baseCtx.fillRect(6, BLOCK_SIZE - 6, BLOCK_SIZE - 12, 4);
      break;

    case 'fin0':
      const fin0Gradient = baseCtx.createLinearGradient(0, 0, BLOCK_SIZE, BLOCK_SIZE);
      fin0Gradient.addColorStop(0, '#E0E0E0'); // Bright silver highlight
      fin0Gradient.addColorStop(0.3, '#B0B0B0'); // Medium silver
      fin0Gradient.addColorStop(0.7, '#808080'); // Darker grey
      fin0Gradient.addColorStop(1, '#404040'); // Deep shadow
      baseCtx.fillStyle = fin0Gradient;
      baseCtx.beginPath();
      baseCtx.moveTo(0, BLOCK_SIZE);
      baseCtx.lineTo(BLOCK_SIZE, BLOCK_SIZE);
      baseCtx.lineTo(BLOCK_SIZE, 0);
      baseCtx.closePath();
      baseCtx.fill();
      break;

    case 'fin1':
      const fin1Gradient = baseCtx.createLinearGradient(0, 0, BLOCK_SIZE, BLOCK_SIZE);
      fin1Gradient.addColorStop(0, '#81C784'); // Bright mint green
      fin1Gradient.addColorStop(0.2, '#66BB6A'); // Light green
      fin1Gradient.addColorStop(0.5, '#4CAF50'); // Vibrant green
      fin1Gradient.addColorStop(0.8, '#2E7D32'); // Dark green
      fin1Gradient.addColorStop(1, '#1B5E20'); // Deep forest shadow
      baseCtx.fillStyle = fin1Gradient;
      baseCtx.beginPath();
      baseCtx.moveTo(0, BLOCK_SIZE);
      baseCtx.lineTo(BLOCK_SIZE, BLOCK_SIZE);
      baseCtx.lineTo(BLOCK_SIZE, 0);
      baseCtx.closePath();
      baseCtx.fill();
      break;

    case 'fin2':
      const fin2Gradient = baseCtx.createLinearGradient(0, 0, BLOCK_SIZE, BLOCK_SIZE);
      fin2Gradient.addColorStop(0, '#90CAF9'); // Bright sky blue
      fin2Gradient.addColorStop(0.15, '#64B5F6'); // Light blue
      fin2Gradient.addColorStop(0.4, '#42A5F5'); // Medium blue
      fin2Gradient.addColorStop(0.7, '#1E88E5'); // Rich blue
      fin2Gradient.addColorStop(0.9, '#1565C0'); // Deep blue
      fin2Gradient.addColorStop(1, '#0D47A1'); // Navy shadow
      baseCtx.fillStyle = fin2Gradient;
      baseCtx.beginPath();
      baseCtx.moveTo(0, BLOCK_SIZE);
      baseCtx.lineTo(BLOCK_SIZE, BLOCK_SIZE);
      baseCtx.lineTo(BLOCK_SIZE, 0);
      baseCtx.closePath();
      baseCtx.fill();
      break;

    case 'fin3':
      const fin3Gradient = baseCtx.createLinearGradient(0, 0, BLOCK_SIZE, BLOCK_SIZE);
      fin3Gradient.addColorStop(0, '#F3E5F5'); // Bright lavender highlight
      fin3Gradient.addColorStop(0.1, '#E1BEE7'); // Light purple
      fin3Gradient.addColorStop(0.25, '#CE93D8'); // Medium light purple
      fin3Gradient.addColorStop(0.45, '#BA68C8'); // Vibrant purple
      fin3Gradient.addColorStop(0.65, '#AB47BC'); // Rich purple
      fin3Gradient.addColorStop(0.8, '#8E24AA'); // Deep purple
      fin3Gradient.addColorStop(0.95, '#6A1B99'); // Very deep purple
      fin3Gradient.addColorStop(1, '#4A148C'); // Deepest shadow
      baseCtx.fillStyle = fin3Gradient;
      baseCtx.beginPath();
      baseCtx.moveTo(0, BLOCK_SIZE);
      baseCtx.lineTo(BLOCK_SIZE, BLOCK_SIZE);
      baseCtx.lineTo(BLOCK_SIZE, 0);
      baseCtx.closePath();
      baseCtx.fill();
      break;
      }

  const sprite: BlockSprite = {
    base: baseCanvas,
    overlay: typeId.startsWith('turret') ? overlayCanvas : undefined,
  };

  spriteCache.set(typeId, sprite);
}

export function initializeBlockSpriteCache(): void {
  for (const block of getAllBlockTypes()) {
    drawProceduralBlock(block.id);
  }
}

export function getBlockSprite(id: string): BlockSprite {
  const sprite = spriteCache.get(id);
  if (!sprite) throw new Error(`Block sprite not cached: ${id}`);
  return sprite;
}

// Creates a radial gradient for the base and barrel with color stops
function createRadialGradient(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, colors: string[]): CanvasGradient {
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  colors.forEach((color, index) => gradient.addColorStop(index / (colors.length - 1), color));
  return gradient;
}

// Draws a circular base with a radial gradient
function drawRotatingBase(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, gradient: CanvasGradient) {
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
}

// Draws the directional lines of the rotating base
function drawDirectionalLines(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) {
  ctx.strokeStyle = '#AAA';
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Vertical line
  ctx.moveTo(centerX, centerY - radius * 0.8);
  ctx.lineTo(centerX, centerY + radius * 0.8);
  // Horizontal line
  ctx.moveTo(centerX - radius * 0.8, centerY);
  ctx.lineTo(centerX + radius * 0.8, centerY);
  ctx.stroke();
}

// Draws a barrel with gradient
function drawBarrel(ctx: CanvasRenderingContext2D, centerX: number, barrelWidth: number, barrelLength: number, gradient: CanvasGradient) {
  ctx.fillStyle = gradient;
  ctx.fillRect(centerX - barrelWidth / 2, 0, barrelWidth, barrelLength);
}

// Draws an energy muzzle (highlight)
function drawEnergyMuzzle(ctx: CanvasRenderingContext2D, centerX: number) {
  ctx.fillStyle = '#ff6666';
  ctx.fillRect(centerX - 2, 0, 4, 4);
}
