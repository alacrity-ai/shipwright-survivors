// src/rendering/unified/utils/createGradientRampAtlas.ts

export function createGradientRampAtlas(
  gl: WebGL2RenderingContext,
  ramps: Array<Array<[number, number, number]>>, // each ramp: array of RGB stops 0–1
  width = 256
): WebGLTexture {
  const height = ramps.length;
  const data = new Uint8Array(width * height * 3);

  for (let y = 0; y < height; y++) {
    const colors = ramps[y];
    for (let x = 0; x < width; x++) {
      const t = x / (width - 1);

      // Interpolate between stops (assume 3 stops for simplicity)
      const c0 = colors[0], c1 = colors[1], c2 = colors[2];
      const c = t < 0.5
        ? [
            c0[0] + (c1[0] - c0[0]) * (t / 0.5),
            c0[1] + (c1[1] - c0[1]) * (t / 0.5),
            c0[2] + (c1[2] - c0[2]) * (t / 0.5),
          ]
        : [
            c1[0] + (c2[0] - c1[0]) * ((t - 0.5) / 0.5),
            c1[1] + (c2[1] - c1[1]) * ((t - 0.5) / 0.5),
            c1[2] + (c2[2] - c1[2]) * ((t - 0.5) / 0.5),
          ];

      const idx = (y * width + x) * 3;
      data[idx] = Math.floor(c[0] * 255);
      data[idx + 1] = Math.floor(c[1] * 255);
      data[idx + 2] = Math.floor(c[2] * 255);
    }
  }

  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height, 0, gl.RGB, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return tex;
}

export const FIRE_GRADIENT_RAMPS: Array<Array<[number, number, number]>> = [
  [ [0, 0, 0], [1, 0.4, 0], [1, 1, 0.8] ],   // Classic flame (black → orange → white)
  [ [0, 0.1, 0], [0, 1, 0.5], [0.8, 1, 1] ], // Poison/acid green
  [ [0, 0, 0.2], [0.2, 0.6, 1], [1, 1, 1] ], // Plasma/blue flame
  [ [0, 0, 0], [1, 0, 1], [1, 1, 1] ],       // Magenta/magic fire
];

export function createFireGradientAtlas(
  gl: WebGL2RenderingContext,
  width = 256
): { texture: WebGLTexture; count: number } {
  const tex = createGradientRampAtlas(gl, FIRE_GRADIENT_RAMPS, width);
  return { texture: tex, count: FIRE_GRADIENT_RAMPS.length };
}

/* Examples
const ramps = [
  [ [0, 0, 0], [1, 0.4, 0], [1, 1, 0.8] ],   // Classic flame (black → orange → white)
  [ [0, 0.1, 0], [0, 1, 0.5], [0.8, 1, 1] ], // Poison/acid
  [ [0, 0, 0.2], [0.2, 0.6, 1], [1, 1, 1] ], // Plasma/blue fire
  [ [0, 0, 0], [1, 0, 1], [1, 1, 1] ],       // Magenta magic
];
const fireRampTex = createGradientRampAtlas(gl, ramps);
*/