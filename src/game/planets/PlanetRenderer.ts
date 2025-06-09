// src/game/planets/PlanetRenderer.ts

import type { Camera } from '@/core/Camera';
import { getAssetPath } from '@/shared/assetHelpers';
import { drawCRTText } from '@/ui/primitives/CRTText';
import { getUniformScaleFactor } from '@/config/view';

import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createTextureFromCanvasWithAlpha } from '@/rendering/gl/glTextureUtils';

const VERT_SHADER_SRC = `
  attribute vec2 aPosition;
  uniform vec2 uOffset;
  uniform vec2 uScale;
  varying vec2 vUV;

  void main() {
    vec2 pos = aPosition * uScale + uOffset;
    // Flip Y-axis of UVs to correct upside-down rendering
    vUV = vec2((aPosition.x + 1.0) / 2.0, 1.0 - (aPosition.y + 1.0) / 2.0);
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

export class PlanetRenderer {
  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;
  private readonly quadBuffer: WebGLBuffer;

  private uOffset!: WebGLUniformLocation;
  private uScale!: WebGLUniformLocation;
  private uTexture!: WebGLUniformLocation;
  private uAlpha!: WebGLUniformLocation;

  private texture: WebGLTexture | null = null;
  private image: HTMLImageElement | null = null;

  // Render margin as a percentage of screen size (0.1 = 10% margin)
  private readonly renderMargin: number = 0.2;

  constructor(
    gl: WebGLRenderingContext,
    private readonly imagePath: string,
    private readonly scale: number,
    private readonly name: string
  ) {
    this.gl = gl;
    this.program = createProgramFromSources(gl, VERT_SHADER_SRC, FRAG_SHADER_SRC);
    this.quadBuffer = createQuadBuffer(gl);
    this.initUniformLocations();
    this.loadImage();
  }

  private initUniformLocations(): void {
    this.uOffset = this.gl.getUniformLocation(this.program, 'uOffset')!;
    this.uScale = this.gl.getUniformLocation(this.program, 'uScale')!;
    this.uTexture = this.gl.getUniformLocation(this.program, 'uTexture')!;
    this.uAlpha = this.gl.getUniformLocation(this.program, 'uAlpha')!;
  }

  private loadImage(): void {
    const img = new Image();
    img.src = getAssetPath(this.imagePath);
    img.onload = () => {
      this.image = img;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const ctx = tempCanvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      this.texture = createTextureFromCanvasWithAlpha(this.gl, tempCanvas);
    };
  }

  private isVisible(
    worldX: number,
    worldY: number,
    camera: Camera,
    drawWidthWorld: number,
    drawHeightWorld: number
  ): boolean {
    const camPos = camera.getPosition();
    const zoom = camera.getZoom();
    
    // Calculate planet bounds in world space
    const planetLeft = worldX - drawWidthWorld / 2;
    const planetRight = worldX + drawWidthWorld / 2;
    const planetTop = worldY - drawHeightWorld / 2;
    const planetBottom = worldY + drawHeightWorld / 2;
    
    // Calculate camera view bounds in world space with margin
    const viewWidth = camera.getViewportWidth() / zoom;
    const viewHeight = camera.getViewportHeight() / zoom;
    const marginWidth = viewWidth * this.renderMargin;
    const marginHeight = viewHeight * this.renderMargin;
    
    const cameraLeft = camPos.x - (viewWidth / 2) - marginWidth;
    const cameraRight = camPos.x + (viewWidth / 2) + marginWidth;
    const cameraTop = camPos.y - (viewHeight / 2) - marginHeight;
    const cameraBottom = camPos.y + (viewHeight / 2) + marginHeight;
    
    // Check if planet overlaps with camera view (including margin)
    return !(
      planetRight < cameraLeft ||
      planetLeft > cameraRight ||
      planetBottom < cameraTop ||
      planetTop > cameraBottom
    );
  }

  render(
    overlayCtx: CanvasRenderingContext2D,
    worldX: number,
    worldY: number,
    camera: Camera,
    inInteractionRange: boolean,
    isInteracting: boolean
  ): void {
    if (!this.texture || !this.image) return;

    const drawWidthWorld = this.image.width * this.scale;
    const drawHeightWorld = this.image.height * this.scale;

    // Early return if planet is not visible (with margin)
    if (!this.isVisible(worldX, worldY, camera, drawWidthWorld, drawHeightWorld)) {
      return;
    }

    const { width, height } = this.gl.canvas;
    const camPos = camera.getPosition();

    const dx = worldX - camPos.x;
    const dy = worldY - camPos.y;

    const dxScreen = dx * camera.getZoom();
    const dyScreen = dy * camera.getZoom();

    const ndcOffsetX = dxScreen / (width / 2);
    const ndcOffsetY = -dyScreen / (height / 2); // WebGL Y flip

    const scaleX = (drawWidthWorld * camera.getZoom()) / width;
    const scaleY = (drawHeightWorld * camera.getZoom()) / height;

    this.gl.viewport(0, 0, width, height);
    this.gl.useProgram(this.program);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);

    const aPosition = this.gl.getAttribLocation(this.program, 'aPosition');
    this.gl.enableVertexAttribArray(aPosition);
    this.gl.vertexAttribPointer(aPosition, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.uniform1i(this.uTexture, 0);
    this.gl.uniform1f(this.uAlpha, 1.0);
    this.gl.uniform2f(this.uOffset, ndcOffsetX, ndcOffsetY);
    this.gl.uniform2f(this.uScale, scaleX, scaleY);

    // Enable alpha blending
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    // Disable afterwards
    this.gl.disableVertexAttribArray(aPosition);
    this.gl.disable(this.gl.BLEND);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    this.gl.useProgram(null);

    // === 2D Overlay remains unchanged ===
    if (inInteractionRange && !isInteracting) {
      const uiScale = getUniformScaleFactor();
      const screenCenterX = camera.getViewportWidth() / 2;
      const topOffsetY = 32 * uiScale;

      drawCRTText(overlayCtx, screenCenterX, topOffsetY, this.name, {
        font: `${uiScale * 24}px "Courier New", monospace`,
        align: 'center',
        baseline: 'top',
        glow: true,
        chromaticAberration: true,
      });

      drawCRTText(overlayCtx, screenCenterX, topOffsetY + (32 * uiScale), 'Open Communications: [C]', {
        font: `${uiScale * 16}px "Courier New", monospace`,
        align: 'center',
        baseline: 'top',
        glow: true,
        chromaticAberration: true
      });
    }
  }

  update(dt: number): void {
    // no-op
  }
}