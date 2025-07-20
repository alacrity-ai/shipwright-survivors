// src/rendering/unified/passes/fx/DamageTextPass.ts
import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';

import damageTextVertSrc from '@/rendering/unified/shaders/fx/damageTextPass.vert?raw';
import damageTextFragSrc from '@/rendering/unified/shaders/fx/damageTextPass.frag?raw';

import type { DamageTextSOA } from '@/systems/damagetext/interfaces/DamageTextSOA';
import type { DigitAtlas } from '@/rendering/cache/DigitAtlas';

export class DamageTextPass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;
  private readonly dataBuffer: Float32Array;

  private readonly digitAtlas: DigitAtlas;

  // Cached uniform locations
  private readonly uCellWidthLoc: WebGLUniformLocation;
  private readonly uCellHeightLoc: WebGLUniformLocation;
  private readonly uDigitAtlasLoc: WebGLUniformLocation;
  private readonly uNeonFreqLoc: WebGLUniformLocation;
  private readonly uNeonAmpLoc: WebGLUniformLocation;

  private static readonly MAX_DIGITS = 10000;

  /**
   * Per-instance attributes (matches vertex shader layout):
   *  location=1 vec2  worldPos
   *  location=2 float scale
   *  location=3 float alpha
   *  location=4 vec3  color (r,g,b)
   *  location=5 float neonPhase
   *  location=6 float glyphIndex
   *  location=7 float neonEnabled
   *
   *  Total = 10 floats per instance.
   */
  private static readonly STRIDE = 10;

  constructor(gl: WebGL2RenderingContext, digitAtlas: DigitAtlas, cameraUBO: WebGLBuffer) {
    this.gl = gl;
    this.digitAtlas = digitAtlas;

    // Compile program
    this.program = createProgramFromSources(gl, damageTextVertSrc, damageTextFragSrc);

    // Create buffers and VAO
    this.quadBuffer = createQuadBuffer(gl);
    this.instanceBuffer = gl.createBuffer()!;
    this.vao = gl.createVertexArray()!;
    this.dataBuffer = new Float32Array(DamageTextPass.MAX_DIGITS * DamageTextPass.STRIDE);

    const strideBytes = DamageTextPass.STRIDE * 4;

    gl.bindVertexArray(this.vao);

    // Static quad geometry
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0);

    // Instance attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);

    // worldPos (vec2)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, strideBytes, 0);
    gl.vertexAttribDivisor(1, 1);

    // scale (float)
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, strideBytes, 8);
    gl.vertexAttribDivisor(2, 1);

    // alpha (float)
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, strideBytes, 12);
    gl.vertexAttribDivisor(3, 1);

    // color (vec3)
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 3, gl.FLOAT, false, strideBytes, 16);
    gl.vertexAttribDivisor(4, 1);

    // neonPhase (float)
    gl.enableVertexAttribArray(5);
    gl.vertexAttribPointer(5, 1, gl.FLOAT, false, strideBytes, 28);
    gl.vertexAttribDivisor(5, 1);

    // glyphIndex (float)
    gl.enableVertexAttribArray(6);
    gl.vertexAttribPointer(6, 1, gl.FLOAT, false, strideBytes, 32);
    gl.vertexAttribDivisor(6, 1);

    // neonEnabled (float)
    gl.enableVertexAttribArray(7);
    gl.vertexAttribPointer(7, 1, gl.FLOAT, false, strideBytes, 36);
    gl.vertexAttribDivisor(7, 1);

    gl.bindVertexArray(null);

    // Pre-allocate GPU buffer for instances
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, DamageTextPass.MAX_DIGITS * strideBytes, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Bind camera matrices (std140 UBO block)
    const blockIdx = gl.getUniformBlockIndex(this.program, 'CameraMatrices');
    if (blockIdx !== gl.INVALID_INDEX) {
      gl.uniformBlockBinding(this.program, blockIdx, 0); // Binding point 0 for all passes
    }

    // Cache other uniform locations
    this.uCellWidthLoc = gl.getUniformLocation(this.program, 'u_cellWidth')!;
    this.uCellHeightLoc = gl.getUniformLocation(this.program, 'u_cellHeight')!;
    this.uDigitAtlasLoc = gl.getUniformLocation(this.program, 'u_digitAtlas')!;
    this.uNeonFreqLoc = gl.getUniformLocation(this.program, 'u_neonFreq')!;
    this.uNeonAmpLoc = gl.getUniformLocation(this.program, 'u_neonAmp')!;
  }

  /**
   * Streams SOA to GPU and renders all digits in one instanced draw call.
   */
  renderSOA(soa: DamageTextSOA): void {
    const gl = this.gl;
    const count = Math.min(soa.count, DamageTextPass.MAX_DIGITS);
    if (count === 0) return;

    const stride = DamageTextPass.STRIDE;
    const data = this.dataBuffer;

    // Copy SOA into packed float buffer
    for (let i = 0; i < count; i++) {
      const base = i * stride;
      data[base + 0] = soa.x[i];
      data[base + 1] = soa.y[i];
      data[base + 2] = soa.scale[i];
      data[base + 3] = soa.alpha[i];
      data[base + 4] = soa.r[i];
      data[base + 5] = soa.g[i];
      data[base + 6] = soa.b[i];
      data[base + 7] = soa.neonPhase[i];
      data[base + 8] = soa.glyphIndex[i];
      data[base + 9] = soa.neonEnabled[i];
    }

    // Upload instance data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray(0, count * stride));

    gl.useProgram(this.program);

    // Set per-pass uniforms
    gl.uniform1f(this.uCellWidthLoc, this.digitAtlas.tileWidth);
    gl.uniform1f(this.uCellHeightLoc, this.digitAtlas.tileHeight);
    gl.uniform1f(this.uNeonFreqLoc, 8.0);
    gl.uniform1f(this.uNeonAmpLoc, 0.4);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.digitAtlas.texture);
    gl.uniform1i(this.uDigitAtlasLoc, 0);

    // Enable alpha blending
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Render all glyphs in one instanced draw call
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
