// src/rendering/cache/blockRenderers/explosiveLanceRenderer.ts

export function renderExplosiveLance(
  baseCtx: CanvasRenderingContext2D,
  overlayCtx: CanvasRenderingContext2D,
  blockSize: number,
  config?: {
    baseGradientColors?: string[];
    barrelGradientStops?: [number, string][];
    barrelWidth?: number;
    barrelLength?: number;
  }
): void {
  const cx = blockSize / 2;
  const cy = blockSize / 2;
  const baseRadius = blockSize * 0.35;

  // === Base Mount (solid anchoring base)
  const baseGradient = baseCtx.createRadialGradient(cx, cy, 0, cx, cy, blockSize / 2);
  (config?.baseGradientColors ?? ['#222', '#444', '#111']).forEach((color, i, arr) =>
    baseGradient.addColorStop(i / (arr.length - 1), color)
  );
  baseCtx.fillStyle = baseGradient;
  baseCtx.fillRect(0, 0, blockSize, blockSize);

  // === Rotating Overlay: Inner Ring
  const rotatingGradient = overlayCtx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius);
  rotatingGradient.addColorStop(0, '#900');
  rotatingGradient.addColorStop(1, '#500');
  overlayCtx.fillStyle = rotatingGradient;
  overlayCtx.beginPath();
  overlayCtx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
  overlayCtx.fill();

  // === Targeting Lines
  overlayCtx.strokeStyle = '#f55';
  overlayCtx.lineWidth = 1;
  overlayCtx.beginPath();
  overlayCtx.moveTo(cx, cy - baseRadius * 0.8);
  overlayCtx.lineTo(cx, cy + baseRadius * 0.8);
  overlayCtx.moveTo(cx - baseRadius * 0.8, cy);
  overlayCtx.lineTo(cx + baseRadius * 0.8, cy);
  overlayCtx.stroke();

  // === Multi-Segment Lance Barrel (unique design)
  const barrelLength = config?.barrelLength ?? blockSize * 0.7;
  const barrelGradientStops = config?.barrelGradientStops ?? [
    [0, '#ffcccb'],
    [0.5, '#ff5555'],
    [1, '#aa0000']
  ];
  drawMultiSegmentLance(overlayCtx, cx, barrelLength, barrelGradientStops);

  // === Energy Charge Indicators
  drawChargeIndicators(overlayCtx, cx, barrelLength, barrelGradientStops);

  // === Explosive Tip
  drawExplosiveTip(overlayCtx, cx, barrelGradientStops);
}

// Helper function to interpolate between two hex colors
function interpolateColor(color1: string, color2: string, factor: number): string {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);
  
  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);
  
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Helper function to brighten a hex color
function brightenColor(color: string, factor: number): string {
  const hex = color.replace('#', '');
  const r = Math.min(255, Math.round(parseInt(hex.substr(0, 2), 16) * (1 + factor)));
  const g = Math.min(255, Math.round(parseInt(hex.substr(2, 2), 16) * (1 + factor)));
  const b = Math.min(255, Math.round(parseInt(hex.substr(4, 2), 16) * (1 + factor)));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
function drawMultiSegmentLance(ctx: CanvasRenderingContext2D, centerX: number, barrelLength: number, barrelGradientStops: [number, string][]) {
  const segments = 4;
  const segmentLength = barrelLength / segments;
  
  // Extract colors from gradient stops for segment coloration
  const baseColor = barrelGradientStops[0]?.[1] || '#cccccc';
  const midColor = barrelGradientStops[1]?.[1] || '#888888';
  const tipColor = barrelGradientStops[2]?.[1] || '#444444';
  
  for (let i = 0; i < segments; i++) {
    const y = i * segmentLength;
    const progress = i / (segments - 1);
    
    // Taper from wide base to narrow tip
    const baseWidth = 8 - (progress * 3); // 8px to 5px
    const topWidth = baseWidth - 1;
    
    // Interpolate between the gradient colors based on progress
    let color: string;
    if (progress <= 0.5) {
      // Interpolate between base and mid color
      color = interpolateColor(baseColor, midColor, progress * 2);
    } else {
      // Interpolate between mid and tip color
      color = interpolateColor(midColor, tipColor, (progress - 0.5) * 2);
    }
    
    ctx.fillStyle = color;
    
    // Draw trapezoid segment
    ctx.beginPath();
    ctx.moveTo(centerX - baseWidth / 2, y);
    ctx.lineTo(centerX + baseWidth / 2, y);
    ctx.lineTo(centerX + topWidth / 2, y + segmentLength);
    ctx.lineTo(centerX - topWidth / 2, y + segmentLength);
    ctx.closePath();
    ctx.fill();
    
    // Add segment separator lines using a slightly brighter version of the tip color
    if (i > 0) {
      ctx.strokeStyle = brightenColor(tipColor, 0.3);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - baseWidth / 2, y);
      ctx.lineTo(centerX + baseWidth / 2, y);
      ctx.stroke();
    }
  }
}

// Draws energy charge indicators along the sides
function drawChargeIndicators(ctx: CanvasRenderingContext2D, centerX: number, barrelLength: number, barrelGradientStops: [number, string][]) {
  // Use the mid-tone color from the barrel gradient for indicators
  const indicatorColor = barrelGradientStops[1]?.[1] || '#ffaa00';
  ctx.fillStyle = indicatorColor;
  const indicatorCount = 6;
  const spacing = barrelLength / (indicatorCount + 1);
  
  for (let i = 0; i < indicatorCount; i++) {
    const y = spacing * (i + 1);
    const size = 2;
    
    // Left side indicator
    ctx.fillRect(centerX - 6, y - size / 2, size, size);
    // Right side indicator
    ctx.fillRect(centerX + 4, y - size / 2, size, size);
  }
}

// Draws the explosive tip with energy core
function drawExplosiveTip(ctx: CanvasRenderingContext2D, centerX: number, barrelGradientStops: [number, string][]) {
  // Use the darkest color from barrel gradient for outer tip
  const tipColor = barrelGradientStops[2]?.[1] || '#ff6600';
  // Use the lightest color for inner core
  const coreColor = barrelGradientStops[0]?.[1] || '#ffff00';
  
  // Outer explosive tip
  ctx.fillStyle = tipColor;
  ctx.beginPath();
  ctx.moveTo(centerX - 3, 0);
  ctx.lineTo(centerX + 3, 0);
  ctx.lineTo(centerX, -4);
  ctx.closePath();
  ctx.fill();
  
  // Inner energy core
  ctx.fillStyle = coreColor;
  ctx.beginPath();
  ctx.arc(centerX, -1, 1.5, 0, Math.PI * 2);
  ctx.fill();
}