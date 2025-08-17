// src/rendering/unified/CameraUBO.ts

import { createOrthographicMatrix, createTranslationMatrix } from '@/rendering/gl/matrixUtils';
import type { Camera } from '@/core/Camera';

export function createCameraUBO(gl: WebGL2RenderingContext): WebGLBuffer {
  const ubo = gl.createBuffer()!;
  gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
  gl.bufferData(gl.UNIFORM_BUFFER, 128, gl.DYNAMIC_DRAW); // 2 mat4 = 2×16×4 = 128 bytes
  return ubo;
}

export function updateCameraUBO(gl: WebGL2RenderingContext, ubo: WebGLBuffer, camera: Camera): void {
  const projection = createOrthographicMatrix(
    -camera.getViewportWidth() / (2 * camera.getZoom()),
     camera.getViewportWidth() / (2 * camera.getZoom()),
     camera.getViewportHeight() / (2 * camera.getZoom()),
    -camera.getViewportHeight() / (2 * camera.getZoom())
  );
  const view = createTranslationMatrix(-camera.getPosition().x, -camera.getPosition().y);

  const data = new Float32Array(32);
  data.set(projection, 0);
  data.set(view, 16);

  gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
  gl.bufferSubData(gl.UNIFORM_BUFFER, 0, data);
}
