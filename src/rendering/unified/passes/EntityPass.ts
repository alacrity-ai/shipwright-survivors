// src/rendering/unified/passes/EntityPass.ts

import type { Ship } from '@/game/ship/Ship';
import type { Camera } from '@/core/Camera';
import type { InputManager } from '@/core/InputManager';
import { BLOCK_SIZE } from '@/game/blocks/BlockRegistry';
import { getDamageLevel, getGL2BlockSprite } from '@/rendering/cache/BlockSpriteCache';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';

import entityVertSrc from '../shaders/entityPass.vert?raw';
import entityFragSrc from '../shaders/entityPass.frag?raw';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { createRotationMatrix, createTranslationMatrix, multiplyMatrices } from '@/rendering/gl/matrixUtils';
import { createQuadBuffer2 as createQuadBuffer } from '@/rendering/unified/utils/bufferUtils';

function getChargeColor(id: string): [number, number, number] | null {
  if (id === 'battery1' || id === 'reactor1' || id === 'shield1') return [0.2, 0.6, 1.0];
  if (id === 'battery2' || id === 'reactor2' || id === 'shield3') return [0.8, 0.5, 1.0];
  if (id === 'shield2') return [0.3, 1.0, 0.4];
  return null;
}

function isMetallicSheenBlock(id: string): boolean {
  return id.startsWith('hull') || id.startsWith('fin') || id.startsWith('faceplate') || id.startsWith('engine');
}

