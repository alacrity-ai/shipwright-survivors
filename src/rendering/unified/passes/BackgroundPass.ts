// src/rendering/unified/passes/BackgroundPass.ts

import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { createQuadBuffer2 } from '@/rendering/unified/utils/bufferUtils';
import { createGL2TextureFromCanvas } from '@/rendering/gl/glTextureUtils';
import { getAssetPath } from '@/shared/assetHelpers';

import backgroundVertSrc from '@/rendering/unified/shaders/backgroundPass.vert?raw';
import backgroundFragSrc from '@/rendering/unified/shaders/backgroundPass.frag?raw';

const TILE_SIZE = 2420;
const PARALLAX_SPEED = 0.1;
const IMAGE_ALPHA = 1.0;

export class BackgroundPass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;

  private readonly uOffset: WebGLUniformLocation;
  private readonly uScale: WebGLUniformLocation;
  private readonly uTexture: WebGLUniformLocation;
  private readonly uAlpha: WebGLUniformLocation;

  private texture: WebGLTexture | null = null;
  private currentImageId: string | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.program = createProgramFromSources(gl, backgroundVertSrc, backgroundFragSrc);
    this.quadBuffer = createQuadBuffer2(gl);
    this.vao = gl.createVertexArray()!;

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.uOffset = gl.getUniformLocation(this.program, 'uOffset')!;
    this.uScale = gl.getUniformLocation(this.program, 'uScale')!;
    this.uTexture = gl.getUniformLocation(this.program, 'uTexture')!;
    this.uAlpha = gl.getUniformLocation(this.program, 'uAlpha')!;
  }

  async loadImage(imageId: string): Promise<void> {
    if (imageId === this.currentImageId) return;
    this.currentImageId = imageId;

    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }

    if (!imageId) {
      // Intentionally cleared
      return;
    }

    try {
      const img = new Image();
      img.src = getAssetPath(`/assets/backgrounds/${imageId}`);
      await img.decode();

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);

      this.texture = createGL2TextureFromCanvas(this.gl, canvas);
    } catch (err) {
      console.warn(`[BackgroundPass] Failed to load background image '${imageId}'`, err);
    }
  }

  render(cameraOffset: { x: number; y: number }): void {
    if (!this.texture) return;

    const gl = this.gl;
    const { width, height } = gl.canvas;

    const parallaxX = cameraOffset.x * PARALLAX_SPEED;
    const parallaxY = cameraOffset.y * PARALLAX_SPEED;

    const tilesX = Math.ceil(width / TILE_SIZE) + 2;
    const tilesY = Math.ceil(height / TILE_SIZE) + 2;

    const startTileX = Math.floor(parallaxX / TILE_SIZE) - 1;
    const startTileY = Math.floor(parallaxY / TILE_SIZE) - 1;

    const scaleX = TILE_SIZE / width;
    const scaleY = TILE_SIZE / height;

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uTexture, 0);
    gl.uniform1f(this.uAlpha, IMAGE_ALPHA);

    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const screenX = (startTileX + x) * TILE_SIZE - parallaxX;
        const screenY = (startTileY + y) * TILE_SIZE - parallaxY;

        const ndcOffsetX = (screenX / width) * 2;
        const ndcOffsetY = -(screenY / height) * 2;

        gl.uniform2f(this.uOffset, ndcOffsetX, ndcOffsetY);
        gl.uniform2f(this.uScale, scaleX, scaleY);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }

    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  destroy(): void {
    const gl = this.gl;
    if (this.texture) {
      gl.deleteTexture(this.texture);
      this.texture = null;
    }
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.program);
  }
}
