// src/rendering/unified/passes/SpritePass.ts

import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import spriteVertSrc from '@/rendering/unified/shaders/spritePass.vert?raw';
import spriteFragSrc from '@/rendering/unified/shaders/spritePass.frag?raw';

import { PIXELS_PER_WORLD_UNIT } from '@/config/view';

export interface SpriteInstance {
  worldX: number;
  worldY: number;
  widthPx: number;
  heightPx: number;
  alpha: number;
  rotation: number;
}

export class SpritePass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;

  private readonly uTexture: WebGLUniformLocation;

  private static readonly INSTANCE_FLOATS = 6;
  private instanceData: Float32Array;
  private instanceCapacity: number;

  constructor(gl: WebGL2RenderingContext, cameraUBO: WebGLBuffer) {
    this.gl = gl;
    this.program = createProgramFromSources(gl, spriteVertSrc, spriteFragSrc);
    this.vao = gl.createVertexArray()!;
    this.quadBuffer = createQuadBuffer(gl);
    this.instanceBuffer = gl.createBuffer()!;

    this.instanceCapacity = 256;
    this.instanceData = new Float32Array(this.instanceCapacity * SpritePass.INSTANCE_FLOATS);

    gl.bindVertexArray(this.vao);

    // === Per-vertex quad (location = 0) ===
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0);

    // === Per-instance attributes ===
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    const stride = SpritePass.INSTANCE_FLOATS * 4;

    // aInstancePos (location = 1)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(1, 1);

    // aInstanceSize (location = 2)
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 8);
    gl.vertexAttribDivisor(2, 1);

    // aInstanceAlpha (location = 3)
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, 16);
    gl.vertexAttribDivisor(3, 1);

    // aInstanceRotation (location = 4)
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 1, gl.FLOAT, false, stride, 20);
    gl.vertexAttribDivisor(4, 1);

    gl.bindVertexArray(null);

    // === Uniform bindings ===
    const cameraBlockIndex = gl.getUniformBlockIndex(this.program, 'CameraMatrices');
    if (cameraBlockIndex !== gl.INVALID_INDEX) {
      gl.uniformBlockBinding(this.program, cameraBlockIndex, 0);
    }

    this.uTexture = gl.getUniformLocation(this.program, 'uTexture')!;
  }

  /**
   * Render a batch of sprites sharing the same texture.
   */
  renderBatch(texture: WebGLTexture, sprites: SpriteInstance[]): void {
    if (sprites.length === 0) return;

    const gl = this.gl;
    
    // Use constant pixel-to-world conversion
    const pixelToWorld = 1.0 / PIXELS_PER_WORLD_UNIT;

    // === Expand instance buffer if needed ===
    if (sprites.length > this.instanceCapacity) {
      while (this.instanceCapacity < sprites.length) {
        this.instanceCapacity *= 2;
      }
      this.instanceData = new Float32Array(this.instanceCapacity * SpritePass.INSTANCE_FLOATS);
    }

    // === Pack instance data ===
    for (let i = 0; i < sprites.length; i++) {
      const sprite = sprites[i];
      const base = i * SpritePass.INSTANCE_FLOATS;

      const worldWidth = sprite.widthPx * pixelToWorld;
      const worldHeight = sprite.heightPx * pixelToWorld;

      this.instanceData[base + 0] = sprite.worldX;
      this.instanceData[base + 1] = sprite.worldY;
      this.instanceData[base + 2] = worldWidth;
      this.instanceData[base + 3] = worldHeight;
      this.instanceData[base + 4] = sprite.alpha;
      this.instanceData[base + 5] = sprite.rotation;
    }

    // === Upload buffer ===
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.subarray(0, sprites.length * SpritePass.INSTANCE_FLOATS), gl.DYNAMIC_DRAW);

    // === Draw ===
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.uTexture, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, sprites.length);

    gl.disable(gl.BLEND);
    gl.bindTexture(gl.TEXTURE_2D, null);
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