// src/ui/primitives/UIShipTile.ts 
 
import { getUniformScaleFactor } from '@/config/view'; 
 
export interface UIShipTile { 
  x: number; 
  y: number; 
  size: number; // scaled tile size in pixels 
  sprite: CanvasImageSource; 
  isHovered: boolean; 
  isSelected: boolean; 
  isLocked?: boolean; 
} 
 
/** 
 * Renders a UI ship image tile for ship selection in the Loadout menu 
 */ 
export function drawShipTile( 
  ctx: CanvasRenderingContext2D, 
  tile: UIShipTile, 
  uiScale: number = 1.0 
): void { 
  const { 
    x, y, size, 
    sprite, 
    isHovered, 
    isSelected, 
    isLocked 
  } = tile; 
 
  const innerPadding = 4 * uiScale; 
  const innerSize = size - innerPadding; 
  const cornerRadius = 6 * uiScale;
 
  // Helper function to draw rounded rectangle
  function drawRoundedRect(x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
 
  // === Background with gradient and glow effects ===
  if (isSelected && !isLocked) {
    // Selected: Vibrant blue gradient with outer glow
    const gradient = ctx.createLinearGradient(x, y, x, y + innerSize);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#1d4ed8');
    
    // Outer glow
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur = 12 * uiScale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.fillStyle = gradient;
    drawRoundedRect(x, y, innerSize, innerSize, cornerRadius);
    ctx.fill();
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  } else if (isSelected && isLocked) {
    // Selected but locked: Muted grey gradient
    const gradient = ctx.createLinearGradient(x, y, x, y + innerSize);
    gradient.addColorStop(0, '#6b7280');
    gradient.addColorStop(1, '#4b5563');
    
    ctx.fillStyle = gradient;
    drawRoundedRect(x, y, innerSize, innerSize, cornerRadius);
    ctx.fill();
  } else if (isHovered && !isLocked) {
    // Hovered: Subtle cyan gradient with soft glow
    const gradient = ctx.createLinearGradient(x, y, x, y + innerSize);
    gradient.addColorStop(0, '#0f766e');
    gradient.addColorStop(1, '#134e4a');
    
    // Soft outer glow
    ctx.shadowColor = '#14b8a6';
    ctx.shadowBlur = 8 * uiScale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.fillStyle = gradient;
    drawRoundedRect(x, y, innerSize, innerSize, cornerRadius);
    ctx.fill();
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  } else if (isHovered && isLocked) {
    // Hovered but locked: Slightly lighter grey
    const gradient = ctx.createLinearGradient(x, y, x, y + innerSize);
    gradient.addColorStop(0, '#4b5563');
    gradient.addColorStop(1, '#374151');
    
    ctx.fillStyle = gradient;
    drawRoundedRect(x, y, innerSize, innerSize, cornerRadius);
    ctx.fill();
  } else {
    // Default: Dark gradient
    const gradient = ctx.createLinearGradient(x, y, x, y + innerSize);
    gradient.addColorStop(0, '#374151');
    gradient.addColorStop(1, '#1f2937');
    
    ctx.fillStyle = gradient;
    drawRoundedRect(x, y, innerSize, innerSize, cornerRadius);
    ctx.fill();
  }
 
  // === Inner highlight for depth ===
  if (!isLocked) {
    const highlightGradient = ctx.createLinearGradient(x, y, x, y + innerSize * 0.3);
    highlightGradient.addColorStop(0, isSelected ? 'rgba(147, 197, 253, 0.3)' : 'rgba(255, 255, 255, 0.1)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = highlightGradient;
    drawRoundedRect(x, y, innerSize, innerSize * 0.3, cornerRadius);
    ctx.fill();
  }
 
  // === Sprite with hover/selection effects ===
  // Scale down sprite to fit nicely within margins
  const iconSize = 48 * uiScale * getUniformScaleFactor(); 
  const offsetX = x + (size - iconSize) / 2; 
  const offsetY = y + (size - iconSize) / 2; 
 
  // Add subtle glow to sprite when hovered/selected (only if not locked)
  ctx.save();
  if ((isHovered || isSelected) && !isLocked) {
    ctx.shadowColor = isSelected ? '#3b82f6' : '#14b8a6';
    ctx.shadowBlur = 4 * uiScale;
  }
  
  ctx.drawImage(sprite, offsetX, offsetY, iconSize, iconSize);
  ctx.restore();
 
  // === Lock Overlay === 
  if (isLocked) { 
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; 
    drawRoundedRect(x, y, innerSize, innerSize, cornerRadius);
    ctx.fill();
 
    // Lock icon with better styling
    ctx.fillStyle = '#9ca3af'; 
    ctx.font = `bold ${Math.round(32 * uiScale)}px sans-serif`; 
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'middle'; 
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 2 * uiScale;
    ctx.fillText('❔', x + innerSize / 2, y + innerSize / 2);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  } 
 
  // === Enhanced Border Effects ===
  if (isSelected && !isLocked) {
    // Bright animated-style border
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 3 * uiScale;
    drawRoundedRect(
      x + 1.5 * uiScale, 
      y + 1.5 * uiScale, 
      innerSize - 3 * uiScale, 
      innerSize - 3 * uiScale,
      cornerRadius - 1.5 * uiScale
    );
    ctx.stroke();
    
    // Inner border for extra depth
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 1 * uiScale;
    drawRoundedRect(
      x + 3 * uiScale, 
      y + 3 * uiScale, 
      innerSize - 6 * uiScale, 
      innerSize - 6 * uiScale,
      cornerRadius - 3 * uiScale
    );
    ctx.stroke();
  } else if (isSelected && isLocked) {
    // Muted grey border for locked selected tiles
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2 * uiScale;
    drawRoundedRect(
      x + 1 * uiScale, 
      y + 1 * uiScale, 
      innerSize - 2 * uiScale, 
      innerSize - 2 * uiScale,
      cornerRadius - 1 * uiScale
    );
    ctx.stroke();
  } else if (isHovered && !isLocked) {
    // Subtle hover border
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 2 * uiScale;
    drawRoundedRect(
      x + 1 * uiScale, 
      y + 1 * uiScale, 
      innerSize - 2 * uiScale, 
      innerSize - 2 * uiScale,
      cornerRadius - 1 * uiScale
    );
    ctx.stroke();
  } else if (isHovered && isLocked) {
    // Subtle grey hover border for locked tiles
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1 * uiScale;
    drawRoundedRect(
      x + 1 * uiScale, 
      y + 1 * uiScale, 
      innerSize - 2 * uiScale, 
      innerSize - 2 * uiScale,
      cornerRadius - 1 * uiScale
    );
    ctx.stroke();
  } else {
    // Subtle default border
    ctx.strokeStyle = 'rgba(75, 85, 99, 0.5)';
    ctx.lineWidth = 1 * uiScale;
    drawRoundedRect(x, y, innerSize, innerSize, cornerRadius);
    ctx.stroke();
  }
}