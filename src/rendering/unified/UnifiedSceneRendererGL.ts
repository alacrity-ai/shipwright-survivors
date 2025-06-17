import type { Camera } from '@/core/Camera';
import type { AnyLightInstance } from '@/lighting/lights/types';
import type { Particle } from '@/systems/fx/interfaces/Particle';
import type { Ship } from '@/game/ship/Ship';
import type { InputManager } from '@/core/InputManager';

import { CanvasManager } from '@/core/CanvasManager';

import { GlobalEventBus } from '@/core/EventBus';
import type { EventTypes } from '@/core/interfaces/EventTypes';

import { LightingPass } from './passes/LightingPass';
import { EntityPass } from './passes/EntityPass';
import { ParticlePass } from './passes/ParticlePass';
import { createCameraUBO, updateCameraUBO } from './CameraUBO';

export class UnifiedSceneRendererGL {
  private readonly gl: WebGL2RenderingContext;

  private readonly lightingPass: LightingPass;
  private readonly entityPass: EntityPass;
  private readonly particlePass: ParticlePass;

  private readonly cameraUBO: WebGLBuffer;

  private readonly onResolutionChanged: (payload: EventTypes['resolution:changed']) => void;


  constructor(camera: Camera, private readonly inputManager: InputManager) {
    const canvasManager = CanvasManager.getInstance();
    this.gl = canvasManager.getWebGL2Context('unifiedgl2');

    // Create shared UBO for camera matrices
    this.cameraUBO = createCameraUBO(this.gl);
    this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, 0, this.cameraUBO);

    // Initialize render passes (each binds to UBO binding index 0)
    this.lightingPass = new LightingPass(this.gl, this.cameraUBO);
    this.entityPass = new EntityPass(this.gl, this.inputManager); // Not taking cameraUBO as argument
    this.particlePass = new ParticlePass(this.gl, this.cameraUBO);

    this.onResolutionChanged = () => {
      this.lightingPass.resize();
    };

    GlobalEventBus.on('resolution:changed', this.onResolutionChanged);
  }

  render(camera: Camera, ships: Ship[], lights: AnyLightInstance[], particles: Particle[]): void {
    const gl = this.gl;

    // === Phase 1: Update UBOs ===
    updateCameraUBO(gl, this.cameraUBO, camera);

    // === Phase 2: Clear the screen ===
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // === Phase 3: Render lighting into offscreen FBO ===
    const lightTexture = this.lightingPass.generateLightBuffer(lights, camera);

    // Inject ambient light into EntityPass
    const ambientLight = this.lightingPass.getAmbientLight();
    this.entityPass.setAmbientLight(ambientLight); // ← this method to be implemented next

    // === Phase 4: Render ships/entities using light texture ===
    this.entityPass.render(ships, lightTexture, camera);

    // === Phase 5: Render particles (e.g. explosions, trails) ===
    this.particlePass.render(particles, camera);

    // === Phase 6: Composite visible halos over the scene ===
    this.lightingPass.compositeLightingOverScene();
  }


  getLightingPass(): LightingPass {
    return this.lightingPass;
  }

  getEntityPass(): EntityPass {
    return this.entityPass;
  }

  getParticlePass(): ParticlePass {
    return this.particlePass;
  }

  resize(): void {
    this.lightingPass.resize();
  }

  destroy(): void {
    this.gl.deleteBuffer(this.cameraUBO);
    this.lightingPass.destroy();
    this.entityPass.destroy();
    this.particlePass.destroy();
    GlobalEventBus.off('resolution:changed', this.onResolutionChanged);
  }
}
