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

/**
 * Converts RGBA components (0–255) into a hex string.
 * If alpha is omitted or 255, returns #rrggbb.
 * If alpha < 255, returns #rrggbbaa.
 */
export function rgbaToHex(r: number, g: number, b: number, a: number = 255): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');

  const rHex = toHex(r);
  const gHex = toHex(g);
  const bHex = toHex(b);
  const aHex = toHex(a);

  // Only include alpha if it's not opaque
  return a === 255 ? `#${rHex}${gHex}${bHex}` : `#${rHex}${gHex}${bHex}${aHex}`;
}

export function ensureHexColor(color: string | undefined): string {
  if (!color) return '#ffffff';
  if (color.startsWith('#')) return color;

  try {
    return rgbaStringToHex(color);
  } catch (e) {
    console.warn('[ExplosionSystem] Invalid color format, defaulting to white:', color);
    return '#ffffff';
  }
}


export function rgbaStringToHex(css: string): string {
  const match = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([.\d]+))?\)/i);
  if (!match) throw new Error(`Invalid rgba() color string: ${css}`);

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  const a = match[4] !== undefined ? Math.round(parseFloat(match[4]) * 255) : 255;

  return rgbaToHex(r, g, b, a);
}

export function brightenColor(hex: string, amount: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const num = parseInt(hex.slice(1), 16);
  const r = clamp((num >> 16) + 255 * amount);
  const g = clamp(((num >> 8) & 0x00FF) + 255 * amount);
  const b = clamp((num & 0x0000FF) + 255 * amount);
  return `rgb(${r}, ${g}, ${b})`;
}

export function addAlphaToHex(color: string, alphaHex: string): string {
  // Expand #rgb → #rrggbb
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const [r, g, b] = color.slice(1);
    return `#${r}${r}${g}${g}${b}${b}${alphaHex}`;
  }
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return `${color}${alphaHex}`;
  }
  throw new Error(`Invalid hex color format: ${color}`);
}
