// src/rendering/PreviewShipRendererGL.ts

// TODO : This needs to be migrated to GL2

import type { PreviewShip } from '@/game/ship/PreviewShip';
import { BLOCK_SIZE } from '@/game/blocks/BlockRegistry';
import { getDamageLevel, getGL2BlockSprite } from '@/rendering/cache/BlockSpriteCache';
import {
  createOrthographicMatrix,
  createTranslationMatrix,
  createRotationMatrix,
  createScaleMatrix,
  multiplyMatrices,
} from '@/rendering/gl/matrixUtils';
import { createQuadBuffer2 as createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { VERT_SHADER_SRC, FRAG_SHADER_SRC } from '@/rendering/gl/shaders/shipSpriteShaders';
import { CanvasManager } from '@/core/CanvasManager';

export class PreviewShipRendererGL {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly quadBuffer: WebGLBuffer;

  private readonly attribs = { position: 0 };
  private readonly uniforms: Record<string, WebGLUniformLocation | null>;

  private projectionMatrix: Float32Array = new Float32Array(16);
  private viewMatrix: Float32Array = new Float32Array(16);
  private modelMatrix: Float32Array = new Float32Array(16);

  private spinAngle: number = 0;

  constructor() {
    this.gl = CanvasManager.getInstance().getWebGL2Context('unifiedgl2');

    // TODO : Still using old shaders
    this.program = createProgramFromSources(this.gl, VERT_SHADER_SRC, FRAG_SHADER_SRC);
    this.quadBuffer = createQuadBuffer(this.gl);

    this.uniforms = {
      uProjectionMatrix: this.gl.getUniformLocation(this.program, 'uProjectionMatrix'),
      uViewMatrix: this.gl.getUniformLocation(this.program, 'uViewMatrix'),
      uModelMatrix: this.gl.getUniformLocation(this.program, 'uModelMatrix'),
      uTexture: this.gl.getUniformLocation(this.program, 'uTexture'),
      uTime: this.gl.getUniformLocation(this.program, 'uTime'),
      uGlowStrength: this.gl.getUniformLocation(this.program, 'uGlowStrength'),
      uEnergyPulse: this.gl.getUniformLocation(this.program, 'uEnergyPulse'),
      uChargeColor: this.gl.getUniformLocation(this.program, 'uChargeColor'),
      uSheenStrength: this.gl.getUniformLocation(this.program, 'uSheenStrength'),
      uBlockPosition: this.gl.getUniformLocation(this.program, 'uBlockPosition'),
      uBlockRotation: this.gl.getUniformLocation(this.program, 'uBlockRotation'),
      uBlockScale: this.gl.getUniformLocation(this.program, 'uBlockScale'),
      uCollisionColor: this.gl.getUniformLocation(this.program, 'uCollisionColor'),
      uUseCollisionColor: this.gl.getUniformLocation(this.program, 'uUseCollisionColor'),
    };
  }

  private updateProjectionMatrix(centerX = 0, centerY = 0): void {
    const width = this.gl.canvas.width;
    const height = this.gl.canvas.height;

    const halfW = width / 2;
    const halfH = height / 2;

    const left = centerX - halfW;
    const right = centerX + halfW;
    const top = centerY - halfH;
    const bottom = centerY + halfH;

    this.projectionMatrix = createOrthographicMatrix(left, right, bottom, top);
  }

  private updateViewMatrix(): void {
    this.viewMatrix = createTranslationMatrix(0, 0);
  }

  public render(previewShip: PreviewShip, deltaTime: number): void {
    const { gl } = this;
    const time = performance.now() / 1000;

    this.spinAngle += deltaTime * 0.4;

    const canvasW = gl.canvas.width;
    const canvasH = gl.canvas.height;

    // === Step 1: Get ship transform and center the projection on it ===
    const transform = previewShip.getTransform();
    this.updateProjectionMatrix(transform.position.x, transform.position.y);
    this.updateViewMatrix();

    // === Step 2: GL setup ===
    gl.viewport(0, 0, canvasW, canvasH);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(this.attribs.position);
    gl.vertexAttribPointer(this.attribs.position, 2, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(this.uniforms.uProjectionMatrix, false, this.projectionMatrix);
    gl.uniformMatrix4fv(this.uniforms.uViewMatrix, false, this.viewMatrix);
    gl.uniform1f(this.uniforms.uTime, time);

    // === Step 3: Compose model matrix (rotation + scale only) ===
    const scale = typeof transform.scale === 'number'
      ? { x: transform.scale, y: transform.scale }
      : transform.scale ?? { x: 1, y: 1 };

    const rotationMatrix = createRotationMatrix(this.spinAngle);
    const scaleMatrix = createScaleMatrix(scale.x, scale.y);
    const modelMatrix = multiplyMatrices(rotationMatrix, scaleMatrix);

    gl.uniformMatrix4fv(this.uniforms.uModelMatrix, false, modelMatrix);

    // === Step 4: Draw blocks ===
    for (const [coord, block] of previewShip.getAllBlocks()) {
      if (block.hidden) continue;

      const maxHp = block.type.armor ?? 1;
      const damageLevel = getDamageLevel(block.hp, maxHp);
      const sprite = getGL2BlockSprite(block.type.id, damageLevel);

      const localX = coord.x * BLOCK_SIZE;
      const localY = coord.y * BLOCK_SIZE;
      const blockRotation = (block.rotation ?? 0) * (Math.PI / 180);

      gl.uniform2f(this.uniforms.uBlockPosition, localX, localY);
      gl.uniform1f(this.uniforms.uBlockRotation, blockRotation);
      gl.uniform2f(this.uniforms.uBlockScale, BLOCK_SIZE, BLOCK_SIZE);

      const glow = block.type.id.startsWith('cockpit') ? 1.0 : 0.0;
      const sheen = block.type.id.startsWith('hull') ? 1.0 : 0.0;

      gl.uniform1f(this.uniforms.uGlowStrength, glow);
      gl.uniform1f(this.uniforms.uSheenStrength, sheen);
      gl.uniform1f(this.uniforms.uEnergyPulse, 0.0);
      gl.uniform3f(this.uniforms.uChargeColor, 0, 0, 0);

      gl.uniform1i(this.uniforms.uTexture, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sprite.base);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (sprite.overlay) {
        gl.uniform1f(this.uniforms.uBlockRotation, 0);
        gl.bindTexture(gl.TEXTURE_2D, sprite.overlay);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.uniform1f(this.uniforms.uBlockRotation, blockRotation);
      }
    }

    // === Step 5: Cleanup ===
    gl.disableVertexAttribArray(this.attribs.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.useProgram(null);
  }
  
  destroy(): void {
    const { gl } = this;
    if (!gl.isProgram(this.program)) return;

    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.quadBuffer);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    console.log('[PreviewShipRendererGL] Resources destroyed.');
  }
}
