// src/ui/utils/MiniMapIcons.ts

export type IconType = 
'caution' | 
'greenCross' | 
'skullAndBones' | 
'treasure' |
'purpleVortex' |
'quantumAttractor';

export class MiniMapIcons {
  /**
   * Creates a canvas with the specified icon drawn on it
   */
  static createIcon(iconType: IconType, size: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Enable anti-aliasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    switch (iconType) {
      case 'caution':
        this.drawCautionIcon(ctx, size);
        break;
      case 'greenCross':
        this.drawGreenCrossIcon(ctx, size);
        break;
      case 'skullAndBones':
        this.drawSkullAndBonesIcon(ctx, size);
        break;
      case 'treasure':
        this.drawTreasureIcon(ctx, size);
        break;
      case 'purpleVortex':
        this.drawPurpleVortexIcon(ctx, size);
        break;
      case 'quantumAttractor':
        this.drawQuantumAttractorIcon(ctx, size);
        break;
    }

    return canvas;
  }
  
  private static drawQuantumAttractorIcon(ctx: CanvasRenderingContext2D, size: number): void {
    const center = size / 2;
    const radius = size * 0.4;

    // === Hexagon ===
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(Math.PI / 6); // flat-topped orientation

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = size * 0.12;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();

    // === Central dot (core nucleus) ===
    ctx.beginPath();
    ctx.fillStyle = '#33ffff';
    ctx.arc(center, center, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  private static drawCautionIcon(ctx: CanvasRenderingContext2D, size: number): void {
    const center = size / 2;
    const radius = size * 0.4;
    
    // Draw triangle background with gradient
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
    gradient.addColorStop(0, '#ffff00');
    gradient.addColorStop(1, '#ff8800');
    
    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#cc6600';
    ctx.lineWidth = size * 0.05;
    
    // Draw triangle
    ctx.beginPath();
    ctx.moveTo(center, center - radius);
    ctx.lineTo(center - radius * 0.87, center + radius * 0.5);
    ctx.lineTo(center + radius * 0.87, center + radius * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw exclamation mark
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${size * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', center, center - size * 0.05);
  }
  
  private static drawGreenCrossIcon(ctx: CanvasRenderingContext2D, size: number): void {
    const center = size / 2;
    
    // Draw Cross
    ctx.fillStyle = '#00ff00';
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = size * 0.18;
    ctx.lineCap = 'round';
    
    const crossSize = size * 0.25;
    
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(center, center - crossSize);
    ctx.lineTo(center, center + crossSize);
    ctx.stroke();
    
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(center - crossSize, center);
    ctx.lineTo(center + crossSize, center);
    ctx.stroke();
  }
  
  private static drawSkullAndBonesIcon(ctx: CanvasRenderingContext2D, size: number): void {
    const center = size / 2;
    
    // Draw skull
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = size * 0.03;
    
    const skullWidth = size * 0.4;
    const skullHeight = size * 0.45;
    
    // Skull outline
    ctx.beginPath();
    ctx.ellipse(center, center - size * 0.1, skullWidth, skullHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Eye sockets
    ctx.fillStyle = '#000000';
    const eyeSize = size * 0.08;
    const eyeOffset = size * 0.12;
    
    ctx.beginPath();
    ctx.arc(center - eyeOffset, center - size * 0.15, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(center + eyeOffset, center - size * 0.15, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Nasal cavity
    ctx.beginPath();
    ctx.moveTo(center, center - size * 0.05);
    ctx.lineTo(center - size * 0.04, center + size * 0.05);
    ctx.lineTo(center + size * 0.04, center + size * 0.05);
    ctx.closePath();
    ctx.fill();
    
    // Teeth/jaw
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = size * 0.02;
    const teethY = center + size * 0.1;
    const teethSpacing = size * 0.06;
    
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(center + i * teethSpacing, teethY);
      ctx.lineTo(center + i * teethSpacing, teethY + size * 0.08);
      ctx.stroke();
    }
    
    // Crossed bones behind skull
    ctx.fillStyle = '#dddddd';
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = size * 0.02;
    
    const boneLength = size * 0.7;
    const boneWidth = size * 0.06;
    
    // First bone (diagonal)
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(Math.PI / 4);
    this.drawBone(ctx, boneLength, boneWidth);
    ctx.restore();
    
    // Second bone (other diagonal)
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(-Math.PI / 4);
    this.drawBone(ctx, boneLength, boneWidth);
    ctx.restore();
  }
  
  private static drawBone(ctx: CanvasRenderingContext2D, length: number, width: number): void {
    const endSize = width * 1.5;
    
    // Bone shaft
    ctx.fillRect(-length / 2, -width / 2, length, width);
    ctx.strokeRect(-length / 2, -width / 2, length, width);
    
    // Bone ends
    ctx.beginPath();
    ctx.arc(-length / 2, 0, endSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(length / 2, 0, endSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private static drawPurpleVortexIcon(ctx: CanvasRenderingContext2D, size: number): void {
    const center = size / 2;
    const outerRadius = size * 0.4;
    const innerRadius = size * 0.2;

    ctx.save();
    ctx.translate(center, center);

    // Base purple glow ring
    ctx.beginPath();
    const gradient = ctx.createRadialGradient(0, 0, innerRadius * 0.5, 0, 0, outerRadius);
    gradient.addColorStop(0, '#cc66ff');
    gradient.addColorStop(1, '#6600aa');
    ctx.fillStyle = gradient;
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    // Rotational swirl arcs
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = size * 0.05;
    ctx.lineCap = 'round';

    const swirlCount = 3;
    for (let i = 0; i < swirlCount; i++) {
      const angle = (Math.PI * 2 / swirlCount) * i;
      const arcRadius = innerRadius + (i * (outerRadius - innerRadius)) / swirlCount;

      ctx.beginPath();
      ctx.arc(0, 0, arcRadius, angle, angle + Math.PI * 0.5);
      ctx.stroke();
    }

    // Core white dot
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(0, 0, size * 0.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }


  private static drawTreasureIcon(ctx: CanvasRenderingContext2D, size: number): void {
    const center = size / 2;
    const crateSize = size * 0.5;
    const crateX = center - crateSize / 2;
    const crateY = center - crateSize / 2;

    // // Background glow
    // const glowRadius = size * 0.48;
    // const gradient = ctx.createRadialGradient(center, center, 0, center, center, glowRadius);
    // gradient.addColorStop(0, '#ffdd55');
    // gradient.addColorStop(1, '#ffaa00');

    // ctx.fillStyle = gradient;
    // ctx.beginPath();
    // ctx.arc(center, center, glowRadius, 0, Math.PI * 2);
    // ctx.fill();

    // Crate base
    ctx.fillStyle = '#8b5a2b'; // dark wood
    ctx.strokeStyle = '#5c4033'; // border
    ctx.lineWidth = size * 0.05;

    ctx.fillRect(crateX, crateY, crateSize, crateSize);
    ctx.strokeRect(crateX, crateY, crateSize, crateSize);

    // Crate cross bands
    ctx.strokeStyle = '#d2b48c'; // tan straps
    ctx.lineWidth = size * 0.05;

    // Vertical band
    ctx.beginPath();
    ctx.moveTo(center, crateY);
    ctx.lineTo(center, crateY + crateSize);
    ctx.stroke();

    // Horizontal band
    ctx.beginPath();
    ctx.moveTo(crateX, center);
    ctx.lineTo(crateX + crateSize, center);
    ctx.stroke();
  }
}