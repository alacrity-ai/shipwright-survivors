// src/shared/colorUtils.ts

/**
 * Converts a hex color string to a 32-bit packed RGBA value (little-endian: RRGGBBAA).
 * Assumes full alpha (255).
 * Supports shorthand (#rgb) and full (#rrggbb) hex notation.
 */
export function hexToRgba32(hex: string): number {
  let r = 0, g = 0, b = 0;

  if (hex.length === 4) {
    // Shorthand: #rgb → #rrggbb
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else {
    throw new Error(`Invalid hex color format: ${hex}`);
  }

  // Little-endian RGBA: (A << 24) | (B << 16) | (G << 8) | R
  return (255 << 24) | (b << 16) | (g << 8) | r;
}

export function brightenColor(hex: string, amount: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const num = parseInt(hex.slice(1), 16);
  const r = clamp((num >> 16) + 255 * amount);
  const g = clamp(((num >> 8) & 0x00FF) + 255 * amount);
  const b = clamp((num & 0x0000FF) + 255 * amount);
  return `rgb(${r}, ${g}, ${b})`;
}
