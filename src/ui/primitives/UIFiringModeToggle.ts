// src/ui/primitives/UIFiringModeToggle.ts

import { FiringMode } from '@/systems/combat/types/WeaponTypes';

export interface FiringModeToggleStyle {
  width?: number;
  height?: number;
  backgroundColor?: string;
  borderColor?: string;
  activeColor?: string;
  inactiveColor?: string;
  textColor?: string;
  glowColor?: string;
  font?: string;
  glow?: boolean;
  animated?: boolean;
  scanlineIntensity?: number;
  chromaticAberration?: boolean;
}

export interface FiringModeToggleConfig {
  x: number;
  y: number;
  mode: FiringMode;
  style?: FiringModeToggleStyle;
}

export function drawFiringModeToggle(
  ctx: CanvasRenderingContext2D,
  config: FiringModeToggleConfig,
  timestamp: number = performance.now()
): void {
  const {
    x,
    y,
    mode,
    style = {}
  } = config;

  const {
    width = 120,
    height = 24,
    backgroundColor = '#001122',
    borderColor = '#0066cc',
    activeColor = '#00aaff',
    inactiveColor = '#003366',
    textColor = '#00ccff',
    glowColor = '#00aaff',
    font = '10px "Courier New", monospace',
    glow = true,
    animated = true,
    scanlineIntensity = 0.2,
    chromaticAberration = true
  } = style;

  const isSynced = mode === FiringMode.Synced;
  const cornerRadius = 4;
  const switchWidth = width * 0.45;
  const switchHeight = height - 6;
  const switchY = y + 3;
  
  // Calculate switch position (animated)
  const targetX = isSynced ? x + 3 : x + width - switchWidth - 3;
  const animationSpeed = 0.008;
  const animOffset = animated ? Math.sin(timestamp * animationSpeed) * 0.5 : 0;
  const switchX = targetX + animOffset;

  ctx.save();

  // Outer glow effect
  if (glow) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // Main background track
  ctx.fillStyle = backgroundColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  
  // Draw rounded rectangle background
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, cornerRadius);
  ctx.fill();
  ctx.stroke();

  // Reset shadow for inner elements
  ctx.shadowBlur = 0;

  // Draw mode labels
  ctx.fillStyle = textColor;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // "SYNC" label
  const syncAlpha = isSynced ? 1.0 : 0.4;
  ctx.save();
  ctx.globalAlpha = syncAlpha;
  ctx.fillText('SYNC', x + width * 0.25, y + height * 0.5);
  ctx.restore();
  
  // "SEQ" label  
  const seqAlpha = !isSynced ? 1.0 : 0.4;
  ctx.save();
  ctx.globalAlpha = seqAlpha;
  ctx.fillText('SEQ', x + width * 0.75, y + height * 0.5);
  ctx.restore();

  // Draw the sliding switch indicator
  const switchColor = isSynced ? activeColor : '#ff6600'; // Orange for sequence mode
  
  // Switch glow
  if (glow) {
    ctx.save();
    ctx.shadowColor = switchColor;
    ctx.shadowBlur = 6;
    ctx.fillStyle = switchColor;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.roundRect(switchX - 2, switchY - 2, switchWidth + 4, switchHeight + 4, cornerRadius);
    ctx.fill();
    ctx.restore();
  }

  // Main switch
  ctx.fillStyle = switchColor;
  ctx.strokeStyle = switchColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(switchX, switchY, switchWidth, switchHeight, cornerRadius - 1);
  ctx.fill();

  // Switch highlight
  const gradient = ctx.createLinearGradient(switchX, switchY, switchX, switchY + switchHeight);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(switchX, switchY, switchWidth, switchHeight * 0.6, cornerRadius - 1);
  ctx.fill();

  // Scanlines effect
  if (scanlineIntensity > 0) {
    ctx.save();
    ctx.globalAlpha = scanlineIntensity;
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i < height; i += 3) {
      ctx.beginPath();
      ctx.moveTo(x, y + i);
      ctx.lineTo(x + width, y + i);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Chromatic aberration effect
  if (chromaticAberration && animated) {
    const aberrationOffset = Math.sin(timestamp * 0.003) * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.globalCompositeOperation = 'screen';
    
    // Red channel
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.roundRect(x + aberrationOffset, y, width, height, cornerRadius);
    ctx.fill();
    
    // Blue channel
    ctx.fillStyle = '#0000ff';
    ctx.beginPath();
    ctx.roundRect(x - aberrationOffset, y, width, height, cornerRadius);
    ctx.fill();
    
    ctx.restore();
  }

  // Status indicator dots
  const dotRadius = 2;
  const dotY = y + height + 8;
  
  // Synced mode indicator
  ctx.fillStyle = isSynced ? activeColor : inactiveColor;
  ctx.beginPath();
  ctx.arc(x + width * 0.25, dotY, dotRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Sequence mode indicator
  ctx.fillStyle = !isSynced ? '#ff6600' : inactiveColor;
  ctx.beginPath();
  ctx.arc(x + width * 0.75, dotY, dotRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}