export class EntityPass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;

  private ambientLight: [number, number, number] = [0.2, 0.2, 0.25];

  private readonly uniforms: {
    uModelMatrix: WebGLUniformLocation | null;
    uBlockPosition: WebGLUniformLocation | null;
    uBlockRotation: WebGLUniformLocation | null;
    uBlockScale: WebGLUniformLocation | null;
    uTexture: WebGLUniformLocation | null;
    uLightMap: WebGLUniformLocation | null;
    uTime: WebGLUniformLocation | null;
    uGlowStrength: WebGLUniformLocation | null;
    uEnergyPulse: WebGLUniformLocation | null;
    uChargeColor: WebGLUniformLocation | null;
    uSheenStrength: WebGLUniformLocation | null;
    uCollisionColor: WebGLUniformLocation | null;
    uUseCollisionColor: WebGLUniformLocation | null;
    uAmbientLight: WebGLUniformLocation | null;
  };

  private shipModelMatrix: Float32Array = new Float32Array(16);

  constructor(
    gl: WebGL2RenderingContext,
    private readonly inputManager?: InputManager
  ) {
    this.gl = gl;
    this.program = createProgramFromSources(gl, entityVertSrc, entityFragSrc);

    // === BIND CAMERA UBO TO BINDING POINT 0 ===
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
      uGlowStrength: gl.getUniformLocation(this.program, 'uGlowStrength'),
      uEnergyPulse: gl.getUniformLocation(this.program, 'uEnergyPulse'),
      uChargeColor: gl.getUniformLocation(this.program, 'uChargeColor'),
      uSheenStrength: gl.getUniformLocation(this.program, 'uSheenStrength'),
      uCollisionColor: gl.getUniformLocation(this.program, 'uCollisionColor'),
      uUseCollisionColor: gl.getUniformLocation(this.program, 'uUseCollisionColor'),
      uAmbientLight: gl.getUniformLocation(this.program, 'uAmbientLight')
    };
  }

  render(ships: Ship[], lightTexture: WebGLTexture, camera: Camera): void {
    const { gl } = this;
    const time = performance.now() / 1000;

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.uniform1f(this.uniforms.uTime, time);
    gl.uniform3f(this.uniforms.uAmbientLight, ...this.ambientLight);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, lightTexture);
    gl.uniform1i(this.uniforms.uLightMap, 1);

    let mouseWorld = { x: 0, y: 0 };
    if (this.inputManager) {
      const mouse = this.inputManager.getMousePosition();
      mouseWorld = camera.screenToWorld(mouse.x, mouse.y);
    }

    for (const ship of ships) {
      const { position, rotation } = ship.getTransform();

      if (PlayerSettingsManager.getInstance().isLightingEnabled()) {
        const auraId = ship.getLightAuraId?.();
        if (auraId) {
          try {
            LightingOrchestrator.getInstance().updateLight(auraId, position);
          } catch (e) {
            console.warn(`[EntityPass] Light update failed for ship ${ship.id}`, e);
          }
        }
      }

      this.shipModelMatrix = multiplyMatrices(
        createRotationMatrix(rotation),
        createTranslationMatrix(position.x, position.y)
      );

      gl.uniformMatrix4fv(this.uniforms.uModelMatrix, false, this.shipModelMatrix);
      gl.uniform1i(this.uniforms.uUseCollisionColor, 0);

      for (const [coord, block] of ship.getAllBlocks()) {
        if (block.hidden) continue;

        const maxHp = block.type.armor ?? 1;
        const damageLevel = getDamageLevel(block.hp, maxHp);
        const sprite = getGL2BlockSprite(block.type.id, damageLevel);

        const blockLocalX = coord.x * BLOCK_SIZE;
        const blockLocalY = coord.y * BLOCK_SIZE;
        const blockRotation = (block.rotation ?? 0) * (Math.PI / 180);

        gl.uniform2f(this.uniforms.uBlockPosition, blockLocalX, blockLocalY);
        gl.uniform1f(this.uniforms.uBlockRotation, blockRotation);
        gl.uniform2f(this.uniforms.uBlockScale, BLOCK_SIZE, BLOCK_SIZE);

        const chargeColor = getChargeColor(block.type.id);
        const energyPulse = chargeColor ? Math.sin(time * 6.0) * 0.5 + 0.5 : 0.0;
        const glowStrength = block.type.id.startsWith('cockpit') ? 1.0 : 0.0;
        const sheenStrength = isMetallicSheenBlock(block.type.id) ? 1.0 : 0.0;

        gl.uniform1f(this.uniforms.uEnergyPulse, energyPulse);
        gl.uniform1f(this.uniforms.uGlowStrength, glowStrength);
        gl.uniform1f(this.uniforms.uSheenStrength, sheenStrength);
        gl.uniform3f(this.uniforms.uChargeColor, ...(chargeColor ?? [0.0, 0.0, 0.0]));

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sprite.base);
        gl.uniform1i(this.uniforms.uTexture, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        if (sprite.overlay && this.inputManager) {
          const blockWorldX = position.x + blockLocalX * Math.cos(rotation) - blockLocalY * Math.sin(rotation);
          const blockWorldY = position.y + blockLocalX * Math.sin(rotation) + blockLocalY * Math.cos(rotation);

          const dx = mouseWorld.x - blockWorldX;
          const dy = mouseWorld.y - blockWorldY;
          const globalAngle = Math.atan2(dy, dx);
          const overlayAngle = globalAngle - rotation + Math.PI / 2;

          gl.uniform1f(this.uniforms.uBlockRotation, overlayAngle);
          gl.uniform2f(this.uniforms.uBlockPosition, blockLocalX, blockLocalY);
          gl.bindTexture(gl.TEXTURE_2D, sprite.overlay);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

          gl.uniform1f(this.uniforms.uBlockRotation, blockRotation);
        }
      }
    }

    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  public setAmbientLight(value: [number, number, number]): void {
    this.ambientLight = value;
  }

  destroy(): void {
    const { gl } = this;
    if (gl.isProgram(this.program)) gl.deleteProgram(this.program);
    if (gl.isBuffer(this.quadBuffer)) gl.deleteBuffer(this.quadBuffer);
    if (gl.isVertexArray(this.vao)) gl.deleteVertexArray(this.vao);
  }
}
