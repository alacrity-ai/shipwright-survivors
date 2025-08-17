// src/rendering/unified/passes/SceneBackgroundRenderer.ts

import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { createQuadBuffer2 } from '@/rendering/unified/utils/bufferUtils';
import { createGL2TextureFromCanvas } from '@/rendering/gl/glTextureUtils';

import sceneBackgroundVertSrc from '@/rendering/unified/shaders/scene/sceneBackground.vert?raw';
import sceneBackgroundFragSrc from '@/rendering/unified/shaders/scene/sceneBackground.frag?raw';

export class SceneBackgroundRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;

  private readonly uTexture: WebGLUniformLocation;
  private readonly uAlpha: WebGLUniformLocation;

  private texture: WebGLTexture | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.program = createProgramFromSources(gl, sceneBackgroundVertSrc, sceneBackgroundFragSrc);
    this.quadBuffer = createQuadBuffer2(gl);
    this.vao = gl.createVertexArray()!;

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.uTexture = gl.getUniformLocation(this.program, 'uTexture')!;
    this.uAlpha = gl.getUniformLocation(this.program, 'uAlpha')!;
  }

  async loadImage(fullPath: string): Promise<void> {
    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }

    try {
      const img = new Image();
      img.src = fullPath;
      await img.decode();

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);

      this.texture = createGL2TextureFromCanvas(this.gl, canvas);
    } catch (err) {
      console.warn(`[SceneBackgroundRenderer] Failed to load background image '${fullPath}'`, err);
    }
  }

  render(alpha = 1.0): void {
    if (!this.texture) return;

    const gl = this.gl;

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uTexture, 0);
    gl.uniform1f(this.uAlpha, alpha);

    // Draw one quad, filling the viewport
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

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
