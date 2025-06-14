// src/systems/galaxymap/helpers/screenToWorldRay.ts

import { createMatrix4, perspective, invert } from '@/systems/galaxymap/webgl/matrixUtils';
import { lookAt } from '@/systems/galaxymap/helpers/lookAt';
import { vec3Create, vec3Normalize } from '@/systems/galaxymap/webgl/vectorUtils';
import type { Vec3 } from '@/systems/galaxymap/webgl/vectorUtils';

interface CameraLike {
  position: Vec3;
  target: Vec3;
}

interface Ray {
  origin: Vec3;
  direction: Vec3;
}

export function screenToWorldRay(
  mouseX: number,
  mouseY: number,
  canvas: HTMLCanvasElement,
  camera: CameraLike
): Ray {
  // Convert to normalized device coordinates
  const x = (2.0 * mouseX) / canvas.width - 1.0;
  const y = 1.0 - (2.0 * mouseY) / canvas.height;

  const aspect = canvas.width / canvas.height;

  const projection = createMatrix4();
  const view = createMatrix4();
  const invProjection = createMatrix4();
  const invView = createMatrix4();

  perspective(projection, Math.PI / 4, aspect, 0.1, 100);
  lookAt(view, camera.position, camera.target, new Float32Array([0, 1, 0]) as Vec3);

  invert(invProjection, projection);
  invert(invView, view);

  const rayClip: [number, number, number, number] = [x, y, -1.0, 1.0];

  const rayEye: [number, number, number, number] = [
    invProjection[0] * rayClip[0] + invProjection[4] * rayClip[1] + invProjection[8] * rayClip[2] + invProjection[12] * rayClip[3],
    invProjection[1] * rayClip[0] + invProjection[5] * rayClip[1] + invProjection[9] * rayClip[2] + invProjection[13] * rayClip[3],
    -1.0,
    0.0
  ];

  const rayWorld: Vec3 = new Float32Array([
    invView[0] * rayEye[0] + invView[4] * rayEye[1] + invView[8] * rayEye[2] + invView[12] * rayEye[3],
    invView[1] * rayEye[0] + invView[5] * rayEye[1] + invView[9] * rayEye[2] + invView[13] * rayEye[3],
    invView[2] * rayEye[0] + invView[6] * rayEye[1] + invView[10] * rayEye[2] + invView[14] * rayEye[3]
  ]) as Vec3;

  const rayDirection = vec3Create();
  rayDirection[0] = rayWorld[0];
  rayDirection[1] = rayWorld[1];
  rayDirection[2] = rayWorld[2];
  vec3Normalize(rayDirection, rayDirection);

  const rayOrigin: Vec3 = new Float32Array([
    camera.position[0],
    camera.position[1],
    camera.position[2]
  ]) as Vec3;

  return { origin: rayOrigin, direction: rayDirection };
}
