// src/rendering/unified/passes/SpatialBodyPass.ts

import { SpatialBodyManager } from '@/game/spatialbodies/SpatialBodyManager';
import { SpatialBodyRegistry } from '@/game/spatialbodies/SpatialBodyRegistry';
import spatialBodyVertSrc from '@/rendering/unified/shaders/spatialBody.vert?raw';
import spatialBodyFragSrc from '@/rendering/unified/shaders/spatialBody.frag?raw';
import { createQuadBuffer2 as createQuadBuffer } from '@/rendering/unified/utils/bufferUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import type { Camera } from '@/core/Camera';

const FLOATS_PER_INSTANCE = 8; // worldX, worldY, scale, rotation, uMin, vMin, uMax, vMax
const MAX_BODIES = 1024;
const MAX_ATLASES = 4;
const INSTANCE_BUFFER_SIZE = MAX_BODIES * FLOATS_PER_INSTANCE;
const DEFAULT_ALPHA = 1.0;

export class SpatialBodyPass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;
  private readonly instanceData: Float32Array;
  private readonly uploadView: Float32Array;

  private readonly scratchBuffer: Uint32Array;

  private readonly store = SpatialBodyManager.getInstance().getSpatialBodyStore();
  private readonly grid = SpatialBodyManager.getInstance().getSpatialBodyGrid();

  private readonly atlasGroupBuffers: Uint32Array[] = [];
  private readonly atlasGroupCounts: Uint32Array;
  private readonly loadedAtlases: (WebGLTexture | null)[];

  // Shader uniform locations
  private readonly uAtlasLoc: WebGLUniformLocation | null;
  private readonly uAlphaLoc: WebGLUniformLocation | null;

  private instanceCount = 0;
  private dataIndex = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.program = createProgramFromSources(gl, spatialBodyVertSrc, spatialBodyFragSrc);

    this.instanceData = new Float32Array(INSTANCE_BUFFER_SIZE);
    this.uploadView = new Float32Array(this.instanceData.buffer);
    this.scratchBuffer = new Uint32Array(MAX_BODIES);

    for (let i = 0; i < MAX_ATLASES; i++) {
      this.atlasGroupBuffers[i] = new Uint32Array(MAX_BODIES);
    }
    this.atlasGroupCounts = new Uint32Array(MAX_ATLASES);

    // Preload atlas textures (async)
    this.loadedAtlases = new Array<WebGLTexture | null>(MAX_ATLASES).fill(null);
    const atlasCount = SpatialBodyRegistry.getAtlasCount();
    for (let i = 0; i < atlasCount; i++) {
      SpatialBodyRegistry.getAtlasTexture(gl, i).then((texture) => {
        this.loadedAtlases[i] = texture;
      });
    }

    // Cache uniforms
    this.uAtlasLoc = gl.getUniformLocation(this.program, 'uAtlas');
    this.uAlphaLoc = gl.getUniformLocation(this.program, 'uAlpha');

    // Bind the shared camera UBO (same as SpritePass / EntityPass)
    const blockIndex = gl.getUniformBlockIndex(this.program, 'CameraMatrices');
    if (blockIndex !== gl.INVALID_INDEX) {
      gl.uniformBlockBinding(this.program, blockIndex, 0);
    }

    // Set up geometry and instance buffers
    this.quadBuffer = createQuadBuffer(gl);
    this.instanceBuffer = gl.createBuffer()!;
    this.vao = gl.createVertexArray()!;

    gl.bindVertexArray(this.vao);

    // Static quad (location 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0);

    // Per-instance attributes (locations 1–4)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    const stride = FLOATS_PER_INSTANCE * 4;
    let offset = 0;

    gl.enableVertexAttribArray(1); // aWorldPos (vec2)
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(1, 1);
    offset += 8;

    gl.enableVertexAttribArray(2); // aScale (float)
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(2, 1);
    offset += 4;

    gl.enableVertexAttribArray(3); // aRotation (float)
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(3, 1);
    offset += 4;

    gl.enableVertexAttribArray(4); // aUVRect (vec4)
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(4, 1);

    gl.bindVertexArray(null);

    // Allocate GPU buffer once
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, INSTANCE_BUFFER_SIZE * 4, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private addInstance(idx: number): void {
    const { store } = this;
    const i = this.dataIndex;
    this.instanceData[i] = store.worldX[idx];
    this.instanceData[i + 1] = store.worldY[idx];
    this.instanceData[i + 2] = store.scale[idx];
    this.instanceData[i + 3] = store.rotation[idx];
    this.instanceData[i + 4] = store.uMin[idx];
    this.instanceData[i + 5] = store.vMin[idx];
    this.instanceData[i + 6] = store.uMax[idx];
    this.instanceData[i + 7] = store.vMax[idx];
    this.dataIndex += FLOATS_PER_INSTANCE;
  }

  render(camera: Camera): void {
    const { gl, grid, store, scratchBuffer, loadedAtlases } = this;

    this.atlasGroupCounts.fill(0);

    // Query visible spatial bodies
    const bounds = camera.getViewportBounds();
    const centerX = bounds.x + bounds.width * 0.5;
    const centerY = bounds.y + bounds.height * 0.5;
    const queryRadius = Math.max(bounds.width, bounds.height) * 0.5 * 1.2;

    const visibleCount = grid.getBodiesInArea(centerX, centerY, queryRadius, scratchBuffer);
    if (visibleCount === 0) return;

    // Group by atlas
    for (let i = 0; i < visibleCount; i++) {
      const idx = scratchBuffer[i];
      const atlas = store.atlasIndex[idx];
      const groupIdx = this.atlasGroupCounts[atlas]++;
      this.atlasGroupBuffers[atlas][groupIdx] = idx;
    }

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    if (this.uAtlasLoc) gl.uniform1i(this.uAtlasLoc, 0);
    if (this.uAlphaLoc) gl.uniform1f(this.uAlphaLoc, DEFAULT_ALPHA);

    // Draw each atlas group
    for (let atlasIndex = 0; atlasIndex < MAX_ATLASES; atlasIndex++) {
      const count = this.atlasGroupCounts[atlasIndex];
      if (count === 0) continue;

      const texture = loadedAtlases[atlasIndex];
      if (!texture) continue;

      this.dataIndex = 0;
      const group = this.atlasGroupBuffers[atlasIndex];
      for (let i = 0; i < count; i++) {
        this.addInstance(group[i]);
      }

      this.instanceCount = this.dataIndex / FLOATS_PER_INSTANCE;
      if (this.instanceCount === 0) continue;

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.uploadView, 0, this.dataIndex);

      console.log(`Drawing: ${this.instanceCount} instances from atlas ${atlasIndex}, and ${visibleCount} visible bodies with ${count} in this atlas`);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.instanceCount);
    }

    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  destroy(): void {
    const { gl } = this;
    if (gl.isBuffer(this.instanceBuffer)) gl.deleteBuffer(this.instanceBuffer);
    if (gl.isBuffer(this.quadBuffer)) gl.deleteBuffer(this.quadBuffer);
    if (gl.isVertexArray(this.vao)) gl.deleteVertexArray(this.vao);
    if (gl.isProgram(this.program)) gl.deleteProgram(this.program);
  }
}
