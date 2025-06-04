// src/rendering/cache/asteroidBlockRenderers/facetRockBlockRenderer.ts

import { BLOCK_SIZE } from '@/game/blocks/BlockRegistry';

/**
 * Renders a wedge-shaped rock block with natural rocky appearance.
 * Designed to mesh seamlessly with center rock blocks for asteroid construction.
 */
export function drawFacetRockBlock(ctx: CanvasRenderingContext2D): void {
  const w = BLOCK_SIZE;
  const h = BLOCK_SIZE;

  ctx.save();

  // === Create the wedge shape path ===
  ctx.beginPath();
  ctx.moveTo(0, h); // Bottom-left
  ctx.lineTo(w, h); // Bottom-right
  // More natural curve - slightly irregular
  ctx.quadraticCurveTo(w * 0.55 + (Math.random() - 0.5) * 4, -2, 0, h);
  ctx.closePath();
  
  // Clip to this shape for all subsequent drawing
  ctx.clip();

  // === Base rocky gradient (matching center rock) ===
  const baseGradient = ctx.createRadialGradient(w * 0.4, h * 0.7, 0, w * 0.5, h * 0.6, w * 0.9);
  baseGradient.addColorStop(0, '#4a4a4a');
  baseGradient.addColorStop(0.6, '#383838');
  baseGradient.addColorStop(1, '#2a2a2a');
  
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, w, h);

  // === Add curved surface lighting ===
  // Highlight the curved edge
  const curveGradient = ctx.createLinearGradient(w * 0.2, h * 0.2, w * 0.8, h * 0.8);
  curveGradient.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
  curveGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
  curveGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = curveGradient;
  ctx.fillRect(0, 0, w, h);

  // Shadow the flat bottom edge
  const bottomShadow = ctx.createLinearGradient(0, h * 0.8, 0, h);
  bottomShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomShadow.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
  ctx.fillStyle = bottomShadow;
  ctx.fillRect(0, h * 0.8, w, h * 0.2);

  // === Rocky texture patches ===
  // Darker irregular patches
  ctx.fillStyle = 'rgba(20, 20, 20, 0.25)';
  for (let i = 0; i < 4; i++) {
    const x = Math.random() * w;
    const y = h * 0.3 + Math.random() * h * 0.6; // Keep in lower portion
    const size = 6 + Math.random() * 8;
    
    ctx.beginPath();
    for (let j = 0; j < 6; j++) {
      const angle = (j / 6) * Math.PI * 2;
      const radius = size * (0.7 + Math.random() * 0.6);
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Lighter texture patches
  ctx.fillStyle = 'rgba(70, 70, 70, 0.3)';
  for (let i = 0; i < 3; i++) {
    const x = Math.random() * w;
    const y = h * 0.4 + Math.random() * h * 0.5;
    const size = 4 + Math.random() * 6;
    
    ctx.beginPath();
    for (let j = 0; j < 5; j++) {
      const angle = (j / 5) * Math.PI * 2;
      const radius = size * (0.8 + Math.random() * 0.4);
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  // === Surface details ===
  // Small mineral speckles
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * w;
    const y = h * 0.2 + Math.random() * h * 0.7;
    const r = 0.5 + Math.random() * 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tiny dark pits
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * w;
    const y = h * 0.3 + Math.random() * h * 0.6;
    const r = 0.3 + Math.random() * 0.7;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // === Subtle edge definition (no harsh outlines) ===
  ctx.restore(); // Remove clipping
  
  // Very subtle edge definition
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w, h);
  ctx.stroke();

  ctx.restore();
}

/**
 * Renders an alternative wedge-shaped rock block with a different curved profile.
 * Designed to alternate with the standard facet block for more natural asteroid variation.
 */
export function drawFacetRockAltBlock(ctx: CanvasRenderingContext2D): void {
  const w = BLOCK_SIZE;
  const h = BLOCK_SIZE;

  ctx.save();

  // === Create the alternative wedge shape path ===
  ctx.beginPath();
  ctx.moveTo(0, h); // Bottom-left
  ctx.lineTo(w, h); // Bottom-right
  // Different curve profile - more angular with a slight double curve
  ctx.bezierCurveTo(
    w * 0.8, h * 0.3,  // First control point (right side pull)
    w * 0.2, h * 0.1,  // Second control point (left side pull)
    0, h               // Back to start
  );
  ctx.closePath();
  
  // Clip to this shape for all subsequent drawing
  ctx.clip();

  // === Base rocky gradient (matching other rocks) ===
  const baseGradient = ctx.createRadialGradient(w * 0.3, h * 0.8, 0, w * 0.5, h * 0.6, w * 0.9);
  baseGradient.addColorStop(0, '#4a4a4a');
  baseGradient.addColorStop(0.6, '#383838');
  baseGradient.addColorStop(1, '#2a2a2a');
  
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, w, h);

  // === Add curved surface lighting (adjusted for different curve) ===
  // Highlight the curved edge with different pattern
  const curveGradient = ctx.createLinearGradient(w * 0.1, h * 0.1, w * 0.9, h * 0.6);
  curveGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  curveGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.08)');
  curveGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.02)');
  curveGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = curveGradient;
  ctx.fillRect(0, 0, w, h);

  // Additional highlight for the angular peak area
  const peakGradient = ctx.createRadialGradient(w * 0.7, h * 0.2, 0, w * 0.7, h * 0.2, w * 0.3);
  peakGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  peakGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = peakGradient;
  ctx.fillRect(w * 0.4, 0, w * 0.6, h * 0.4);

  // Shadow the flat bottom edge
  const bottomShadow = ctx.createLinearGradient(0, h * 0.85, 0, h);
  bottomShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomShadow.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
  ctx.fillStyle = bottomShadow;
  ctx.fillRect(0, h * 0.85, w, h * 0.15);

  // === Rocky texture patches (different distribution) ===
  // Darker irregular patches
  ctx.fillStyle = 'rgba(20, 20, 20, 0.28)';
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * w;
    const y = h * 0.25 + Math.random() * h * 0.7; // Slightly higher distribution
    const size = 5 + Math.random() * 9;
    
    ctx.beginPath();
    for (let j = 0; j < 7; j++) { // More complex shapes
      const angle = (j / 7) * Math.PI * 2;
      const radius = size * (0.6 + Math.random() * 0.8);
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Lighter texture patches
  ctx.fillStyle = 'rgba(70, 70, 70, 0.35)';
  for (let i = 0; i < 4; i++) {
    const x = Math.random() * w;
    const y = h * 0.3 + Math.random() * h * 0.6;
    const size = 3 + Math.random() * 7;
    
    ctx.beginPath();
    for (let j = 0; j < 6; j++) {
      const angle = (j / 6) * Math.PI * 2;
      const radius = size * (0.7 + Math.random() * 0.5);
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  // === Surface details (slightly different pattern) ===
  // Small mineral speckles
  ctx.fillStyle = 'rgba(255, 255, 255, 0.065)';
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * w;
    const y = h * 0.15 + Math.random() * h * 0.8;
    const r = 0.4 + Math.random() * 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tiny dark pits
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  for (let i = 0; i < 7; i++) {
    const x = Math.random() * w;
    const y = h * 0.2 + Math.random() * h * 0.7;
    const r = 0.2 + Math.random() * 0.8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Some medium weathering spots
  ctx.fillStyle = 'rgba(45, 45, 45, 0.4)';
  for (let i = 0; i < 3; i++) {
    const x = Math.random() * w;
    const y = h * 0.4 + Math.random() * h * 0.5;
    const r = 2 + Math.random() * 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // === Subtle edge definition (no harsh outlines) ===
  ctx.restore(); // Remove clipping
  
  // Very subtle edge definition
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w, h);
  ctx.stroke();

  ctx.restore();
}

/**
 * Renders a very slim wedge-shaped rock block that creates circular profiles.
 * When placed around a square center, creates a near-perfect circular asteroid.
 */
export function drawFacetRockSlimBlock(ctx: CanvasRenderingContext2D): void {
  const w = BLOCK_SIZE;
  const h = BLOCK_SIZE;

  ctx.save();

  // === Create the slim wedge shape path ===
  // This creates a very shallow arc that approximates a quarter circle
  ctx.beginPath();
  ctx.moveTo(0, h); // Bottom-left
  ctx.lineTo(w, h); // Bottom-right
  // Very shallow arc - creates circular profile when rotated around center
  ctx.arc(w / 2, h, w / 2, 0, Math.PI, true); // Perfect semicircle arc
  ctx.closePath();
  
  // Clip to this shape for all subsequent drawing
  ctx.clip();

  // === Base rocky gradient (matching other rocks) ===
  const baseGradient = ctx.createRadialGradient(w * 0.5, h * 0.9, 0, w * 0.5, h * 0.7, w * 0.7);
  baseGradient.addColorStop(0, '#4a4a4a');
  baseGradient.addColorStop(0.6, '#383838');
  baseGradient.addColorStop(1, '#2a2a2a');
  
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, w, h);

  // === Add curved surface lighting (optimized for slim profile) ===
  // Highlight the curved edge - very subtle since it's a thin slice
  const curveGradient = ctx.createLinearGradient(0, h * 0.3, w, h * 0.7);
  curveGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  curveGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
  curveGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
  ctx.fillStyle = curveGradient;
  ctx.fillRect(0, 0, w, h);

  // Central highlight for the arc peak
  const peakGradient = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.4);
  peakGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  peakGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = peakGradient;
  ctx.fillRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6);

  // Shadow the flat bottom edge
  const bottomShadow = ctx.createLinearGradient(0, h * 0.9, 0, h);
  bottomShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomShadow.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
  ctx.fillStyle = bottomShadow;
  ctx.fillRect(0, h * 0.9, w, h * 0.1);

  // === Rocky texture patches (scaled for slim profile) ===
  // Fewer, smaller patches due to limited space
  ctx.fillStyle = 'rgba(20, 20, 20, 0.25)';
  for (let i = 0; i < 3; i++) {
    const x = w * 0.2 + Math.random() * w * 0.6;
    const y = h * 0.4 + Math.random() * h * 0.5;
    const size = 3 + Math.random() * 5; // Smaller patches
    
    ctx.beginPath();
    for (let j = 0; j < 5; j++) {
      const angle = (j / 5) * Math.PI * 2;
      const radius = size * (0.7 + Math.random() * 0.6);
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Lighter texture patches
  ctx.fillStyle = 'rgba(70, 70, 70, 0.3)';
  for (let i = 0; i < 2; i++) {
    const x = w * 0.3 + Math.random() * w * 0.4;
    const y = h * 0.5 + Math.random() * h * 0.4;
    const size = 2 + Math.random() * 4;
    
    ctx.beginPath();
    for (let j = 0; j < 4; j++) {
      const angle = (j / 4) * Math.PI * 2;
      const radius = size * (0.8 + Math.random() * 0.4);
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  // === Surface details (minimal for slim profile) ===
  // Small mineral speckles - fewer due to space constraints
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  for (let i = 0; i < 6; i++) {
    const x = w * 0.1 + Math.random() * w * 0.8;
    const y = h * 0.3 + Math.random() * h * 0.6;
    const r = 0.3 + Math.random() * 0.8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tiny dark pits
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  for (let i = 0; i < 4; i++) {
    const x = w * 0.2 + Math.random() * w * 0.6;
    const y = h * 0.4 + Math.random() * h * 0.5;
    const r = 0.2 + Math.random() * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // A few medium weathering spots
  ctx.fillStyle = 'rgba(45, 45, 45, 0.35)';
  for (let i = 0; i < 2; i++) {
    const x = w * 0.3 + Math.random() * w * 0.4;
    const y = h * 0.5 + Math.random() * h * 0.4;
    const r = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // === Subtle edge definition ===
  ctx.restore(); // Remove clipping
  
  // Very subtle edge definition on flat edge only
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w, h);
  ctx.stroke();

  ctx.restore();
}