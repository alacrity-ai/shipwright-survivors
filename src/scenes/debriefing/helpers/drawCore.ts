// src/scenes/debriefing/helpers/drawCore.ts

let cachedCanvas: HTMLCanvasElement | null = null;

export function getCoreCanvas(): HTMLCanvasElement {
  if (cachedCanvas) return cachedCanvas;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  
  // === Cache sci-fi core visual ===
  ctx.clearRect(0, 0, 64, 64);
  ctx.save();

  const centerX = 32;
  const centerY = 32;
  const radius = 28;

  // Outer ring gradient
  const outerGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.7, centerX, centerY, radius);
  outerGradient.addColorStop(0, '#00ffff');
  outerGradient.addColorStop(0.8, '#0088ff');
  outerGradient.addColorStop(1, '#0044aa');

  // Draw outer ring
  ctx.strokeStyle = outerGradient;
  ctx.lineWidth = 3;
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner core gradient
  const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.6);
  coreGradient.addColorStop(0, '#ffffff');
  coreGradient.addColorStop(0.3, '#00ffff');
  coreGradient.addColorStop(0.7, '#0088ff');
  coreGradient.addColorStop(1, '#003366');

  // Draw inner core
  ctx.fillStyle = coreGradient;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Add geometric pattern
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 4;
  
  // Hexagonal pattern
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const x1 = centerX + Math.cos(angle) * radius * 0.3;
    const y1 = centerY + Math.sin(angle) * radius * 0.3;
    const x2 = centerX + Math.cos(angle) * radius * 0.5;
    const y2 = centerY + Math.sin(angle) * radius * 0.5;
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Central energy dot
  const energyGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 6);
  energyGradient.addColorStop(0, '#ffffff');
  energyGradient.addColorStop(0.5, '#00ffff');
  energyGradient.addColorStop(1, '#0088ff');
  
  ctx.fillStyle = energyGradient;
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
  ctx.fill();

  // Corner accents
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 2;
  ctx.shadowBlur = 4;
  
  const cornerSize = 8;
  const cornerOffset = 6;
  
  // Top-left corner
  ctx.beginPath();
  ctx.moveTo(cornerOffset, cornerOffset + cornerSize);
  ctx.lineTo(cornerOffset, cornerOffset);
  ctx.lineTo(cornerOffset + cornerSize, cornerOffset);
  ctx.stroke();
  
  // Top-right corner
  ctx.beginPath();
  ctx.moveTo(64 - cornerOffset - cornerSize, cornerOffset);
  ctx.lineTo(64 - cornerOffset, cornerOffset);
  ctx.lineTo(64 - cornerOffset, cornerOffset + cornerSize);
  ctx.stroke();
  
  // Bottom-right corner
  ctx.beginPath();
  ctx.moveTo(64 - cornerOffset, 64 - cornerOffset - cornerSize);
  ctx.lineTo(64 - cornerOffset, 64 - cornerOffset);
  ctx.lineTo(64 - cornerOffset - cornerSize, 64 - cornerOffset);
  ctx.stroke();
  
  // Bottom-left corner
  ctx.beginPath();
  ctx.moveTo(cornerOffset + cornerSize, 64 - cornerOffset);
  ctx.lineTo(cornerOffset, 64 - cornerOffset);
  ctx.lineTo(cornerOffset, 64 - cornerOffset - cornerSize);
  ctx.stroke();

  ctx.restore();
  
  cachedCanvas = canvas;
  return canvas;
}

// Legacy function for backward compatibility (if needed elsewhere)
export function drawCore(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number = 1.0
): void {
  const coreCanvas = getCoreCanvas();
  
  if (alpha !== 1.0) ctx.globalAlpha = alpha;
  ctx.drawImage(coreCanvas, x, y, size, size);
  if (alpha !== 1.0) ctx.globalAlpha = 1.0;
}