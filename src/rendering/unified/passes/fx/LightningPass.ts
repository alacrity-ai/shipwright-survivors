// ────────────────────────────────────────────────────────────────────────────────
// src/rendering/unified/passes/LightningPass.ts
// Real-time chain-lightning renderer ‒ instanced screen-facing quads per segment
// ────────────────────────────────────────────────────────────────────────────────

import type { Camera } from '@/core/Camera';
import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';

import lightningVertSrc from '@/rendering/unified/shaders/lightningPass.vert?raw';
import lightningFragSrc from '@/rendering/unified/shaders/lightningPass.frag?raw';

/** One **segment** between two subdivision points of a bolt. */
export interface LightningSegment {
  startX: number;
  startY: number;
  endX:   number;
  endY:   number;
  /** Half-width in world units. */
  thickness: number;
  /** Normalised age 0→1 (renderer will fade). */
  age: number;
  /** Premultiplied colour components. */
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Instanced-quad pass mirroring ParticlePass semantics. */
export class LightningPass {
  // —————————————————————————————————— GL handles
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;

  // —————————————————————————————————— CPU-side buffers
  private instanceFloatCapacity = 0;
  private instanceArray = new Float32Array(0);

  // —————————————————————————————————— Constants
  /** start(2) + end(2) + thick(1) + age(1) + color(4) = **10 floats / segment** */
  private static readonly STRIDE_FLOATS = 10;
  private static readonly STRIDE_BYTES  = LightningPass.STRIDE_FLOATS * 4;

  constructor(gl: WebGL2RenderingContext, cameraUBO: WebGLBuffer) {
    this.gl = gl;

    // Compile/link
    this.program = createProgramFromSources(gl, lightningVertSrc, lightningFragSrc);

    // Geometry buffers
    this.quadBuffer     = createQuadBuffer(gl);       // (-1,-1) … (1,1)
    this.instanceBuffer = gl.createBuffer()!;
    this.vao            = gl.createVertexArray()!;

    gl.bindVertexArray(this.vao);

    // ─── Static quad (location = 0) ────────────────────────────────────────────
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0);

    // ─── Per-segment instanced attributes ─────────────────────────────────────
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);

    let offset = 0;
    const stride = LightningPass.STRIDE_BYTES;

    // start.xy  (location = 1)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, offset);         // vec2
    gl.vertexAttribDivisor(1, 1); offset += 8;

    // end.xy    (location = 2)
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(2, 1); offset += 8;

    // thickness (location = 3)
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(3, 1); offset += 4;

    // age       (location = 4)
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 1, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(4, 1); offset += 4;

    // color.rgba (location = 5)
    gl.enableVertexAttribArray(5);
    gl.vertexAttribPointer(5, 4, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(5, 1);

    gl.bindVertexArray(null);

    // ─── Camera UBO binding ───────────────────────────────────────────────────
    const blockIdx = gl.getUniformBlockIndex(this.program, 'CameraMatrices');
    if (blockIdx !== gl.INVALID_INDEX) {
      gl.uniformBlockBinding(this.program, blockIdx, 0);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Public API
  // ════════════════════════════════════════════════════════════════════════════
  render(segments: LightningSegment[], _camera: Camera): void {
    if (!segments.length) return;

    const gl = this.gl;
    const totalFloats = segments.length * LightningPass.STRIDE_FLOATS;

    // Expand CPU buffer if needed
    if (totalFloats > this.instanceFloatCapacity) {
      this.instanceFloatCapacity = Math.max(totalFloats, this.instanceFloatCapacity * 2 || 256);
      this.instanceArray = new Float32Array(this.instanceFloatCapacity);
    }

    // Pack instance data
    let idx = 0;
    for (const s of segments) {
      this.instanceArray[idx++] = s.startX;
      this.instanceArray[idx++] = s.startY;
      this.instanceArray[idx++] = s.endX;
      this.instanceArray[idx++] = s.endY;
      this.instanceArray[idx++] = s.thickness;
      this.instanceArray[idx++] = s.age;
      this.instanceArray[idx++] = s.r;
      this.instanceArray[idx++] = s.g;
      this.instanceArray[idx++] = s.b;
      this.instanceArray[idx++] = s.a;
    }

    // Upload to GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    const byteCount = segments.length * LightningPass.STRIDE_BYTES;

    // Grow underlying GL buffer if required
    const prevSize = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE) as number;
    if (byteCount > prevSize) {
      gl.bufferData(gl.ARRAY_BUFFER, byteCount * 2, gl.DYNAMIC_DRAW);
    }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.instanceArray, 0, totalFloats);

    // Draw
    gl.useProgram(this.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);          // additive lightning glow

    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, segments.length);
    gl.bindVertexArray(null);

    gl.disable(gl.BLEND);
    gl.useProgram(null);
  }

  // ════════════════════════════════════════════════════════════════════════════
  destroy(): void {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteBuffer(this.instanceBuffer);
    gl.deleteVertexArray(this.vao);
  }
}
