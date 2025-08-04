// ────────────────────────────────────────────────────────────────────────────────
// src/rendering/unified/passes/fx/ShockwavePass.ts
// Instanced quad renderer for radial shockwave distortions
// Projects world-space shockwave centers using CameraMatrices UBO
// ────────────────────────────────────────────────────────────────────────────────

import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import shockwaveVertSrc from '@/rendering/unified/shaders/fx/shockwavePass.vert?raw';
import shockwaveFragSrc from '@/rendering/unified/shaders/fx/shockwavePass.frag?raw';

import type { ShockwaveSOA } from '@/systems/fx/ShockwaveManager';

const MAX_SHOCKWAVES = 64;
const STRIDE = 5; // worldX, worldY, startRadius, size, strength

export class ShockwavePass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;
  private readonly dataBuffer: Float32Array;

  private readonly uSceneTextureLoc: WebGLUniformLocation;

  constructor(gl: WebGL2RenderingContext, cameraUBO: WebGLBuffer) {
    this.gl = gl;
    this.program = createProgramFromSources(gl, shockwaveVertSrc, shockwaveFragSrc);

    this.quadBuffer = createQuadBuffer(gl);
    this.instanceBuffer = gl.createBuffer()!;
    this.vao = gl.createVertexArray()!;
    this.dataBuffer = new Float32Array(MAX_SHOCKWAVES * STRIDE);

    const strideBytes = STRIDE * 4;

    gl.bindVertexArray(this.vao);

    // ── Static quad (fullscreen corners) ──
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0); // aCorner
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0);

    // ── Instance attributes ──
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, MAX_SHOCKWAVES * strideBytes, gl.DYNAMIC_DRAW);

    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, strideBytes, 0);   gl.vertexAttribDivisor(1, 1); // aWorldPos
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, strideBytes, 8);   gl.vertexAttribDivisor(2, 1); // aStartRadius
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, strideBytes, 12);  gl.vertexAttribDivisor(3, 1); // aSize
    gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.FLOAT, false, strideBytes, 16);  gl.vertexAttribDivisor(4, 1); // aStrength

    gl.bindVertexArray(null);

    // ── Bind CameraMatrices UBO ──
    const blockIdx = gl.getUniformBlockIndex(this.program, 'CameraMatrices');
    if (blockIdx !== gl.INVALID_INDEX) {
      gl.uniformBlockBinding(this.program, blockIdx, 0);
    }

    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, cameraUBO);

    this.uSceneTextureLoc = gl.getUniformLocation(this.program, 'uSceneTexture')!;
  }

  /**
   * Renders shockwaves into the provided framebuffer.
   */
  run(
    inputTexture: WebGLTexture,
    outputFramebuffer: WebGLFramebuffer,
    shockwaveSOA: ShockwaveSOA
  ): void {
    if (shockwaveSOA.count === 0) return;
    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, outputFramebuffer);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    this.render(inputTexture, shockwaveSOA);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private render(sceneTexture: WebGLTexture, shockwaveSOA: ShockwaveSOA): void {
    const gl = this.gl;
    const count = Math.min(shockwaveSOA.count, MAX_SHOCKWAVES);
    if (count === 0) return;

    const data = this.dataBuffer;

    for (let i = 0; i < count; i++) {
      const base = i * STRIDE;
      data[base + 0] = shockwaveSOA.x[i]; // worldX
      data[base + 1] = shockwaveSOA.y[i]; // worldY
      data[base + 2] = shockwaveSOA.startRadius[i] + (shockwaveSOA.age[i] / shockwaveSOA.life[i]) * shockwaveSOA.size[i];
      data[base + 3] = shockwaveSOA.size[i];
      data[base + 4] = shockwaveSOA.strength[i];
    }

    gl.useProgram(this.program);

    // Upload instance attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * STRIDE);

    // Bind texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.uniform1i(this.uSceneTextureLoc, 0);

    // Draw instanced quads
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
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
