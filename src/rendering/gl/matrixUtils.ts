// src/rendering/gl/webgl/matrixUtils.ts

export function createModelMatrix(x: number, y: number, width: number, height: number): Float32Array {
  const t = createTranslationMatrix(x, y);
  const s = createScaleMatrix(width / 2, height / 2);
  return multiplyMatrices(t, s);
}


// Helper function for scaling (since you don't have createScaleMatrix)
export function createScaleMatrix(sx: number, sy: number): Float32Array {
  return new Float32Array([
    sx, 0, 0, 0,
    0, sy, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
}

export function createProjectionMatrix(
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
  cameraX: number,
  cameraY: number
): Float32Array {
  const halfW = viewportWidth / (2 * zoom);
  const halfH = viewportHeight / (2 * zoom);

  const left = cameraX - halfW;
  const right = cameraX + halfW;
  const bottom = cameraY - halfH;
  const top = cameraY + halfH;

  const sx = 2 / (right - left);
  const sy = -2 / (top - bottom);  // <-- FLIPPED SIGN
  const tx = -(right + left) / (right - left);
  const ty = -(top + bottom) / (top - bottom);

  return new Float32Array([
    sx,  0,  0,
     0, sy,  0,
    tx, ty,  1,
  ]);
}

export function createOrthographicMatrix(left: number, right: number, bottom: number, top: number): Float32Array {
  const width = right - left;
  const height = top - bottom;
  
  return new Float32Array([
    2 / width, 0, 0, 0,
    0, 2 / height, 0, 0,
    0, 0, -1, 0,
    -(right + left) / width, -(top + bottom) / height, 0, 1
  ]);
}

export function createTranslationMatrix(x: number, y: number): Float32Array {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, 0, 1
  ]);
}

export function createRotationMatrix(angle: number): Float32Array {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  return new Float32Array([
    cos, sin, 0, 0,
    -sin, cos, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
}

export function multiplyMatrices(a: Float32Array, b: Float32Array): Float32Array {
  const result = new Float32Array(16);
  
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result[i * 4 + j] = 
        a[i * 4 + 0] * b[0 * 4 + j] +
        a[i * 4 + 1] * b[1 * 4 + j] +
        a[i * 4 + 2] * b[2 * 4 + j] +
        a[i * 4 + 3] * b[3 * 4 + j];
    }
  }
  
  return result;
}
