// src/rendering/unified/passes/EntityPass.ts

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { Camera } from '@/core/Camera';
import type { InputManager } from '@/core/InputManager';
import { BLOCK_SIZE } from '@/config/view';
import { getDamageLevel } from '@/rendering/cache/BlockSpriteCache';
import { getGL2BlockOrAsteroidSprite } from '@/rendering/unified/helpers/GLSpriteResolver';
import { entityFrameBudgetMs } from '@/config/graphicsConfig';

import entityVertSrc from '../shaders/entityPass.vert?raw';
import entityFragSrc from '../shaders/entityPass.frag?raw';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import {
  createRotationMatrixInPlace,
  createTranslationMatrixInPlace,
  multiplyMatricesInPlace
} from '@/rendering/gl/matrixUtils';
import { createQuadBuffer2 as createQuadBuffer } from '@/rendering/unified/utils/bufferUtils';

const tmpTranslation = new Float32Array(16);
const tmpRotation = new Float32Array(16);
const tmpModelMatrix = new Float32Array(16);
const tmpMouseWorld = { x: 0, y: 0 };

function isMetallicSheenBlock(id: string): boolean {
  return id.startsWith('hull') || id.startsWith('fin') || id.startsWith('faceplate') || id.startsWith('engine');
}

export class EntityPass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;

  private frameBudgetMs: number = entityFrameBudgetMs;
  private lastEntityIndex = 0;
  private lastBlockIndices = new WeakMap<CompositeBlockObject, number>();
  private currentTex0: WebGLTexture | null = null;

  private ambientLight: [number, number, number] = [3.2, 3.2, 3.2];

  private readonly uniforms: {
    uModelMatrix: WebGLUniformLocation | null;
    uBlockPosition: WebGLUniformLocation | null;
    uBlockRotation: WebGLUniformLocation | null;
    uBlockScale: WebGLUniformLocation | null;
    uTexture: WebGLUniformLocation | null;
    uLightMap: WebGLUniformLocation | null;
    uTime: WebGLUniformLocation | null;
    uCollisionColor: WebGLUniformLocation | null;
    uUseCollisionColor: WebGLUniformLocation | null;
    uAmbientLight: WebGLUniformLocation | null;
    uBlockColor: WebGLUniformLocation | null;
    uUseBlockColor: WebGLUniformLocation | null;
    uBlockColorIntensity: WebGLUniformLocation | null;
  };

  constructor(
    gl: WebGL2RenderingContext,
    private readonly inputManager?: InputManager
  ) {
    this.gl = gl;
    this.program = createProgramFromSources(gl, entityVertSrc, entityFragSrc);

    const blockIndex = gl.getUniformBlockIndex(this.program, 'CameraBlock');
    if (blockIndex !== gl.INVALID_INDEX) {
      gl.uniformBlockBinding(this.program, blockIndex, 0);
    }

    this.quadBuffer = createQuadBuffer(gl);

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.uniforms = {
      uModelMatrix: gl.getUniformLocation(this.program, 'uModelMatrix'),
      uBlockPosition: gl.getUniformLocation(this.program, 'uBlockPosition'),
      uBlockRotation: gl.getUniformLocation(this.program, 'uBlockRotation'),
      uBlockScale: gl.getUniformLocation(this.program, 'uBlockScale'),
      uTexture: gl.getUniformLocation(this.program, 'uTexture'),
      uLightMap: gl.getUniformLocation(this.program, 'uLightMap'),
      uTime: gl.getUniformLocation(this.program, 'uTime'),
      uCollisionColor: gl.getUniformLocation(this.program, 'uCollisionColor'),
      uUseCollisionColor: gl.getUniformLocation(this.program, 'uUseCollisionColor'),
      uAmbientLight: gl.getUniformLocation(this.program, 'uAmbientLight'),
      uBlockColor: gl.getUniformLocation(this.program, 'uBlockColor'),
      uUseBlockColor: gl.getUniformLocation(this.program, 'uUseBlockColor'),
      uBlockColorIntensity: gl.getUniformLocation(this.program, 'uBlockColorIntensity'),
    };
  }

  setFrameBudget(ms: number): void {
    this.frameBudgetMs = ms;
  }

  render(entities: CompositeBlockObject[], lightTexture: WebGLTexture, camera: Camera): void {
    const { gl } = this;
    const now = performance.now();
    const deadline = now + this.frameBudgetMs;
    const time = now / 1000;

    if (entities.length === 0) return;
    const startIndex = this.lastEntityIndex % entities.length;

    // Fixed per-pass state
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(this.program);
    this.currentTex0 = null; // Clear texture cache at start of pass
    gl.bindVertexArray(this.vao);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Set uniforms that don't change per-block
    gl.uniform2f(this.uniforms.uBlockScale, BLOCK_SIZE, BLOCK_SIZE);
    gl.uniform1f(this.uniforms.uTime, time);
    gl.uniform3f(this.uniforms.uAmbientLight, ...this.ambientLight);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, lightTexture);
    gl.uniform1i(this.uniforms.uLightMap, 1);

    if (this.inputManager) {
      const mouse = this.inputManager.getMousePosition();
      camera.screenToWorld(mouse.x, mouse.y, tmpMouseWorld);
    }

    // Main entity loop
    let i = startIndex;
    for (let looped = 0; looped < entities.length; looped++) {
      const entity = entities[i];
      const { position, rotation } = entity.getTransform();

      createTranslationMatrixInPlace(position.x, position.y, tmpTranslation);
      createRotationMatrixInPlace(rotation, tmpRotation);
      multiplyMatricesInPlace(tmpTranslation, tmpRotation, tmpModelMatrix);

      gl.uniformMatrix4fv(this.uniforms.uModelMatrix, false, tmpModelMatrix);
      gl.uniform1i(this.uniforms.uUseCollisionColor, 0);

      const colorOverride = entity.getBlockColor?.();
      const intensity = entity.getBlockColorIntensity?.() ?? 0.5;

      if (colorOverride) {
        const r = parseInt(colorOverride.substring(1, 3), 16) / 255;
        const g = parseInt(colorOverride.substring(3, 5), 16) / 255;
        const b = parseInt(colorOverride.substring(5, 7), 16) / 255;
        gl.uniform3f(this.uniforms.uBlockColor, r, g, b);
        gl.uniform1i(this.uniforms.uUseBlockColor, 1);
        gl.uniform1f(this.uniforms.uBlockColorIntensity, intensity);
      } else {
        gl.uniform1i(this.uniforms.uUseBlockColor, 0);
      }

      let blockIndex = this.lastBlockIndices.get(entity) ?? 0;
      let currentBlock = 0;

      entity.forEachBlock((coord, block) => {
        if (currentBlock++ < blockIndex) return;
        if (block.hidden) return;

        const typeId = block.type.id;
        const maxHp = block.type.armor ?? 1;
        const damageLevel = getDamageLevel(block.hp, maxHp);
        const sprite = getGL2BlockOrAsteroidSprite(typeId, damageLevel);

        const localX = coord.x * BLOCK_SIZE;
        const localY = coord.y * BLOCK_SIZE;
        const blockRotation = (block.rotation ?? 0) * Math.PI / 180;

        gl.uniform2f(this.uniforms.uBlockPosition, localX, localY);
        gl.uniform1f(this.uniforms.uBlockRotation, blockRotation);

        // Bind base texture and render
        this.bindTex0(sprite.base);
        gl.uniform1i(this.uniforms.uTexture, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Overlay rendering
        if (sprite.overlay && this.inputManager) {
          const worldX = position.x + localX * Math.cos(rotation) - localY * Math.sin(rotation);
          const worldY = position.y + localX * Math.sin(rotation) + localY * Math.cos(rotation);

          const dx = tmpMouseWorld.x - worldX;
          const dy = tmpMouseWorld.y - worldY;
          const globalAngle = Math.atan2(dy, dx);
          const overlayAngle = globalAngle - rotation + Math.PI / 2;

          gl.uniform1f(this.uniforms.uBlockRotation, overlayAngle);
          gl.uniform2f(this.uniforms.uBlockPosition, localX, localY);

          this.bindTex0(sprite.overlay);
          gl.uniform1i(this.uniforms.uTexture, 0);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

          // Restore original rotation (position is already set correctly)
          gl.uniform1f(this.uniforms.uBlockRotation, blockRotation);
        }

        // Frame budget check
        if (performance.now() > deadline) {
          this.lastEntityIndex = i;
          this.lastBlockIndices.set(entity, currentBlock);
          gl.disable(gl.BLEND);
          gl.bindVertexArray(null);
          gl.useProgram(null);
          return;
        }
      });

      this.lastBlockIndices.delete(entity);
      i = (i + 1) % entities.length;
    }

    // End-of-pass cleanup
    this.lastEntityIndex = i;
    this.lastBlockIndices = new WeakMap();

    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  setAmbientLight(value: [number, number, number]): void {
    this.ambientLight = value;
  }

  destroy(): void {
    const { gl } = this;
    if (gl.isProgram(this.program)) gl.deleteProgram(this.program);
    if (gl.isBuffer(this.quadBuffer)) gl.deleteBuffer(this.quadBuffer);
    if (gl.isVertexArray(this.vao)) gl.deleteVertexArray(this.vao);
  }

  /** Optimized texture binding - avoids redundant GL calls */
  private bindTex0(tex: WebGLTexture): void {
    if (tex !== this.currentTex0) {
      const { gl } = this;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      this.currentTex0 = tex;
    }
  }
}
