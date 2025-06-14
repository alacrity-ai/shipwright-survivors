// src/systems/galaxymap/helpers/raySphereIntersect.ts

import { vec3Create, vec3Subtract } from '@/systems/galaxymap/webgl/vectorUtils';
import type { Vec3 } from '@/systems/galaxymap/webgl/vectorUtils';

export function raySphereIntersect(
  rayOrigin: Vec3,
  rayDirection: Vec3,
  sphereCenter: Vec3,
  sphereRadius: number
): boolean {
  const oc = vec3Create();
  vec3Subtract(oc, rayOrigin, sphereCenter);

  const a =
    rayDirection[0] * rayDirection[0] +
    rayDirection[1] * rayDirection[1] +
    rayDirection[2] * rayDirection[2];

  const b =
    2.0 *
    (oc[0] * rayDirection[0] +
     oc[1] * rayDirection[1] +
     oc[2] * rayDirection[2]);

  const c =
    oc[0] * oc[0] +
    oc[1] * oc[1] +
    oc[2] * oc[2] -
    sphereRadius * sphereRadius;

  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return false;
  }

  const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
  const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);

  return t1 > 0 || t2 > 0;
}
