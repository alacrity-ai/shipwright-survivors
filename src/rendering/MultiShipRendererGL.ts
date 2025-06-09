// src/rendering/MultiShipRendererGL.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { Camera } from '@/core/Camera';
import type { ShipCullingSystem } from '@/game/ship/systems/ShipCullingSystem';
import type { InputManager } from '@/core/InputManager';
import { BLOCK_SIZE } from '@/game/blocks/BlockRegistry';
import { getDamageLevel, getGLBlockSprite } from '@/rendering/cache/BlockSpriteCache';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';

import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
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
    uTransform: WebGLUniformLocation | null;
    uTexture: WebGLUniformLocation | null;
    uTime: WebGLUniformLocation | null;
    uGlowStrength: WebGLUniformLocation | null;
    uEnergyPulse: WebGLUniformLocation | null;
    uChargeColor: WebGLUniformLocation | null;
    uSheenStrength: WebGLUniformLocation | null;
  };

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
      uTransform: this.gl.getUniformLocation(this.program, 'uTransform'),
      uTexture: this.gl.getUniformLocation(this.program, 'uTexture'),
      uTime: this.gl.getUniformLocation(this.program, 'uTime'),
      uGlowStrength: this.gl.getUniformLocation(this.program, 'uGlowStrength'),
      uEnergyPulse: this.gl.getUniformLocation(this.program, 'uEnergyPulse'),
      uChargeColor: this.gl.getUniformLocation(this.program, 'uChargeColor'),
      uSheenStrength: this.gl.getUniformLocation(this.program, 'uSheenStrength'), // 0 if disabled, 1 for full effect
    };
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
    const zoom = this.camera.zoom;
    const time = performance.now() / 1000;

    gl.viewport(0, 0, canvasWidth, canvasHeight);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(this.attribs.position);
    gl.vertexAttribPointer(this.attribs.position, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1f(this.uniforms.uTime, time);

    for (const ship of visibleShips) {
      const { position, rotation } = ship.getTransform();

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

      const shipScreen = this.camera.worldToScreen(position.x, position.y);
      const shipNdcX = (shipScreen.x / canvasWidth) * 2 - 1;
      const shipNdcY = (shipScreen.y / canvasHeight) * -2 + 1;

      const cosShip = Math.cos(rotation);
      const sinShip = Math.sin(rotation);
      const scaleX = (BLOCK_SIZE * zoom) / canvasWidth;
      const scaleY = (BLOCK_SIZE * zoom) / canvasHeight;

      for (const [coord, block] of ship.getAllBlocks()) {
        if (block.hidden) continue;

        const maxHp = block.type.armor ?? 1;
        const damageLevel = getDamageLevel(block.hp, maxHp);
        const sprite = getGLBlockSprite(block.type.id, damageLevel);

        const localX = coord.x * BLOCK_SIZE;
        const localY = coord.y * BLOCK_SIZE;

        const rotatedLocalX = cosShip * localX - sinShip * localY;
        const rotatedLocalY = sinShip * localX + cosShip * localY;

        const finalX = shipNdcX + (rotatedLocalX * zoom * 2) / canvasWidth;
        const finalY = shipNdcY - (rotatedLocalY * zoom * 2) / canvasHeight;

        const blockRotation = (block.rotation ?? 0) * (Math.PI / 180);
        const totalRotation = rotation + blockRotation;

        const cos = Math.cos(totalRotation);
        const sin = Math.sin(totalRotation);

        const transform = new Float32Array([
          cos * scaleX, -sin * scaleY, 0,
          sin * scaleX,  cos * scaleY, 0,
          finalX,        finalY,       1,
        ]);

        gl.uniformMatrix3fv(this.uniforms.uTransform, false, transform);
        gl.uniform1i(this.uniforms.uTexture, 0);

        // === Add block specific shader effects ===
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

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sprite.base);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        if (sprite.overlay) {
          const blockWorldX = position.x + localX;
          const blockWorldY = position.y + localY;
          const dx = mouseWorld.x - blockWorldX;
          const dy = mouseWorld.y - blockWorldY;
          const globalAngle = Math.atan2(dy, dx);
          const overlayAngle = globalAngle - rotation + Math.PI / 2;

          const cosO = Math.cos(overlayAngle);
          const sinO = Math.sin(overlayAngle);

          const transformOverlay = new Float32Array([
            cosO * scaleX, -sinO * scaleY, 0,
            sinO * scaleX,  cosO * scaleY, 0,
            finalX,         finalY,        1,
          ]);

          gl.uniformMatrix3fv(this.uniforms.uTransform, false, transformOverlay);
          gl.bindTexture(gl.TEXTURE_2D, sprite.overlay);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
      }
    }

    gl.disableVertexAttribArray(this.attribs.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.useProgram(null);
  }
}
