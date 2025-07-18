// src/rendering/unified/passes/ParticlePass.ts

import type { Camera } from '@/core/Camera';
import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';

import particleVertSrc from '@/rendering/unified/shaders/particlePass.vert?raw';
import particleFragSrc from '@/rendering/unified/shaders/particlePass.frag?raw';

import type { ParticleSOA } from '@/systems/fx/ParticleManager';

export class ParticlePass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;

  // Fixed-size buffers to avoid runtime allocations
  private static readonly MAX_PARTICLES = 30000;
  private readonly dataBuffer: Float32Array;

  constructor(gl: WebGL2RenderingContext, cameraUBO: WebGLBuffer) {
    this.gl = gl;

    this.program = createProgramFromSources(gl, particleVertSrc, particleFragSrc);
    this.quadBuffer = createQuadBuffer(gl);
    this.instanceBuffer = gl.createBuffer()!;
    this.vao = gl.createVertexArray()!;

    // Pre-allocate fixed-size buffers
    const stride = 7;
    this.dataBuffer = new Float32Array(ParticlePass.MAX_PARTICLES * stride);

    gl.bindVertexArray(this.vao);

    // Static quad geometry (layout(location = 0))
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0);

    // Instance buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    const strideBytes = stride * 4;

    gl.enableVertexAttribArray(1); // aParticlePos
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, strideBytes, 0);
    gl.vertexAttribDivisor(1, 1);

    gl.enableVertexAttribArray(2); // aSize
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, strideBytes, 8);
    gl.vertexAttribDivisor(2, 1);

    gl.enableVertexAttribArray(3); // aLifeRatio
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, strideBytes, 12);
    gl.vertexAttribDivisor(3, 1);

    gl.enableVertexAttribArray(4); // aColor
    gl.vertexAttribPointer(4, 3, gl.FLOAT, false, strideBytes, 16);
    gl.vertexAttribDivisor(4, 1);

    gl.bindVertexArray(null);

    // Pre-allocate GPU buffer at maximum capacity
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, ParticlePass.MAX_PARTICLES * stride * 4, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    const cameraBlockIndex = gl.getUniformBlockIndex(this.program, 'CameraMatrices');
    if (cameraBlockIndex !== gl.INVALID_INDEX) {
      gl.uniformBlockBinding(this.program, cameraBlockIndex, 0);
    }
  }

  // Alternative render method that accepts SOA data directly (if you can modify your particle system)
  renderSOA(particleData: ParticleSOA, _camera: Camera): void {
    const gl = this.gl;
    if (particleData.count === 0) return;

    const stride = 7;
    const data = this.dataBuffer;
    const maxCount = Math.min(particleData.count, ParticlePass.MAX_PARTICLES);

    let count = 0;

    // Direct SOA access - maximum performance
    for (; count < maxCount; count++) {
      const base = count * stride;

      data[base + 0] = particleData.x[count];
      data[base + 1] = particleData.y[count];
      data[base + 2] = particleData.size[count];
      data[base + 3] = particleData.renderAlpha[count];
      data[base + 4] = particleData.r[count];
      data[base + 5] = particleData.g[count];
      data[base + 6] = particleData.b[count];
    }

    if (count === 0) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.dataBuffer, 0, count * stride);

    gl.useProgram(this.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    gl.bindVertexArray(null);

    gl.disable(gl.BLEND);
    gl.useProgram(null);
  }

  getMaxParticleCount(): number {
    return ParticlePass.MAX_PARTICLES;
  }

  destroy(): void {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteBuffer(this.instanceBuffer);
    gl.deleteVertexArray(this.vao);
  }
}
