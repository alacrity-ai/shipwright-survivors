// src/rendering/MultiShipRendererGL.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { Camera } from '@/core/Camera';
import type { ShipCullingSystem } from '@/game/ship/systems/ShipCullingSystem';
import type { InputManager } from '@/core/InputManager';
import { BLOCK_SIZE } from '@/game/blocks/BlockRegistry';
import { getDamageLevel, getGLBlockSprite } from '@/rendering/cache/BlockSpriteCache';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';

import { createOrthographicMatrix, createTranslationMatrix, createRotationMatrix, multiplyMatrices } from '@/rendering/gl/matrixUtils';
import { createQuadBuffer2 as createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { VERT_SHADER_SRC, FRAG_SHADER_SRC } from '@/rendering/gl/shaders/shipSpriteShaders';

function getChargeColor(id: string): [number, number, number] | null {
  if (id === 'battery1' || id === 'reactor1' || id === 'shield1') return [0.2, 0.6, 1.0];   // Blue
  if (id === 'battery2' || id === 'reactor2' || id === 'shield3') return [0.8, 0.5, 1.0];   // Violet
  if (id === 'shield2') return [0.3, 1.0, 0.4];                                             // Green
  return null;
}

function isMetallicSheenBlock(id: string): boolean {
  return id.startsWith('hull') || id.startsWith('fin') || id.startsWith('faceplate') || id.startsWith('engine');
}

export class MultiShipRendererGL {
  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;
  private readonly quadBuffer: WebGLBuffer;

  private readonly attribs = { position: 0 };
  private readonly uniforms: {
    uProjectionMatrix: WebGLUniformLocation | null;
    uViewMatrix: WebGLUniformLocation | null;
    uModelMatrix: WebGLUniformLocation | null;
    uTexture: WebGLUniformLocation | null;
    uTime: WebGLUniformLocation | null;
    uGlowStrength: WebGLUniformLocation | null;
    uEnergyPulse: WebGLUniformLocation | null;
    uChargeColor: WebGLUniformLocation | null;
    uSheenStrength: WebGLUniformLocation | null;
    uBlockPosition: WebGLUniformLocation | null;
    uBlockRotation: WebGLUniformLocation | null;
    uBlockScale: WebGLUniformLocation | null;
  };

  // Cached matrices to avoid recreation every frame
  private projectionMatrix: Float32Array = new Float32Array(16);
  private viewMatrix: Float32Array = new Float32Array(16);
  private shipModelMatrix: Float32Array = new Float32Array(16);

  constructor(
    canvasManager: CanvasManager,
    private readonly camera: Camera,
    private readonly cullingSystem: ShipCullingSystem,
    private readonly inputManager: InputManager
  ) {
    this.gl = canvasManager.getWebGLContext('entitygl');
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
    };
  }

  private updateProjectionMatrix(): void {
    const halfWidth = this.camera.getViewportWidth() / (2 * this.camera.getZoom());
    const halfHeight = this.camera.getViewportHeight() / (2 * this.camera.getZoom());

    const left = -halfWidth;
    const right = halfWidth;
    const bottom = halfHeight;
    const top = -halfHeight;

    this.projectionMatrix = createOrthographicMatrix(left, right, bottom, top);
  }

  private updateViewMatrix(): void {
    const camPos = this.camera.getPosition();
    this.viewMatrix = createTranslationMatrix(-camPos.x, -camPos.y);
  }

  render(): void {
    const { gl } = this;
    const visibleShips = this.cullingSystem.getVisibleShips();
    const mouseWorld = this.camera.screenToWorld(
      this.inputManager.getMousePosition().x,
      this.inputManager.getMousePosition().y
    );

    const canvasWidth = gl.canvas.width;
    const canvasHeight = gl.canvas.height;
    const time = performance.now() / 1000;

    // Update matrices once per frame
    this.updateProjectionMatrix();
    this.updateViewMatrix();

    gl.viewport(0, 0, canvasWidth, canvasHeight);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(this.attribs.position);
    gl.vertexAttribPointer(this.attribs.position, 2, gl.FLOAT, false, 0, 0);

    // Upload matrices once per frame
    gl.uniformMatrix4fv(this.uniforms.uProjectionMatrix, false, this.projectionMatrix);
    gl.uniformMatrix4fv(this.uniforms.uViewMatrix, false, this.viewMatrix);
    gl.uniform1f(this.uniforms.uTime, time);

    for (const ship of visibleShips) {
      const { position, rotation } = ship.getTransform();

      // Handle lighting
      if (PlayerSettingsManager.getInstance().isLightingEnabled()) {
        const auraId = ship.getLightAuraId?.();
        if (auraId) {
          try {
            LightingOrchestrator.getInstance().updateLight(auraId, position);
          } catch (e) {
            console.warn(`[MultiShipRendererGL] Light update failed for ship ${ship.id}`, e);
          }
        }
      }

      // Create ship model matrix (translation + rotation)
      this.shipModelMatrix = multiplyMatrices(
        createRotationMatrix(rotation),
        createTranslationMatrix(position.x, position.y)
      );

      for (const [coord, block] of ship.getAllBlocks()) {
        if (block.hidden) continue;

        const maxHp = block.type.armor ?? 1;
        const damageLevel = getDamageLevel(block.hp, maxHp);
        const sprite = getGLBlockSprite(block.type.id, damageLevel);

        // Block transforms in local space
        const blockLocalX = coord.x * BLOCK_SIZE;
        const blockLocalY = coord.y * BLOCK_SIZE;
        const blockRotation = (block.rotation ?? 0) * (Math.PI / 180);

        // Pass block-specific data to shader
        gl.uniform2f(this.uniforms.uBlockPosition, blockLocalX, blockLocalY);
        gl.uniform1f(this.uniforms.uBlockRotation, blockRotation);
        gl.uniform2f(this.uniforms.uBlockScale, BLOCK_SIZE, BLOCK_SIZE);

        // Upload ship model matrix
        gl.uniformMatrix4fv(this.uniforms.uModelMatrix, false, this.shipModelMatrix);

        // Block-specific shader effects
        const chargeColor = getChargeColor(block.type.id);
        const energyPulse = chargeColor ? Math.sin(time * 6.0) * 0.5 + 0.5 : 0.0;
        const glowStrength = block.type.id.startsWith('cockpit') ? 1.0 : 0.0;
        const sheenStrength = isMetallicSheenBlock(block.type.id) ? 1.0 : 0.0;

        gl.uniform1f(this.uniforms.uEnergyPulse, energyPulse);
        gl.uniform1f(this.uniforms.uGlowStrength, glowStrength);
        gl.uniform1f(this.uniforms.uSheenStrength, sheenStrength);

        if (chargeColor) {
          gl.uniform3f(this.uniforms.uChargeColor, ...chargeColor);
        } else {
          gl.uniform3f(this.uniforms.uChargeColor, 0.0, 0.0, 0.0);
        }

        gl.uniform1i(this.uniforms.uTexture, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sprite.base);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Handle overlay rendering with mouse targeting
        if (sprite.overlay) {
          const blockWorldX = position.x + blockLocalX * Math.cos(rotation) - blockLocalY * Math.sin(rotation);
          const blockWorldY = position.y + blockLocalX * Math.sin(rotation) + blockLocalY * Math.cos(rotation);
          
          const dx = mouseWorld.x - blockWorldX;
          const dy = mouseWorld.y - blockWorldY;
          const globalAngle = Math.atan2(dy, dx);
          const overlayAngle = globalAngle - rotation + Math.PI / 2;

          // Override block rotation for overlay
          gl.uniform1f(this.uniforms.uBlockRotation, overlayAngle);
          gl.bindTexture(gl.TEXTURE_2D, sprite.overlay);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          
          // Restore original block rotation for next iteration
          gl.uniform1f(this.uniforms.uBlockRotation, blockRotation);
        }
      }
    }

    gl.disableVertexAttribArray(this.attribs.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.useProgram(null);
  }

  destroy(): void {
    if (!this.gl.isProgram(this.program)) return;

    this.gl.deleteProgram(this.program);
    this.gl.deleteBuffer(this.quadBuffer);

    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    console.log('[MultiShipRendererGL] Resources destroyed and canvas cleared.');
  }
}
