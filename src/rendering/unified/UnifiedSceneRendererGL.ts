// src/rendering/unified/UnifiedSceneRendererGL.ts

import type { Camera } from '@/core/Camera';
import type { AnyLightInstance } from '@/lighting/lights/types';
import type { Particle } from '@/systems/fx/interfaces/Particle';
import type { Ship } from '@/game/ship/Ship';
import type { InputManager } from '@/core/InputManager';

import { CanvasManager } from '@/core/CanvasManager';
import { GlobalEventBus } from '@/core/EventBus';
import type { EventTypes } from '@/core/interfaces/EventTypes';

import type { SpriteRenderRequest } from './interfaces/SpriteRenderRequest';
import type { SpriteInstance } from './passes/SpritePass';

import { LightingPass } from './passes/LightingPass';
import { EntityPass } from './passes/EntityPass';
import { ParticlePass } from './passes/ParticlePass';
import { SpritePass } from './passes/SpritePass';
import { createCameraUBO, updateCameraUBO } from './CameraUBO';

export class UnifiedSceneRendererGL {
  private readonly gl: WebGL2RenderingContext;

  private readonly lightingPass: LightingPass;
  private readonly entityPass: EntityPass;
  private readonly spritePass: SpritePass;
  private readonly particlePass: ParticlePass;

  private readonly cameraUBO: WebGLBuffer;

  private readonly onResolutionChanged: (payload: EventTypes['resolution:changed']) => void;

  // === Persistent sprite batching structures ===
  private readonly spriteGroups: Map<WebGLTexture, SpriteInstance[]> = new Map();
  private readonly clearedTextures: WebGLTexture[] = [];

  constructor(camera: Camera, private readonly inputManager: InputManager) {
    const canvasManager = CanvasManager.getInstance();
    this.gl = canvasManager.getWebGL2Context('unifiedgl2');

    // === Shared camera UBO ===
    this.cameraUBO = createCameraUBO(this.gl);
    this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, 0, this.cameraUBO);

    // === Render passes ===
    this.lightingPass = new LightingPass(this.gl, this.cameraUBO);
    this.entityPass = new EntityPass(this.gl, this.inputManager); // doesn't use UBO
    this.spritePass = new SpritePass(this.gl, this.cameraUBO);
    this.particlePass = new ParticlePass(this.gl, this.cameraUBO);

    this.onResolutionChanged = () => {
      this.lightingPass.resize();
    };

    GlobalEventBus.on('resolution:changed', this.onResolutionChanged);
  }

  render(
    camera: Camera,
    ships: Ship[],
    lights: AnyLightInstance[],
    sprites: SpriteRenderRequest[],
    particles: Particle[]
  ): void {
    const gl = this.gl;

    // === Phase 1: Update camera matrices UBO ===
    updateCameraUBO(gl, this.cameraUBO, camera);

    // === Phase 2: Clear canvas ===
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // === Phase 3: Light buffer rendering ===
    const lightTexture = this.lightingPass.generateLightBuffer(lights, camera);

    // === Phase 4: Render ships/entities ===
    const ambientLight = this.lightingPass.getAmbientLight();
    this.entityPass.setAmbientLight(ambientLight);
    this.entityPass.render(ships, lightTexture, camera);

    // === Phase 5: Clear previous sprite data and batch current sprites ===
    // Clear all existing sprite groups first
    for (const group of this.spriteGroups.values()) {
      group.length = 0;
    }
    this.clearedTextures.length = 0;

    // Now add current frame's sprites
    for (const sprite of sprites) {
      const texture = sprite.texture;
      let group = this.spriteGroups.get(texture);
      if (!group) {
        group = [];
        this.spriteGroups.set(texture, group);
      }
      group.push({
        worldX: sprite.worldX,
        worldY: sprite.worldY,
        widthPx: sprite.widthPx,
        heightPx: sprite.heightPx,
        alpha: sprite.alpha ?? 1.0,
      });
    }

    // Render batched sprites
    for (const [texture, group] of this.spriteGroups) {
      if (group.length > 0) {
        this.spritePass.renderBatch(texture, group);
      }
    }

    // === Phase 6: Render particles ===
    this.particlePass.render(particles, camera);

    // === Phase 7: Composite visible light halos ===
    this.lightingPass.compositeLightingOverScene();
  }

  getLightingPass(): LightingPass {
    return this.lightingPass;
  }

  getEntityPass(): EntityPass {
    return this.entityPass;
  }

  getSpritePass(): SpritePass {
    return this.spritePass;
  }

  getParticlePass(): ParticlePass {
    return this.particlePass;
  }

  setAmbientLight(value: [number, number, number]): void {
    this.lightingPass.setAmbientLight(value);
  }

  resize(): void {
    this.lightingPass.resize();
  }

  destroy(): void {
    this.gl.deleteBuffer(this.cameraUBO);
    this.lightingPass.destroy();
    this.entityPass.destroy();
    this.spritePass.destroy();
    this.particlePass.destroy();
    GlobalEventBus.off('resolution:changed', this.onResolutionChanged);
  }
}
