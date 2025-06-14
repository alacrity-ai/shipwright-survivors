// src/systems/galaxymap/helpers/lookAt.ts

import { identity } from '@/systems/galaxymap/webgl/matrixUtils';
import type { Vec3, Mat4 } from '@/systems/galaxymap/webgl/vectorUtils';

export function lookAt(out: Mat4, eye: Vec3, center: Vec3, up: Vec3): Mat4 {
  const eyex = eye[0], eyey = eye[1], eyez = eye[2];
  const centerx = center[0], centery = center[1], centerz = center[2];
  const upx = up[0], upy = up[1], upz = up[2];

  if (
    Math.abs(eyex - centerx) < 0.000001 &&
    Math.abs(eyey - centery) < 0.000001 &&
    Math.abs(eyez - centerz) < 0.000001
  ) {
    return identity(out);
  }

  let z0 = eyex - centerx;
  let z1 = eyey - centery;
  let z2 = eyez - centerz;

  let len = 1 / Math.hypot(z0, z1, z2);
  z0 *= len;
  z1 *= len;
  z2 *= len;

  let x0 = upy * z2 - upz * z1;
  let x1 = upz * z0 - upx * z2;
  let x2 = upx * z1 - upy * z0;
  len = Math.hypot(x0, x1, x2);
  if (len > 0) {
    len = 1 / len;
    x0 *= len;
    x1 *= len;
    x2 *= len;
  } else {
    x0 = x1 = x2 = 0;
  }

  let y0 = z1 * x2 - z2 * x1;
  let y1 = z2 * x0 - z0 * x2;
  let y2 = z0 * x1 - z1 * x0;
  len = Math.hypot(y0, y1, y2);
  if (len > 0) {
    len = 1 / len;
    y0 *= len;
    y1 *= len;
    y2 *= len;
  } else {
    y0 = y1 = y2 = 0;
  }

  out[0] = x0;
  out[1] = y0;
  out[2] = z0;
  out[3] = 0;

  out[4] = x1;
  out[5] = y1;
  out[6] = z1;
  out[7] = 0;

  out[8] = x2;
  out[9] = y2;
  out[10] = z2;
  out[11] = 0;

  out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
  out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
  out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
  out[15] = 1;

  return out;
}
