import type { Camera } from '@/core/Camera';
import type { AnyLightInstance } from '@/lighting/lights/types';
import type { Particle } from '@/systems/fx/interfaces/Particle';
import type { Ship } from '@/game/ship/Ship';
import type { InputManager } from '@/core/InputManager';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';

import type { PlanetSpawnConfig } from '@/game/missions/types/MissionDefinition';
import type { PlanetInstance } from '@/rendering/unified/passes/PlanetPass';

import { CanvasManager } from '@/core/CanvasManager';
import { GlobalEventBus } from '@/core/EventBus';

import type { SpriteRenderRequest } from '@/rendering/unified/interfaces/SpriteRenderRequest';
import type { SpriteInstance } from '@/rendering/unified/passes/SpritePass';

import { BackgroundPass } from '@/rendering/unified/passes/BackgroundPass';
import { PlanetPass } from '@/rendering/unified/passes/PlanetPass';
import { LightingPass } from '@/rendering/unified/passes/LightingPass';
import { EntityPass } from '@/rendering/unified/passes/EntityPass';
import { ParticlePass } from '@/rendering/unified/passes/ParticlePass';
import { SpritePass } from '@/rendering/unified/passes/SpritePass';
import { PostProcessPass, type PostEffectName, type CinematicGradingParams } from '@/rendering/unified/passes/PostProcessPass';
import { createCameraUBO, updateCameraUBO } from '@/rendering/unified/CameraUBO';

export class UnifiedSceneRendererGL {
  private readonly gl: WebGL2RenderingContext;

  private readonly backgroundPass: BackgroundPass;
  private readonly planetPass: PlanetPass;
  private readonly lightingPass: LightingPass;
  private readonly entityPass: EntityPass;
  private readonly spritePass: SpritePass;
  private readonly particlePass: ParticlePass;
  private readonly postProcessPass: PostProcessPass;

  private readonly cameraUBO: WebGLBuffer;

  private readonly spriteGroups: Map<WebGLTexture, SpriteInstance[]> = new Map();
  private readonly clearedTextures: WebGLTexture[] = [];

  // REFACTORED: Now stores both effect name and optional params
  private readonly postProcessEffects: Map<PostEffectName, CinematicGradingParams | undefined> = new Map();

  private backgroundImageId: string | null = null;

  private sceneFramebuffer: WebGLFramebuffer;
  private sceneTexture: WebGLTexture;

  constructor(camera: Camera, private readonly inputManager: InputManager) {
    const canvasManager = CanvasManager.getInstance();
    this.gl = canvasManager.getWebGL2Context('unifiedgl2');

    this.cameraUBO = createCameraUBO(this.gl);
    this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, 0, this.cameraUBO);

    this.backgroundPass = new BackgroundPass(this.gl);
    this.planetPass = new PlanetPass(this.gl);
    this.lightingPass = new LightingPass(this.gl, this.cameraUBO);
    this.entityPass = new EntityPass(this.gl, this.inputManager);
    this.spritePass = new SpritePass(this.gl, this.cameraUBO);
    this.particlePass = new ParticlePass(this.gl, this.cameraUBO);
    this.postProcessPass = new PostProcessPass(this.gl, this.gl.canvas.width, this.gl.canvas.height);

    this.sceneFramebuffer = this.gl.createFramebuffer()!;
    this.sceneTexture = this.gl.createTexture()!;
    this.initializeSceneFramebuffer();

