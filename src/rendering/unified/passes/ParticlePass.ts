// src/rendering/unified/passes/ParticlePass.ts

import type { Particle } from '@/systems/fx/interfaces/Particle';
import type { Camera } from '@/core/Camera';
import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';

import { particleFrameBudgetMs } from '@/config/graphicsConfig';

import particleVertSrc from '@/rendering/unified/shaders/particlePass.vert?raw';
import particleFragSrc from '@/rendering/unified/shaders/particlePass.frag?raw';

const colorCache = new Map<string, [number, number, number]>();

function hexToRgb(hex: string): [number, number, number] {
  if (colorCache.has(hex)) return colorCache.get(hex)!;

  let clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const result: [number, number, number] = [r, g, b];
  colorCache.set(hex, result);
  return result;
}

export class ParticlePass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;

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
    const stride = 7 * 4;

    gl.enableVertexAttribArray(1); // aParticlePos
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(1, 1);

    gl.enableVertexAttribArray(2); // aSize
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 8);
    gl.vertexAttribDivisor(2, 1);

    gl.enableVertexAttribArray(3); // aLifeRatio
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, 12);
    gl.vertexAttribDivisor(3, 1);

    gl.enableVertexAttribArray(4); // aColor
    gl.vertexAttribPointer(4, 3, gl.FLOAT, false, stride, 16);
    gl.vertexAttribDivisor(4, 1);

    gl.bindVertexArray(null);

    // === Bind camera UBO to binding point 0 ===
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
    const data = new Float32Array(particles.length * stride);

    const start = performance.now();
    let count = 0;

    for (; count < particles.length; count++) {
      const p = particles[count];
      const base = count * stride;
      const [r, g, b] = hexToRgb(p.color);
      data.set([p.x, p.y, p.size, p.renderAlpha ?? 1.0, r, g, b], base);

      if (performance.now() - start > this.frameBudgetMs) break;
    }

    if (count === 0) return;

    const upload = data.subarray(0, count * stride);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, upload, gl.DYNAMIC_DRAW);

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
