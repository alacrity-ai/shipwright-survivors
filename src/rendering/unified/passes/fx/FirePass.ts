// ────────────────────────────────────────────────────────────────────────────────
// src/rendering/unified/passes/fx/FirePass.ts
// Instanced quad renderer for procedural fire blobs (additive blending)
// Uses SOA data layout for minimal GC and maximum performance
// ────────────────────────────────────────────────────────────────────────────────

import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';

// GLSL shader sources
import fireVertSrc from '@/rendering/unified/shaders/fx/firePass.vert?raw';
import fireFragSrc from '@/rendering/unified/shaders/fx/firePass.frag?raw';

/**
 * Structure-of-Arrays for fire instances.
 * Each "fire blob" is a quad rendered with procedural turbulence + LUT gradient.
 */
export interface FireSOA {
  count: number;
  x: Float32Array;
  y: Float32Array;
  radius: Float32Array;
  age: Float32Array;
  intensity: Float32Array;
  rampIndex: Float32Array;
}

export class FirePass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;
  private readonly dataBuffer: Float32Array;

  // Gradient ramp texture and number of ramps
  private readonly fireRampTex: WebGLTexture;
  private readonly rampCount: number;

  // Uniform locations cached for speed
  private readonly uTimeLoc: WebGLUniformLocation;
  private readonly uColorRampLoc: WebGLUniformLocation;
  private readonly uRampCountLoc: WebGLUniformLocation;

  private static readonly MAX_FIRES = 8192;
  private static readonly STRIDE = 6; // 6 floats per instance (matches shaders)

  constructor(
    gl: WebGL2RenderingContext,
    cameraUBO: WebGLBuffer,
    fireRampTex: WebGLTexture,
    rampCount: number
  ) {
    this.gl = gl;
    this.fireRampTex = fireRampTex;
    this.rampCount = rampCount;

    // Compile shaders
    this.program = createProgramFromSources(gl, fireVertSrc, fireFragSrc);

    // Quad and instance buffers
    this.quadBuffer = createQuadBuffer(gl);
    this.instanceBuffer = gl.createBuffer()!;
    this.vao = gl.createVertexArray()!;
    this.dataBuffer = new Float32Array(FirePass.MAX_FIRES * FirePass.STRIDE);

    // Bind VAO and setup attributes
    gl.bindVertexArray(this.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    const strideBytes = FirePass.STRIDE * 4;

    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, strideBytes, 0);  gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, strideBytes, 8);  gl.vertexAttribDivisor(2, 1);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, strideBytes, 12); gl.vertexAttribDivisor(3, 1);
    gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.FLOAT, false, strideBytes, 16); gl.vertexAttribDivisor(4, 1);
    gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 1, gl.FLOAT, false, strideBytes, 20); gl.vertexAttribDivisor(5, 1);

    gl.bindVertexArray(null);

    // Pre-allocate GPU buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, FirePass.MAX_FIRES * strideBytes, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Bind camera UBO
    const blockIdx = gl.getUniformBlockIndex(this.program, 'CameraMatrices');
    if (blockIdx !== gl.INVALID_INDEX) {
      gl.uniformBlockBinding(this.program, blockIdx, 0);
    }

    // Cache uniform locations
    this.uTimeLoc = gl.getUniformLocation(this.program, 'uTime')!;
    this.uColorRampLoc = gl.getUniformLocation(this.program, 'uColorRamp')!;
    this.uRampCountLoc = gl.getUniformLocation(this.program, 'uRampCount')!;
  }

  /**
   * Render all fire blobs in one instanced call.
   * @param fireData SOA containing all active fire instances.
   * @param time Global or frame time for turbulence/flicker.
   */
  renderSOA(fireData: FireSOA, time: number): void {
    const gl = this.gl;
    const count = Math.min(fireData.count, FirePass.MAX_FIRES);
    if (count === 0) return;

    const stride = FirePass.STRIDE;
    const data = this.dataBuffer;

    for (let i = 0; i < count; i++) {
      const base = i * stride;
      data[base + 0] = fireData.x[i];
      data[base + 1] = fireData.y[i];
      data[base + 2] = fireData.radius[i];
      data[base + 3] = fireData.age[i];
      data[base + 4] = fireData.intensity[i];
      data[base + 5] = fireData.rampIndex[i];
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * stride);

    gl.useProgram(this.program);

    // Set uniforms and bind ramp texture
    gl.uniform1f(this.uTimeLoc, time);
    gl.uniform1f(this.uRampCountLoc, this.rampCount);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fireRampTex);
    gl.uniform1i(this.uColorRampLoc, 0);

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