    GlobalEventBus.on('resolution:changed', this.onResolutionChanged);
    GlobalEventBus.on('postprocess:effect:set', this.onPostProcessEffectsSet);
    GlobalEventBus.on('postprocess:effect:add', this.onPostProcessEffectAdd);
    GlobalEventBus.on('postprocess:effect:remove', this.onPostProcessEffectRemove);
    GlobalEventBus.on('postprocess:effect:clear', this.onPostProcessEffectClear);
  }

  private readonly onResolutionChanged = (): void => {
    this.initializeSceneFramebuffer();
    this.lightingPass.resize();
  };

  // REFACTORED: Accepts effect chain with params
  private readonly onPostProcessEffectsSet = (payload: {
    effectChain: { effect: PostEffectName; params?: CinematicGradingParams }[];
  }): void => {
    if (Array.isArray(payload.effectChain)) {
      this.setPostProcessEffects(payload.effectChain);
    } else {
      console.warn('[Renderer] Ignoring malformed postprocess effectChain payload:', payload);
    }
  };

  private readonly onPostProcessEffectAdd = (payload: {
    effect: PostEffectName;
    params?: CinematicGradingParams;
  }): void => {
    this.addPostProcessEffect(payload.effect, payload.params);
  };

  private readonly onPostProcessEffectRemove = (payload: { effect: PostEffectName }): void => {
    this.removePostProcessEffect(payload.effect);
  };

  private readonly onPostProcessEffectClear = (): void => {
    this.clearPostProcessEffects();
  };

  private initializeSceneFramebuffer(): void {
    const gl = this.gl;

    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;

    gl.bindTexture(gl.TEXTURE_2D, this.sceneTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.sceneTexture, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  render(
    camera: Camera,
    ships: CompositeBlockObject[],
    lights: AnyLightInstance[],
    sprites: SpriteRenderRequest[],
    particles: Particle[]
  ): void {
    const gl = this.gl;

    updateCameraUBO(gl, this.cameraUBO, camera);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFramebuffer);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.backgroundPass.render(camera.getOffset());
    this.planetPass.renderAll();

    const lightTexture = this.lightingPass.generateLightBuffer(lights, camera);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFramebuffer);

    const ambientLight = this.lightingPass.getAmbientLight();
    this.entityPass.setAmbientLight(ambientLight);
    this.entityPass.render(ships, lightTexture, camera);

    for (const group of this.spriteGroups.values()) {
      group.length = 0;
    }
    this.clearedTextures.length = 0;

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
        rotation: sprite.rotation ?? 0,
      });
    }

    for (const [texture, group] of this.spriteGroups) {
      if (group.length > 0) {
        this.spritePass.renderBatch(texture, group);
      }
    }

    this.particlePass.render(particles, camera);
    this.lightingPass.compositeLightingOverTarget(this.sceneFramebuffer);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // REFACTORED: Pass effect+param chain
    const effectChain = Array.from(this.postProcessEffects.entries()).map(
      ([effect, params]) => ({ effect, params })
    );
    this.postProcessPass.run(this.sceneTexture, effectChain);
  }

  resize(): void {
    this.initializeSceneFramebuffer();
    this.lightingPass.resize();
  }

  destroy(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.cameraUBO);
    gl.deleteFramebuffer(this.sceneFramebuffer);
    gl.deleteTexture(this.sceneTexture);

    this.backgroundPass.destroy();
    this.lightingPass.destroy();
    this.entityPass.destroy();
    this.spritePass.destroy();
    this.particlePass.destroy();
    this.postProcessPass.destroy();

    GlobalEventBus.off('resolution:changed', this.onResolutionChanged);
    GlobalEventBus.off('postprocess:effect:set', this.onPostProcessEffectsSet);
    GlobalEventBus.off('postprocess:effect:add', this.onPostProcessEffectAdd);
    GlobalEventBus.off('postprocess:effect:remove', this.onPostProcessEffectRemove);
    GlobalEventBus.off('postprocess:effect:clear', this.onPostProcessEffectClear);
  }

  // === Postprocessing API ===

  public setPostProcessEffects(effects: { effect: PostEffectName; params?: CinematicGradingParams }[]): void {
    this.postProcessEffects.clear();
    for (const { effect, params } of effects) {
      this.postProcessEffects.set(effect, params);
    }
  }

  public addPostProcessEffect(effect: PostEffectName, params?: CinematicGradingParams): void {
    this.postProcessEffects.set(effect, params);
  }

  public removePostProcessEffect(effect: PostEffectName): void {
    this.postProcessEffects.delete(effect);
  }

  public clearPostProcessEffects(): void {
    this.postProcessEffects.clear();
  }

  public setBackgroundImage(imageId: string | null): void {
    this.backgroundImageId = imageId;
    this.backgroundPass.loadImage(imageId ?? '');
  }

  public addPlanet(config: PlanetSpawnConfig, scale: number, imagePath: string): void {
    console.log('[UnifiedSceneRendererGL] Adding planet:', config);
    this.planetPass.addPlanet(config, scale, imagePath);
  }

  public setAmbientLight(value: [number, number, number]): void {
    this.lightingPass.setAmbientLight(value);
  }

  public getLightingPass(): LightingPass {
    return this.lightingPass;
  }

  public getEntityPass(): EntityPass {
    return this.entityPass;
  }

  public getSpritePass(): SpritePass {
    return this.spritePass;
  }

  public getParticlePass(): ParticlePass {
    return this.particlePass;
  }

  public getPostProcessPass(): PostProcessPass {
    return this.postProcessPass;
  }
}