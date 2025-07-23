// src/rendering/unified/passes/EntityPass.ts

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { Camera } from '@/core/Camera';
import type { InputManager } from '@/core/InputManager';
import { BLOCK_SIZE } from '@/config/view';
import { getDamageLevel, initializeUnifiedBlockAtlas, getBlockAtlasUVOffset } from '@/rendering/cache/BlockSpriteCache';
import { entityFrameBudgetMs } from '@/config/graphicsConfig';

import entityVertSrc from '../shaders/entityPass.vert?raw';
import entityFragSrc from '../shaders/entityPass.frag?raw';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { createQuadBuffer2 as createQuadBuffer } from '@/rendering/unified/utils/bufferUtils';

import { MAX_BLOCKS_GL, getSafeUniformCount } from '@/config/graphicsConfig';

const FLOATS_PER_INSTANCE = 12; // 12 float attributes per block
const INSTANCE_BUFFER_SIZE = MAX_BLOCKS_GL * FLOATS_PER_INSTANCE;

export class EntityPass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;

  private readonly blockAtlasTexture: WebGLTexture;

  private tileSize: [number, number];

  private frameBudgetMs: number = entityFrameBudgetMs;
  private maxBlocks: number = MAX_BLOCKS_GL;
  private instanceBufferSize: number = INSTANCE_BUFFER_SIZE;

  private ambientLight: [number, number, number] = [3.2, 3.2, 3.2];

  // ─── GC-Optimized Reusable Buffers ─────────────────────────────────────
  private readonly instanceData = new Float32Array(INSTANCE_BUFFER_SIZE);
  private instanceCount = 0;
  private dataIndex = 0;

  // Pre-allocated reusable objects to avoid allocations in hot paths
  private readonly tempColor = { r: 0, g: 0, b: 0 };
  private readonly tempTransform = { x: 0, y: 0, rotation: 0 };

  private readonly uniforms: {
    uBlockScale: WebGLUniformLocation | null;
    uLightMap: WebGLUniformLocation | null;
    uTime: WebGLUniformLocation | null;
    uCollisionColor: WebGLUniformLocation | null;
    uUseCollisionColor: WebGLUniformLocation | null;
    uAmbientLight: WebGLUniformLocation | null;
    uBlockColorIntensity: WebGLUniformLocation | null;

    uBlockAtlas: WebGLUniformLocation | null;
    uTileSize: WebGLUniformLocation | null;
  };

  constructor(
    gl: WebGL2RenderingContext,
    private readonly inputManager?: InputManager
  ) {
    this.gl = gl;
    this.program = createProgramFromSources(gl, entityVertSrc, entityFragSrc);

    this.maxBlocks = Math.min(MAX_BLOCKS_GL, getSafeUniformCount(gl));
    this.instanceBufferSize = this.maxBlocks * FLOATS_PER_INSTANCE;

    const atlas = initializeUnifiedBlockAtlas(gl);
    this.blockAtlasTexture = atlas.texture;
    this.tileSize = [atlas.tileWidth, atlas.tileHeight];

    // ─── Camera Uniform Block ──────────────────────────────────────────────
    const blockIndex = gl.getUniformBlockIndex(this.program, 'CameraBlock');
    if (blockIndex !== gl.INVALID_INDEX) {
      gl.uniformBlockBinding(this.program, blockIndex, 0);
    }

    // ─── Geometry and Instance Buffers ─────────────────────────────────────
    this.quadBuffer = createQuadBuffer(gl);
    this.instanceBuffer = gl.createBuffer()!;
    this.vao = gl.createVertexArray()!;

    gl.bindVertexArray(this.vao);

    // ── Static Quad Geometry ──
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); // aVertex
    gl.vertexAttribDivisor(0, 0);

    // ── Instanced Block Data ──
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);

    const stride = 12 * 4;
    let offset = 0;

    // location = 1 → vec2 aPos
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(1, 1);
    offset += 8;

    // location = 2 → float aRotation
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(2, 1);
    offset += 4;

    // location = 3 → vec2 aBaseUV
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(3, 1);
    offset += 8;

    // location = 4 → vec2 aOverlayUV
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 2, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(4, 1);
    offset += 8;

    // location = 5 → float aUseOverlay
    gl.enableVertexAttribArray(5);
    gl.vertexAttribPointer(5, 1, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(5, 1);
    offset += 4;

    // location = 6 → vec3 aColor
    gl.enableVertexAttribArray(6);
    gl.vertexAttribPointer(6, 3, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(6, 1);
    offset += 12;

    // location = 7 → float aUseColor
    gl.enableVertexAttribArray(7);
    gl.vertexAttribPointer(7, 1, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(7, 1);
    // Total: 12 floats = 48 bytes

    gl.bindVertexArray(null);

    // ─── Uniforms ──────────────────────────────────────────────────────────
    this.uniforms = {
      uBlockScale: gl.getUniformLocation(this.program, 'uBlockScale'),
      uLightMap: gl.getUniformLocation(this.program, 'uLightMap'),
      uTime: gl.getUniformLocation(this.program, 'uTime'),
      uCollisionColor: gl.getUniformLocation(this.program, 'uCollisionColor'),
      uUseCollisionColor: gl.getUniformLocation(this.program, 'uUseCollisionColor'),
      uAmbientLight: gl.getUniformLocation(this.program, 'uAmbientLight'),
      uBlockColorIntensity: gl.getUniformLocation(this.program, 'uBlockColorIntensity'),

      uBlockAtlas: gl.getUniformLocation(this.program, 'uBlockAtlas'),
      uTileSize: gl.getUniformLocation(this.program, 'uTileSize'),
    };
  }

  setFrameBudget(ms: number): void {
    this.frameBudgetMs = ms;
  }

  /**
   * GC-free helper to parse hex color into RGB components
   * Reuses tempColor object to avoid allocations
   */
  private parseHexColor(hex: string): { r: number; g: number; b: number } {
    this.tempColor.r = parseInt(hex.slice(1, 3), 16) / 255;
    this.tempColor.g = parseInt(hex.slice(3, 5), 16) / 255;
    this.tempColor.b = parseInt(hex.slice(5, 7), 16) / 255;
    return this.tempColor;
  }

  /**
   * GC-free helper to add instance data to the buffer
   * Directly writes to Float32Array to avoid intermediate allocations
   */
  private addInstanceData(
    worldX: number, worldY: number,
    rotation: number,
    baseUVX: number, baseUVY: number,
    overlayUVX: number, overlayUVY: number,
    useOverlay: number,
    colorR: number, colorG: number, colorB: number,
    useColor: number
  ): void {
    // Bounds check to prevent buffer overflow
    if (this.dataIndex + FLOATS_PER_INSTANCE > this.instanceBufferSize) {
      console.warn('EntityPass: Instance buffer overflow, skipping remaining blocks');
      return;
    }

    const data = this.instanceData;
    const idx = this.dataIndex;

    data[idx] = worldX;
    data[idx + 1] = worldY;
    data[idx + 2] = rotation;
    data[idx + 3] = baseUVX;
    data[idx + 4] = baseUVY;
    data[idx + 5] = overlayUVX;
    data[idx + 6] = overlayUVY;
    data[idx + 7] = useOverlay;
    data[idx + 8] = colorR;
    data[idx + 9] = colorG;
    data[idx + 10] = colorB;
    data[idx + 11] = useColor;

    this.dataIndex += FLOATS_PER_INSTANCE;
  }

  render(entities: CompositeBlockObject[], lightTexture: WebGLTexture, camera: Camera): void {
    const { gl } = this;
    const now = performance.now();
    const deadline = now + this.frameBudgetMs;
    const time = now / 1000;

    if (entities.length === 0) return;

    // ─── Reset Instance Data Buffer ────────────────────────────────────────
    this.dataIndex = 0;
    this.instanceCount = 0;

    // ─── Per-frame GL State ────────────────────────────────────────────────
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // ─── Shared Uniforms ───────────────────────────────────────────────────
    gl.uniform2f(this.uniforms.uBlockScale, BLOCK_SIZE, BLOCK_SIZE);
    gl.uniform1f(this.uniforms.uTime, time);
    gl.uniform3f(this.uniforms.uAmbientLight, ...this.ambientLight);
    gl.uniform1f(this.uniforms.uBlockColorIntensity, 1.0); // Or desired factor

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, lightTexture);
    gl.uniform1i(this.uniforms.uLightMap, 1);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.blockAtlasTexture);
    gl.uniform1i(this.uniforms.uBlockAtlas, 0);
    gl.uniform2f(this.uniforms.uTileSize, this.tileSize[0], this.tileSize[1]);

    // ─── Per-Instance Aggregation (GC-Optimized) ───────────────────────────
    for (const entity of entities) {
      const transform = entity.getTransform();
      
      // Reuse temp object to avoid allocation
      this.tempTransform.x = transform.position.x;
      this.tempTransform.y = transform.position.y;
      this.tempTransform.rotation = transform.rotation;

      const cosRot = Math.cos(this.tempTransform.rotation);
      const sinRot = Math.sin(this.tempTransform.rotation);

      const colorOverride = entity.getBlockColor?.();
      let colorR = 0, colorG = 0, colorB = 0, useColor = 0;

      if (colorOverride) {
        const color = this.parseHexColor(colorOverride);
        colorR = color.r;
        colorG = color.g;
        colorB = color.b;
        useColor = 1;
      }

      entity.forEachBlock((coord, block) => {
        if (performance.now() > deadline) return;
        if (block.hidden) return;

        const localX = coord.x * BLOCK_SIZE;
        const localY = coord.y * BLOCK_SIZE;
        const worldX = this.tempTransform.x + localX * cosRot - localY * sinRot;
        const worldY = this.tempTransform.y + localX * sinRot + localY * cosRot;
        const localRotation = (block.rotation ?? 0) * Math.PI / 180;
        const composedRotation = this.tempTransform.rotation + localRotation;

        const damageLevel = getDamageLevel(block.hp, block.type.armor ?? 1);
        const { baseUV, overlayUV } = getBlockAtlasUVOffset(block.type.id, damageLevel);

        // ─── Base layer ────────────────────────────────────────
        this.addInstanceData(
          worldX, worldY,
          composedRotation,
          baseUV[0], baseUV[1],
          0, 0, // no overlay UV
          0,    // aUseOverlay = false
          colorR, colorG, colorB,
          useColor
        );

        // ─── Overlay layer (if present) ────────────────────────
        if (overlayUV) {
          const overlayRotation = composedRotation; // optionally compute overlay-specific
          this.addInstanceData(
            worldX, worldY,
            overlayRotation,
            0, 0, // no baseUV
            overlayUV[0], overlayUV[1],
            1,    // aUseOverlay = true
            colorR, colorG, colorB,
            useColor
          );
        }
      });
    }

    // ─── Upload Instance Buffer ────────────────────────────────────────────
    this.instanceCount = this.dataIndex / FLOATS_PER_INSTANCE;
    
    if (this.instanceCount === 0) {
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
      gl.useProgram(null);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    
    // Use subarray to avoid copying unused portions of the buffer
    const usedData = this.instanceData.subarray(0, this.dataIndex);
    gl.bufferData(gl.ARRAY_BUFFER, usedData, gl.DYNAMIC_DRAW);

    // ─── Draw Call ─────────────────────────────────────────────────────────
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.instanceCount);

    // ─── Cleanup ───────────────────────────────────────────────────────────
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  setAmbientLight(value: [number, number, number]): void {
    this.ambientLight = value;
  }

  /**
   * Get current memory usage statistics for debugging
   */
  getMemoryStats(): { 
    bufferSize: number; 
    usedInstances: number; 
    utilization: number;
    estimatedMemoryKB: number;
  } {
    const estimatedMemoryKB = (INSTANCE_BUFFER_SIZE * 4) / 1024; // 4 bytes per float
    return {
      bufferSize: INSTANCE_BUFFER_SIZE,
      usedInstances: this.instanceCount,
      utilization: this.instanceCount / this.maxBlocks,
      estimatedMemoryKB
    };
  }

  destroy(): void {
    const { gl } = this;
    if (gl.isBuffer(this.instanceBuffer)) {
      gl.deleteBuffer(this.instanceBuffer);
    }
    if (gl.isProgram(this.program)) gl.deleteProgram(this.program);
    if (gl.isBuffer(this.quadBuffer)) gl.deleteBuffer(this.quadBuffer);
    if (gl.isVertexArray(this.vao)) gl.deleteVertexArray(this.vao);
    if (gl.isTexture(this.blockAtlasTexture)) gl.deleteTexture(this.blockAtlasTexture);
  }
}
