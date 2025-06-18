// src/rendering/unified/helpers/hexToRgbaVec4.ts

export function hexToRgbaVec4(hex: string): [number, number, number, number] {
    if (hex.startsWith('#')) hex = hex.slice(1);
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;
    return [r, g, b, a];
  }