// src/rendering/unified/passes/ParticlePass.ts

import type { Particle } from '@/systems/fx/interfaces/Particle';
import type { Camera } from '@/core/Camera';
import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';

import { particleFrameBudgetMs } from '@/config/graphicsConfig';

import particleVertSrc from '@/rendering/unified/shaders/particlePass.vert?raw';
import particleFragSrc from '@/rendering/unified/shaders/particlePass.frag?raw';

// Struct-of-Arrays layout for better cache locality and vectorization
interface ParticleSOA {
  x: Float32Array;
  y: Float32Array;
  size: Float32Array;
  renderAlpha: Float32Array;
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
  count: number;
}

export class ParticlePass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;

  // Fixed-size buffers to avoid runtime allocations
  private static readonly MAX_PARTICLES = 10000;
  private readonly dataBuffer: Float32Array;
  private readonly particleSOA: ParticleSOA;
  
  private frameBudgetMs: number = particleFrameBudgetMs;
  private overflowOccurredThisFrame: boolean = false;

  constructor(gl: WebGL2RenderingContext, cameraUBO: WebGLBuffer) {
    this.gl = gl;

    this.program = createProgramFromSources(gl, particleVertSrc, particleFragSrc);
    this.quadBuffer = createQuadBuffer(gl);
    this.instanceBuffer = gl.createBuffer()!;
    this.vao = gl.createVertexArray()!;

    // Pre-allocate fixed-size buffers
    const stride = 7;
    this.dataBuffer = new Float32Array(ParticlePass.MAX_PARTICLES * stride);
    
    // Initialize SOA structure
    this.particleSOA = {
      x: new Float32Array(ParticlePass.MAX_PARTICLES),
      y: new Float32Array(ParticlePass.MAX_PARTICLES),
      size: new Float32Array(ParticlePass.MAX_PARTICLES),
      renderAlpha: new Float32Array(ParticlePass.MAX_PARTICLES),
      r: new Float32Array(ParticlePass.MAX_PARTICLES),
      g: new Float32Array(ParticlePass.MAX_PARTICLES),
      b: new Float32Array(ParticlePass.MAX_PARTICLES),
      count: 0
    };

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

  setFrameBudget(ms: number): void {
    this.frameBudgetMs = ms;
  }

  // Convert Array-of-Structs to Struct-of-Arrays for better performance
  private convertToSOA(particles: Particle[]): void {
    const maxCount = Math.min(particles.length, ParticlePass.MAX_PARTICLES);
    
    for (let i = 0; i < maxCount; i++) {
      const p = particles[i];
      this.particleSOA.x[i] = p.x;
      this.particleSOA.y[i] = p.y;
      this.particleSOA.size[i] = p.size;
      this.particleSOA.renderAlpha[i] = p.renderAlpha ?? 1.0;
      this.particleSOA.r[i] = p.r;
      this.particleSOA.g[i] = p.g;
      this.particleSOA.b[i] = p.b;
    }
    
    this.particleSOA.count = maxCount;
    
    if (particles.length > ParticlePass.MAX_PARTICLES) {
      this.overflowOccurredThisFrame = true;
    }
  }

  render(particles: Particle[], _camera: Camera): void {
    const gl = this.gl;
    if (particles.length === 0) return;

    this.overflowOccurredThisFrame = false;

    // Convert to SOA layout once
    this.convertToSOA(particles);

    const stride = 7;
    const data = this.dataBuffer;
    const soa = this.particleSOA;

    const start = performance.now();
    let count = 0;

    // Optimized tight loop with SOA data - better for vectorization
    for (; count < soa.count; count++) {
      const base = count * stride;
      data[base + 0] = soa.x[count];
      data[base + 1] = soa.y[count];
      data[base + 2] = soa.size[count];
      data[base + 3] = soa.renderAlpha[count];
      data[base + 4] = soa.r[count];
      data[base + 5] = soa.g[count];
      data[base + 6] = soa.b[count];

      if (performance.now() - start > this.frameBudgetMs) break;
    }

    if (count === 0) return;

    // No buffer resizing needed - use fixed pre-allocated buffer
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

    // Log overflow in development mode
    if (this.overflowOccurredThisFrame && process.env.NODE_ENV === 'development') {
      console.warn(`ParticlePass: Particle overflow detected! ${particles.length} particles requested, ${ParticlePass.MAX_PARTICLES} max supported.`);
    }
  }

  // Alternative render method that accepts SOA data directly (if you can modify your particle system)
  renderSOA(particleData: ParticleSOA, _camera: Camera): void {
    const gl = this.gl;
    if (particleData.count === 0) return;

    const stride = 7;
    const data = this.dataBuffer;
    const maxCount = Math.min(particleData.count, ParticlePass.MAX_PARTICLES);

    const start = performance.now();
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

      if (performance.now() - start > this.frameBudgetMs) break;
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