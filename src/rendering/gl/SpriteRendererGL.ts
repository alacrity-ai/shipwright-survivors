// src/rendering/gl/SpriteRendererGL.ts

import { Camera } from '@/core/Camera';
import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import {
  createOrthographicMatrix,
  createTranslationMatrix,
  createScaleMatrix,
  multiplyMatrices,
} from '@/rendering/gl/matrixUtils';
import { getUniformScaleFactor } from '@/config/view';

const VERT_SRC = `
  precision mediump float;

  attribute vec2 aPosition;

  uniform mat4 uProjectionMatrix;
  uniform mat4 uViewMatrix;
  uniform vec2 uWorldPosition;  // world-space center position
  uniform vec2 uWorldSize;      // half extents in world units

  varying vec2 vUV;

  void main() {
    vec2 scaled = aPosition * uWorldSize; // convert [-1, 1] to world-size quad
    vec2 world = scaled + uWorldPosition;

    gl_Position = uProjectionMatrix * uViewMatrix * vec4(world, 0.0, 1.0);

    vUV = vec2((aPosition.x + 1.0) / 2.0, 1.0 - (aPosition.y + 1.0) / 2.0);
  }
`;

const FRAG_SRC = `
  precision mediump float;
  uniform sampler2D uTexture;
  uniform float uAlpha;
  varying vec2 vUV;

  void main() {
    vec4 texColor = texture2D(uTexture, vUV);
    gl_FragColor = vec4(texColor.rgb, texColor.a * uAlpha);
  }
`;

export class SpriteRendererGL {
  private static instance: SpriteRendererGL | null = null;

  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;
  private readonly quadBuffer: WebGLBuffer;
  
  private readonly attribs = {
    aPosition: 0,
  };

  private readonly uniforms: {
    uProjectionMatrix: WebGLUniformLocation | null;
    uViewMatrix: WebGLUniformLocation | null;
    uWorldPosition: WebGLUniformLocation | null;
    uWorldSize: WebGLUniformLocation | null;
    uTexture: WebGLUniformLocation | null;
    uAlpha: WebGLUniformLocation | null;
  };

  private constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = createProgramFromSources(gl, VERT_SRC, FRAG_SRC);
    this.quadBuffer = createQuadBuffer(gl);
    
    this.uniforms = {
      uProjectionMatrix: gl.getUniformLocation(this.program, 'uProjectionMatrix'),
      uViewMatrix: gl.getUniformLocation(this.program, 'uViewMatrix'),
      uWorldPosition: gl.getUniformLocation(this.program, 'uWorldPosition'),
      uWorldSize: gl.getUniformLocation(this.program, 'uWorldSize'),
      uTexture: gl.getUniformLocation(this.program, 'uTexture'),
      uAlpha: gl.getUniformLocation(this.program, 'uAlpha'),
    };

  }

  public static getInstance(gl: WebGLRenderingContext): SpriteRendererGL {
    if (!this.instance) {
      this.instance = new SpriteRendererGL(gl);
    }
    return this.instance;
  }

  public static destroyInstance(): void {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
  }

  /**
   * Render a sprite using world coordinates and camera matrices
   * @param texture - WebGL texture to render
   * @param worldX - X position in world coordinates
   * @param worldY - Y position in world coordinates
   * @param width - Width in world units
   * @param height - Height in world units
   * @param alpha - Alpha transparency (0-1)
   */
  public renderTexture(
    texture: WebGLTexture,
    worldX: number,
    worldY: number,
    widthPx: number,
    heightPx: number,
    alpha: number = 1.0
  ): void {
    const gl = this.gl;
    const camera = Camera.getInstance();
    const uiScale = getUniformScaleFactor();

    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);

    gl.enableVertexAttribArray(this.attribs.aPosition);
    gl.vertexAttribPointer(this.attribs.aPosition, 2, gl.FLOAT, false, 0, 0);

    const proj = createOrthographicMatrix(
      -camera.getViewportWidth() / (2 * camera.getZoom()),
      camera.getViewportWidth() / (2 * camera.getZoom()),
      camera.getViewportHeight() / (2 * camera.getZoom()),
      -camera.getViewportHeight() / (2 * camera.getZoom())
    );

    const camPos = camera.getPosition();
    const view = createTranslationMatrix(-camPos.x, -camPos.y);

    // Convert size in pixels to world units
    const pixelToWorld = 1 / uiScale; // ← this is now correct
    const worldWidth = widthPx * pixelToWorld;
    const worldHeight = heightPx * pixelToWorld;

    // Upload uniforms
    gl.uniformMatrix4fv(this.uniforms.uProjectionMatrix, false, proj);
    gl.uniformMatrix4fv(this.uniforms.uViewMatrix, false, view);
    gl.uniform2f(this.uniforms.uWorldPosition, worldX, worldY);
    gl.uniform2f(this.uniforms.uWorldSize, worldWidth, worldHeight); // half extents

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.uniforms.uTexture, 0);
    gl.uniform1f(this.uniforms.uAlpha, alpha);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.disableVertexAttribArray(this.attribs.aPosition);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.disable(gl.BLEND);
    gl.useProgram(null);
  }

  private destroy(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteProgram(this.program);
  }
}