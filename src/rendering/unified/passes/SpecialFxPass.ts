// src/rendering/unified/passes/SpecialFxPass.ts

import type { SpecialFxInstance } from '@/rendering/unified/interfaces/SpecialFxInstance';
import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';

import specialFxVertSrc from '@/rendering/unified/shaders/specialFxPass.vert?raw';
import specialFxFragSrc from '@/rendering/unified/shaders/specialFxPass.frag?raw';

export class SpecialFxPass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;

  constructor(gl: WebGL2RenderingContext, cameraUBO: WebGLBuffer) {
    this.gl = gl;

    this.program = createProgramFromSources(gl, specialFxVertSrc, specialFxFragSrc);

    // === Bind Camera UBO to binding point 0 ===
    const cameraUBOIndex = gl.getUniformBlockIndex(this.program, 'CameraUBO');
    if (cameraUBOIndex !== gl.INVALID_INDEX) {
      gl.uniformBlockBinding(this.program, cameraUBOIndex, 0);
    }

    this.quadBuffer = createQuadBuffer(gl);
    this.instanceBuffer = gl.createBuffer()!;
    this.vao = gl.createVertexArray()!;

    gl.bindVertexArray(this.vao);

    // Fullscreen quad (layout = 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0);

    // Per-instance attributes (layout = 1 to 5)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    const stride = 6 * 4;

    gl.enableVertexAttribArray(1); // aWorldPos
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(1, 1);

    gl.enableVertexAttribArray(2); // aRadius
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 8);
    gl.vertexAttribDivisor(2, 1);

    gl.enableVertexAttribArray(3); // aTime
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, 12);
    gl.vertexAttribDivisor(3, 1);

    gl.enableVertexAttribArray(4); // aStrength
    gl.vertexAttribPointer(4, 1, gl.FLOAT, false, stride, 16);
    gl.vertexAttribDivisor(4, 1);

    gl.enableVertexAttribArray(5); // aType
    gl.vertexAttribPointer(5, 1, gl.FLOAT, false, stride, 20);
    gl.vertexAttribDivisor(5, 1);

    gl.bindVertexArray(null);
  }

  /**
   * Applies special FX to inputTexture and writes distorted result to outputFramebuffer.
   */
  run(
    inputTexture: WebGLTexture,
    instances: SpecialFxInstance[],
    outputFramebuffer: WebGLFramebuffer,
    cameraUBO: WebGLBuffer
  ): void {
    if (instances.length === 0) return;

    const gl = this.gl;

    // Bind CameraUBO to binding point 0
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, cameraUBO);

    // Upload per-instance FX data
    const stride = 6;
    const data = new Float32Array(instances.length * stride);
    for (let i = 0; i < instances.length; i++) {
      const fx = instances[i];
      const base = i * stride;
      data[base + 0] = fx.worldX;
      data[base + 1] = fx.worldY;
      data[base + 2] = fx.radius;
      data[base + 3] = fx.time;
      data[base + 4] = fx.strength;
      data[base + 5] = fx.type;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

    // Prepare framebuffer for distortion output
    gl.bindFramebuffer(gl.FRAMEBUFFER, outputFramebuffer);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Bind scene texture to sampler
    const uSceneLoc = gl.getUniformLocation(this.program, 'uSceneTexture');
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    gl.uniform1i(uSceneLoc, 0);

    // Screen resolution
    const uResolutionLoc = gl.getUniformLocation(this.program, 'uResolution');
    gl.uniform2f(uResolutionLoc, gl.drawingBufferWidth, gl.drawingBufferHeight);

    // Perform instanced fullscreen quad draw for FX overlays
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, instances.length);

    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  destroy(): void {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteBuffer(this.instanceBuffer);
    gl.deleteVertexArray(this.vao);
  }
}
