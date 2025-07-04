// src/rendering/unified/passes/ParticlePass.ts

import type { Particle } from '@/systems/fx/interfaces/Particle';
import type { Camera } from '@/core/Camera';
import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';

import { particleFrameBudgetMs } from '@/config/graphicsConfig';

import particleVertSrc from '@/rendering/unified/shaders/particlePass.vert?raw';
import particleFragSrc from '@/rendering/unified/shaders/particlePass.frag?raw';

const colorCache = new Map<string, { r: number; g: number; b: number }>();

function hexToRgb(hex: string) {
  if (colorCache.has(hex)) return colorCache.get(hex)!;

  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const result = {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
  };

  colorCache.set(hex, result);
  return result;
}

export class ParticlePass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;

  private dataBuffer: Float32Array = new Float32Array(70000);
  private frameBudgetMs: number = particleFrameBudgetMs;

  constructor(gl: WebGL2RenderingContext, cameraUBO: WebGLBuffer) {
    this.gl = gl;

    this.program = createProgramFromSources(gl, particleVertSrc, particleFragSrc);
    this.quadBuffer = createQuadBuffer(gl);
    this.instanceBuffer = gl.createBuffer()!;
    this.vao = gl.createVertexArray()!;

    gl.bindVertexArray(this.vao);

    // Static quad geometry (layout(location = 0))
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0);

    // Instance buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    const strideBytes = 7 * 4;

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

    const cameraBlockIndex = gl.getUniformBlockIndex(this.program, 'CameraMatrices');
    if (cameraBlockIndex !== gl.INVALID_INDEX) {
      gl.uniformBlockBinding(this.program, cameraBlockIndex, 0);
    }
  }

  setFrameBudget(ms: number): void {
    this.frameBudgetMs = ms;
  }

  render(particles: Particle[], _camera: Camera): void {
    const gl = this.gl;
    if (particles.length === 0) return;

    const stride = 7;
    const requiredCapacity = particles.length * stride;
    if (requiredCapacity > this.dataBuffer.length) {
      this.dataBuffer = new Float32Array(requiredCapacity * 2);
    }

    const data = this.dataBuffer;

    const start = performance.now();
    let count = 0;

    for (; count < particles.length; count++) {
      const p = particles[count];
      const base = count * stride;
      const color = hexToRgb(p.color);

      data[base + 0] = p.x;
      data[base + 1] = p.y;
      data[base + 2] = p.size;
      data[base + 3] = p.renderAlpha ?? 1.0;
      data[base + 4] = color.r;
      data[base + 5] = color.g;
      data[base + 6] = color.b;

      if (performance.now() - start > this.frameBudgetMs) break;
    }

    if (count === 0) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    const bytesToUpload = count * stride * 4; // 4 bytes per float
    gl.bufferData(gl.ARRAY_BUFFER, bytesToUpload, gl.DYNAMIC_DRAW);
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

  destroy(): void {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteBuffer(this.instanceBuffer);
    gl.deleteVertexArray(this.vao);
  }
}