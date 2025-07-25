// src/rendering/unified/helpers/hexToRgbaVec4.ts

export function hexToRgbaVec4(hex: string): [number, number, number, number] {
    if (hex.startsWith('#')) hex = hex.slice(1);
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;
    return [r, g, b, a];
  }


export function hexToRgbVec4(hex: string): [number, number, number] {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const bigint = parseInt(clean, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return [r, g, b];
}

// Typical packing (ABGR or RGBA depending on shader expectation)
export function packColorToInt(r: number, g: number, b: number, a: number): number {
  return (
    ((Math.round(a * 255) & 0xff) << 24) |
    ((Math.round(r * 255) & 0xff) << 16) |
    ((Math.round(g * 255) & 0xff) << 8) |
    (Math.round(b * 255) & 0xff)
  );
}
