// src/rendering/unified/passes/PlanetPass.ts

import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { createQuadBuffer2 } from '@/rendering/unified/utils/bufferUtils';
import { createGL2TextureFromCanvasWithAlpha } from '@/rendering/gl/glTextureUtils';
import { getAssetPath } from '@/shared/assetHelpers';

import { Camera } from '@/core/Camera';
import type { PlanetSpawnConfig } from '@/game/missions/types/MissionDefinition';

import planetVertSrc from '../shaders/planetPass.vert?raw';
import planetFragSrc from '../shaders/planetPass.frag?raw';

const DEFAULT_ALPHA = 1.0;
const RENDER_MARGIN = 0.2;

export interface PlanetInstance extends PlanetSpawnConfig {
  scale: number;
  imagePath: string;
}

export class PlanetPass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;

  private readonly uOffset: WebGLUniformLocation;
  private readonly uScale: WebGLUniformLocation;
  private readonly uTexture: WebGLUniformLocation;
  private readonly uAlpha: WebGLUniformLocation;

  private readonly camera: Camera = Camera.getInstance();

  private readonly planets = new Set<PlanetInstance>();
  private readonly textureCache = new Map<string, WebGLTexture>();
  private readonly imageSizeCache = new Map<string, { width: number; height: number }>();

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.program = createProgramFromSources(gl, planetVertSrc, planetFragSrc);
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

  addPlanet(config: PlanetSpawnConfig, scale: number, imagePath: string): void {
    this.planets.add({ ...config, scale, imagePath });
    this.ensureTextureLoaded(imagePath);
    console.log('[PlanetPass] Added planet:', config);
  }

  private async ensureTextureLoaded(name: string): Promise<void> {
    if (this.textureCache.has(name)) return;

    console.log('[PlanetPass] Loading planet texture:', name);
    const path = getAssetPath(name);
    const img = new Image();
    img.src = path;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d')!.drawImage(img, 0, 0);

    const texture = createGL2TextureFromCanvasWithAlpha(this.gl, canvas);
    this.textureCache.set(name, texture);
    this.imageSizeCache.set(name, { width: img.width, height: img.height });
  }

  renderAll(): void {
    const gl = this.gl;
    const { width, height } = gl.canvas;
    const camPos = this.camera.getPosition();
    const zoom = this.camera.getZoom();

    gl.viewport(0, 0, width, height);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    for (const planet of this.planets) {
      const texture = this.textureCache.get(planet.imagePath);
      const size = this.imageSizeCache.get(planet.imagePath);
      if (!texture || !size) continue;

      const drawWidthWorld = size.width * planet.scale;
      const drawHeightWorld = size.height * planet.scale;

      if (!this.isVisible(planet.x, planet.y, drawWidthWorld, drawHeightWorld)) continue;

      const dx = planet.x - camPos.x;
      const dy = planet.y - camPos.y;

      const dxScreen = dx * zoom;
      const dyScreen = dy * zoom;

      const ndcOffsetX = dxScreen / (width / 2);
      const ndcOffsetY = -dyScreen / (height / 2); // flip Y

      const scaleX = (drawWidthWorld * zoom) / width;
      const scaleY = (drawHeightWorld * zoom) / height;

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(this.uTexture, 0);
      gl.uniform1f(this.uAlpha, DEFAULT_ALPHA);
      gl.uniform2f(this.uOffset, ndcOffsetX, ndcOffsetY);
      gl.uniform2f(this.uScale, scaleX, scaleY);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  private isVisible(worldX: number, worldY: number, drawW: number, drawH: number): boolean {
    const camPos = this.camera.getPosition();
    const zoom = this.camera.getZoom();

    const left = worldX - drawW / 2;
    const right = worldX + drawW / 2;
    const top = worldY - drawH / 2;
    const bottom = worldY + drawH / 2;

    const viewW = this.camera.getViewportWidth() / zoom;
    const viewH = this.camera.getViewportHeight() / zoom;

    const marginW = viewW * RENDER_MARGIN;
    const marginH = viewH * RENDER_MARGIN;

    const camLeft = camPos.x - viewW / 2 - marginW;
    const camRight = camPos.x + viewW / 2 + marginW;
    const camTop = camPos.y - viewH / 2 - marginH;
    const camBottom = camPos.y + viewH / 2 + marginH;

    return !(
      right < camLeft ||
      left > camRight ||
      bottom < camTop ||
      top > camBottom
    );
  }

  destroy(): void {
    const gl = this.gl;
    for (const texture of this.textureCache.values()) gl.deleteTexture(texture);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.program);
  }
}
