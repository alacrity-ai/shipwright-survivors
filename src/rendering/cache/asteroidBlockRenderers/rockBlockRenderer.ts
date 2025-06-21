// src/rendering/cache/asteroidBlockRenderers/rockBlockRenderer.ts

import { BLOCK_SIZE } from '@/config/view';

/**
 * Renders a square-shaped rock block with natural rocky appearance.
 * Designed to mesh seamlessly with facet blocks for asteroid construction.
 */
export function drawRockBlock(ctx: CanvasRenderingContext2D): void {
  const w = BLOCK_SIZE;
  const h = BLOCK_SIZE;
  
  ctx.save();

  // === Base rocky gradient (matching facet color scheme) ===
  const baseGradient = ctx.createRadialGradient(w * 0.3, h * 0.3, 0, w * 0.5, h * 0.5, w * 0.8);
  baseGradient.addColorStop(0, '#4a4a4a');
  baseGradient.addColorStop(0.6, '#383838');
  baseGradient.addColorStop(1, '#2a2a2a');
  
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, w, h);

  // === Add rocky texture with irregular patches ===
  // Darker patches for depth
  ctx.fillStyle = 'rgba(20, 20, 20, 0.3)';
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const size = 8 + Math.random() * 12;
    
    ctx.beginPath();
    // Create irregular blob shapes
    for (let j = 0; j < 8; j++) {
      const angle = (j / 8) * Math.PI * 2;
      const radius = size * (0.7 + Math.random() * 0.6);
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Lighter patches for highlights
  ctx.fillStyle = 'rgba(70, 70, 70, 0.4)';
  for (let i = 0; i < 4; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const size = 6 + Math.random() * 10;
    
    ctx.beginPath();
    for (let j = 0; j < 6; j++) {
      const angle = (j / 6) * Math.PI * 2;
      const radius = size * (0.8 + Math.random() * 0.4);
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  // === Subtle edge weathering (instead of hard bevels) ===
  // Top-left subtle highlight
  const edgeGradient = ctx.createLinearGradient(0, 0, w * 0.3, h * 0.3);
  edgeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  edgeGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = edgeGradient;
  ctx.fillRect(0, 0, w * 0.3, h * 0.3);

  // Bottom-right subtle shadow
  const shadowGradient = ctx.createLinearGradient(w * 0.7, h * 0.7, w, h);
  shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
  ctx.fillStyle = shadowGradient;
  ctx.fillRect(w * 0.7, h * 0.7, w * 0.3, h * 0.3);

  // === Fine surface details ===
  // Small mineral speckles
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 0.5 + Math.random() * 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tiny dark pits
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 0.3 + Math.random() * 0.7;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}