// src/rendering/BackgroundRendererGL.ts
import { CanvasManager } from '@/core/CanvasManager';
import { Camera } from '@/core/Camera';
import { getAssetPath } from '@/shared/assetHelpers';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createTextureFromCanvas } from '@/rendering/gl/glTextureUtils';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';

const BACKGROUND_PARALLAX_SPEED = 0.1;
const BACKGROUND_TILE_SIZE = 2420;
const BACKGROUND_IMAGE_ALPHA = 1.0;

const VERT_SHADER_SRC = `
attribute vec2 aPosition;
uniform vec2 uOffset;
uniform vec2 uScale;
varying vec2 vUV;
void main() {
  vec2 pos = aPosition * uScale + uOffset;
  vUV = (aPosition + 1.0) / 2.0;
  gl_Position = vec4(pos, 0.0, 1.0);
}
`;

const FRAG_SHADER_SRC = `
precision mediump float;
uniform sampler2D uTexture;
uniform float uAlpha;
varying vec2 vUV;
void main() {
  vec4 texColor = texture2D(uTexture, vUV);
  gl_FragColor = vec4(texColor.rgb, texColor.a * uAlpha);
}
`;

export class BackgroundRendererGL {
  private readonly gl: WebGLRenderingContext;
  private readonly camera: Camera;
  private program: WebGLProgram | null;
  private quadBuffer: WebGLBuffer | null;

  private uOffset!: WebGLUniformLocation;
  private uScale!: WebGLUniformLocation;
  private uTexture!: WebGLUniformLocation;
  private uAlpha!: WebGLUniformLocation;

  private imageLoadPromise: Promise<void> | null = null;

  private texture: WebGLTexture | null = null;
  private image: HTMLImageElement | null = null;

  constructor(
    canvasManager: CanvasManager,
    camera: Camera,
    private readonly backgroundImageId?: string
  ) {
    const gl = canvasManager.getWebGLContext('backgroundgl');
    this.gl = gl;
    this.camera = camera;
    this.program = createProgramFromSources(gl, VERT_SHADER_SRC, FRAG_SHADER_SRC);
    this.quadBuffer = createQuadBuffer(gl);
    this.initUniformLocations();
  }

  private initUniformLocations(): void {
    if (!this.program) return;
    this.uOffset = this.gl.getUniformLocation(this.program, 'uOffset')!;
    this.uScale = this.gl.getUniformLocation(this.program, 'uScale')!;
    this.uTexture = this.gl.getUniformLocation(this.program, 'uTexture')!;
    this.uAlpha = this.gl.getUniformLocation(this.program, 'uAlpha')!;
  }

  async load(): Promise<void> {
    if (!this.backgroundImageId) return;
    if (this.imageLoadPromise) return this.imageLoadPromise;

    const imageId = this.backgroundImageId; // Narrow and capture for inner scope

    this.imageLoadPromise = new Promise(async (resolve, reject) => {
      try {
        const image = await this.loadImageAsync(imageId);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = image.width;
        tempCanvas.height = image.height;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.drawImage(image, 0, 0);

        if (this.texture) {
          this.gl.deleteTexture(this.texture);
        }

        this.image = image;
        this.texture = createTextureFromCanvas(this.gl, tempCanvas);

        resolve();
      } catch (e) {
        reject(e);
      } finally {
        this.imageLoadPromise = null;
      }
    });

    return this.imageLoadPromise;
  }

  private loadImageAsync(id: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = getAssetPath(`/assets/backgrounds/${id}`);
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  }

  update(): void {
    // No-op if no background defined
  }

  render(): void {
    if (!this.texture || !this.program || !this.quadBuffer) return;

    const gl = this.gl;
    const { width, height } = gl.canvas;

    this.gl.viewport(0, 0, width, height);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);

    const aPosition = gl.getAttribLocation(this.program, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uTexture, 0);
    gl.uniform1f(this.uAlpha, BACKGROUND_IMAGE_ALPHA);

    const offset = this.camera.getOffset();
    const parallaxX = offset.x * BACKGROUND_PARALLAX_SPEED;
    const parallaxY = offset.y * BACKGROUND_PARALLAX_SPEED;

    const tilesX = Math.ceil(width / BACKGROUND_TILE_SIZE) + 2;
    const tilesY = Math.ceil(height / BACKGROUND_TILE_SIZE) + 2;

    const startTileX = Math.floor(parallaxX / BACKGROUND_TILE_SIZE) - 1;
    const startTileY = Math.floor(parallaxY / BACKGROUND_TILE_SIZE) - 1;

    const scaleX = BACKGROUND_TILE_SIZE / width;
    const scaleY = BACKGROUND_TILE_SIZE / height;

    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const screenX = (startTileX + x) * BACKGROUND_TILE_SIZE - parallaxX;
        const screenY = (startTileY + y) * BACKGROUND_TILE_SIZE - parallaxY;

        const ndcOffsetX = (screenX / width) * 2;
        const ndcOffsetY = -(screenY / height) * 2;

        gl.uniform2f(this.uOffset, ndcOffsetX, ndcOffsetY);
        gl.uniform2f(this.uScale, scaleX, scaleY);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }

    gl.disableVertexAttribArray(aPosition);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.useProgram(null);
  }

  public destroy(): void {
    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }

    if (this.quadBuffer) {
      this.gl.deleteBuffer(this.quadBuffer);
      this.quadBuffer = null;
    }

    if (this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }

    // Clear the canvas
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }
}
