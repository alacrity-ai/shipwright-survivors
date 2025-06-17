// src/scenes/debriefing/helpers/drawCore.ts

let cachedCanvas: HTMLCanvasElement | null = null;
let cachedCtx: CanvasRenderingContext2D | null = null;

export function drawCore(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number = 1.0
): void {
  if (!cachedCanvas) {
    cachedCanvas = document.createElement('canvas');
    cachedCanvas.width = 64; // Increased for better detail
    cachedCanvas.height = 64;
    cachedCtx = cachedCanvas.getContext('2d')!;
    
    // === Cache sci-fi core visual ===
    cachedCtx.clearRect(0, 0, 64, 64);
    cachedCtx.save();

    const centerX = 32;
    const centerY = 32;
    const radius = 28;

    // Outer ring gradient
    const outerGradient = cachedCtx.createRadialGradient(centerX, centerY, radius * 0.7, centerX, centerY, radius);
    outerGradient.addColorStop(0, '#00ffff');
    outerGradient.addColorStop(0.8, '#0088ff');
    outerGradient.addColorStop(1, '#0044aa');

    // Draw outer ring
    cachedCtx.strokeStyle = outerGradient;
    cachedCtx.lineWidth = 3;
    cachedCtx.shadowColor = '#00ffff';
    cachedCtx.shadowBlur = 8;
    cachedCtx.beginPath();
    cachedCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    cachedCtx.stroke();

    // Inner core gradient
    const coreGradient = cachedCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.6);
    coreGradient.addColorStop(0, '#ffffff');
    coreGradient.addColorStop(0.3, '#00ffff');
    coreGradient.addColorStop(0.7, '#0088ff');
    coreGradient.addColorStop(1, '#003366');

    // Draw inner core
    cachedCtx.fillStyle = coreGradient;
    cachedCtx.shadowBlur = 12;
    cachedCtx.beginPath();
    cachedCtx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
    cachedCtx.fill();

    // Add geometric pattern
    cachedCtx.strokeStyle = '#ffffff';
    cachedCtx.lineWidth = 1.5;
    cachedCtx.shadowBlur = 4;
    
    // Hexagonal pattern
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x1 = centerX + Math.cos(angle) * radius * 0.3;
      const y1 = centerY + Math.sin(angle) * radius * 0.3;
      const x2 = centerX + Math.cos(angle) * radius * 0.5;
      const y2 = centerY + Math.sin(angle) * radius * 0.5;
      
      cachedCtx.beginPath();
      cachedCtx.moveTo(x1, y1);
      cachedCtx.lineTo(x2, y2);
      cachedCtx.stroke();
    }

    // Central energy dot
    const energyGradient = cachedCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 6);
    energyGradient.addColorStop(0, '#ffffff');
    energyGradient.addColorStop(0.5, '#00ffff');
    energyGradient.addColorStop(1, '#0088ff');
    
    cachedCtx.fillStyle = energyGradient;
    cachedCtx.shadowColor = '#ffffff';
    cachedCtx.shadowBlur = 6;
    cachedCtx.beginPath();
    cachedCtx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    cachedCtx.fill();

    // Corner accents
    cachedCtx.strokeStyle = '#00ffff';
    cachedCtx.lineWidth = 2;
    cachedCtx.shadowBlur = 4;
    
    const cornerSize = 8;
    const cornerOffset = 6;
    
    // Top-left corner
    cachedCtx.beginPath();
    cachedCtx.moveTo(cornerOffset, cornerOffset + cornerSize);
    cachedCtx.lineTo(cornerOffset, cornerOffset);
    cachedCtx.lineTo(cornerOffset + cornerSize, cornerOffset);
    cachedCtx.stroke();
    
    // Top-right corner
    cachedCtx.beginPath();
    cachedCtx.moveTo(64 - cornerOffset - cornerSize, cornerOffset);
    cachedCtx.lineTo(64 - cornerOffset, cornerOffset);
    cachedCtx.lineTo(64 - cornerOffset, cornerOffset + cornerSize);
    cachedCtx.stroke();
    
    // Bottom-right corner
    cachedCtx.beginPath();
    cachedCtx.moveTo(64 - cornerOffset, 64 - cornerOffset - cornerSize);
    cachedCtx.lineTo(64 - cornerOffset, 64 - cornerOffset);
    cachedCtx.lineTo(64 - cornerOffset - cornerSize, 64 - cornerOffset);
    cachedCtx.stroke();
    
    // Bottom-left corner
    cachedCtx.beginPath();
    cachedCtx.moveTo(cornerOffset + cornerSize, 64 - cornerOffset);
    cachedCtx.lineTo(cornerOffset, 64 - cornerOffset);
    cachedCtx.lineTo(cornerOffset, 64 - cornerOffset - cornerSize);
    cachedCtx.stroke();

    cachedCtx.restore();
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(cachedCanvas!, x, y, size, size);
  ctx.restore();
}
