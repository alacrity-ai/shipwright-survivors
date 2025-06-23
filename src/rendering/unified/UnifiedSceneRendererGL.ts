// src/rendering/unified/UnifiedSceneRendererGL.ts

import type { Camera } from '@/core/Camera';
import type { AnyLightInstance } from '@/lighting/lights/types';
import type { Particle } from '@/systems/fx/interfaces/Particle';
import type { InputManager } from '@/core/InputManager';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';

import type { PlanetSpawnConfig } from '@/game/missions/types/MissionDefinition';

import { CanvasManager } from '@/core/CanvasManager';
import { GlobalEventBus } from '@/core/EventBus';

import type { SpriteRenderRequest } from '@/rendering/unified/interfaces/SpriteRenderRequest';
import type { SpriteInstance } from '@/rendering/unified/passes/SpritePass';
import { createCameraUBO, updateCameraUBO } from '@/rendering/unified/CameraUBO';

import { BackgroundPass } from '@/rendering/unified/passes/BackgroundPass';
import { PlanetPass } from '@/rendering/unified/passes/PlanetPass';
import { LightingPass } from '@/rendering/unified/passes/LightingPass';
import { EntityPass } from '@/rendering/unified/passes/EntityPass';
import { ParticlePass } from '@/rendering/unified/passes/ParticlePass';
import { SpritePass } from '@/rendering/unified/passes/SpritePass';
import {
  PostProcessPass,
  type PostEffectName,
  type CinematicGradingParams,
  type UnderwaterParams
} from '@/rendering/unified/passes/PostProcessPass';

import { SpecialFxPass } from '@/rendering/unified/passes/SpecialFxPass';
import type { SpecialFxInstance } from '@/rendering/unified/interfaces/SpecialFxInstance';
import { SpecialFxController } from '@/rendering/unified/controllers/SpecialFxController';

type EffectParams = CinematicGradingParams | UnderwaterParams | undefined;

export class UnifiedSceneRendererGL {
  private readonly gl: WebGL2RenderingContext;

  private readonly backgroundPass: BackgroundPass;
  private readonly planetPass: PlanetPass;
  private readonly lightingPass: LightingPass;
  private readonly entityPass: EntityPass;
  private readonly spritePass: SpritePass;
  private readonly particlePass: ParticlePass;
  private readonly postProcessPass: PostProcessPass;
  private readonly backgroundPostProcessPass: PostProcessPass;

  private sceneFramebufferFX: WebGLFramebuffer;
  private sceneTextureFX: WebGLTexture;

  private readonly cameraUBO: WebGLBuffer;

  private readonly spriteGroups: Map<WebGLTexture, SpriteInstance[]> = new Map();
  private readonly clearedTextures: WebGLTexture[] = [];

  private readonly postProcessEffects: Map<PostEffectName, EffectParams> = new Map();
  private readonly backgroundPostProcessEffects: Map<PostEffectName, EffectParams> = new Map();

  private backgroundImageId: string | null = null;

  private sceneFramebuffer: WebGLFramebuffer;
  private sceneTexture: WebGLTexture;
  
  private backgroundFramebuffer: WebGLFramebuffer;
  private backgroundTexture: WebGLTexture;

  private readonly specialFxPass: SpecialFxPass;
  private readonly specialFxController: SpecialFxController = new SpecialFxController();

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
    this.specialFxPass = new SpecialFxPass(this.gl, this.cameraUBO);
    this.particlePass = new ParticlePass(this.gl, this.cameraUBO);
    this.postProcessPass = new PostProcessPass(this.gl, this.gl.canvas.width, this.gl.canvas.height);
    this.backgroundPostProcessPass = new PostProcessPass(this.gl, this.gl.canvas.width, this.gl.canvas.height);

    this.sceneFramebuffer = this.gl.createFramebuffer()!;
    this.sceneTexture = this.gl.createTexture()!;
    this.backgroundFramebuffer = this.gl.createFramebuffer()!;
    this.backgroundTexture = this.gl.createTexture()!;
    
    this.sceneFramebufferFX = this.gl.createFramebuffer()!;
    this.sceneTextureFX = this.gl.createTexture()!;

    this.initializeFramebuffers();

    GlobalEventBus.on('resolution:changed', this.onResolutionChanged);
    GlobalEventBus.on('postprocess:effect:set', this.onPostProcessEffectsSet);
    GlobalEventBus.on('postprocess:effect:add', this.onPostProcessEffectAdd);
    GlobalEventBus.on('postprocess:effect:remove', this.onPostProcessEffectRemove);
    GlobalEventBus.on('postprocess:effect:clear', this.onPostProcessEffectClear);
    
    // Background post-process events
    GlobalEventBus.on('postprocess:background:effect:set', this.onBackgroundPostProcessEffectsSet);
    GlobalEventBus.on('postprocess:background:effect:add', this.onBackgroundPostProcessEffectAdd);
    GlobalEventBus.on('postprocess:background:effect:remove', this.onBackgroundPostProcessEffectRemove);
    GlobalEventBus.on('postprocess:background:effect:clear', this.onBackgroundPostProcessEffectClear);
  }

  private readonly onResolutionChanged = (): void => {
    this.initializeFramebuffers();
    this.lightingPass.resize();
  };

  // Main post-process event handlers
  private readonly onPostProcessEffectsSet = (payload: {
    effectChain: { effect: PostEffectName; params?: EffectParams }[];
  }): void => {
    if (Array.isArray(payload.effectChain)) {
      this.setPostProcessEffects(payload.effectChain);
    } else {
      console.warn('[Renderer] Ignoring malformed postprocess effectChain payload:', payload);
    }
  };

  private readonly onPostProcessEffectAdd = (payload: {
    effect: PostEffectName;
    params?: EffectParams;
  }): void => {
    this.addPostProcessEffect(payload.effect, payload.params);
  };

  private readonly onPostProcessEffectRemove = (payload: { effect: PostEffectName }): void => {
    this.removePostProcessEffect(payload.effect);
  };

  private readonly onPostProcessEffectClear = (): void => {
    this.clearPostProcessEffects();
  };

  // Background post-process event handlers
  private readonly onBackgroundPostProcessEffectsSet = (payload: {
    effectChain: { effect: PostEffectName; params?: EffectParams }[];
  }): void => {
    if (Array.isArray(payload.effectChain)) {
      this.setBackgroundPostProcessEffects(payload.effectChain);
    } else {
      console.warn('[Renderer] Ignoring malformed background postprocess effectChain payload:', payload);
    }
  };

  private readonly onBackgroundPostProcessEffectAdd = (payload: {
    effect: PostEffectName;
    params?: EffectParams;
  }): void => {
    this.addBackgroundPostProcessEffect(payload.effect, payload.params);
  };

  private readonly onBackgroundPostProcessEffectRemove = (payload: { effect: PostEffectName }): void => {
    this.removeBackgroundPostProcessEffect(payload.effect);
  };

  private readonly onBackgroundPostProcessEffectClear = (): void => {
    this.clearBackgroundPostProcessEffects();
  };

  private initializeFramebuffers(): void {
    const gl = this.gl;
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;

    // === Scene Texture A ===
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.sceneTexture, 0);

    // === Scene Texture B (FX ping-pong target) ===
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTextureFX);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFramebufferFX);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.sceneTextureFX, 0);

    // === Background framebuffer ===
    gl.bindTexture(gl.TEXTURE_2D, this.backgroundTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.backgroundFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.backgroundTexture, 0);

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

    // === Step 1: Update camera matrices ===
    updateCameraUBO(gl, this.cameraUBO, camera);

    // === Step 2: Render background to background framebuffer ===
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.backgroundFramebuffer);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.backgroundPass.render(camera.getOffset());

    // === Step 3: Apply background post-processing ===
    const backgroundEffectChain = Array.from(this.backgroundPostProcessEffects.entries()).map(
      ([effect, params]) => ({ effect, params })
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFramebuffer);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.backgroundPostProcessPass.run(
      this.backgroundTexture,
      backgroundEffectChain,
      this.sceneFramebuffer
    );

    // === Step 4: Render planets atop processed background ===
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFramebuffer);
    this.planetPass.renderAll();

    // === Step 5: Generate light buffer (offscreen) ===
    const lightTexture = this.lightingPass.generateLightBuffer(lights, camera);

    // === Step 6: Render entities ===
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFramebuffer); // Light was rendering to offscreen FB, so we needed to rebind before going to the next
    const ambientLight = this.lightingPass.getAmbientLight();
    this.entityPass.setAmbientLight(ambientLight);
    this.entityPass.render(ships, lightTexture, camera);

    // === Step 7: Render batched sprites ===
    for (const group of this.spriteGroups.values()) group.length = 0;
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

    // === Step 8: Render particles ===
    this.particlePass.render(particles, camera);

    // === Step 9: Apply ripple/distortion FX (sceneTexture → sceneFramebufferFX)
    const activeFx = this.specialFxController.getActiveFx();
    if (activeFx.length > 0) {
      this.specialFxPass.run(this.sceneTexture, activeFx, this.sceneFramebufferFX, this.cameraUBO);

      // Swap textures and framebuffers: FX result becomes the new scene texture
      const tmpTex = this.sceneTexture;
      const tmpFbo = this.sceneFramebuffer;
      this.sceneTexture = this.sceneTextureFX;
      this.sceneFramebuffer = this.sceneFramebufferFX;
      this.sceneTextureFX = tmpTex;
      this.sceneFramebufferFX = tmpFbo;
    }

    // === Step 10: Apply screen-space post-process effects to default framebuffer ===
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const effectChain = Array.from(this.postProcessEffects.entries()).map(
      ([effect, params]) => ({ effect, params })
    );
    this.postProcessPass.run(this.sceneTexture, effectChain);

    // === Step 11: Composite additive lighting effects (e.g. halos) over final image ===
    this.lightingPass.compositeLightingOverTarget(null);
  }

  public update(deltaSeconds: number): void {
    this.specialFxController.update(deltaSeconds);
  }

  resize(): void {
    this.initializeFramebuffers();
    this.lightingPass.resize();
  }

  destroy(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.cameraUBO);
    gl.deleteFramebuffer(this.sceneFramebuffer);
    gl.deleteTexture(this.sceneTexture);
    gl.deleteFramebuffer(this.backgroundFramebuffer);
    gl.deleteTexture(this.backgroundTexture);

    this.backgroundPass.destroy();
    this.lightingPass.destroy();
    this.entityPass.destroy();
    this.spritePass.destroy();
    this.particlePass.destroy();
    this.postProcessPass.destroy();
    this.backgroundPostProcessPass.destroy();
    this.specialFxPass.destroy();
    this.specialFxController.destroy();

    GlobalEventBus.off('resolution:changed', this.onResolutionChanged);
    GlobalEventBus.off('postprocess:effect:set', this.onPostProcessEffectsSet);
    GlobalEventBus.off('postprocess:effect:add', this.onPostProcessEffectAdd);
    GlobalEventBus.off('postprocess:effect:remove', this.onPostProcessEffectRemove);
    GlobalEventBus.off('postprocess:effect:clear', this.onPostProcessEffectClear);
    GlobalEventBus.off('postprocess:background:effect:set', this.onBackgroundPostProcessEffectsSet);
    GlobalEventBus.off('postprocess:background:effect:add', this.onBackgroundPostProcessEffectAdd);
    GlobalEventBus.off('postprocess:background:effect:remove', this.onBackgroundPostProcessEffectRemove);
    GlobalEventBus.off('postprocess:background:effect:clear', this.onBackgroundPostProcessEffectClear);
  }

  // === Main Postprocessing API ===
  public setPostProcessEffects(effects: { effect: PostEffectName; params?: EffectParams }[]): void {
    this.postProcessEffects.clear();
    for (const { effect, params } of effects) {
      this.postProcessEffects.set(effect, params);
    }
  }

  public addPostProcessEffect(effect: PostEffectName, params?: EffectParams): void {
    this.postProcessEffects.set(effect, params);
  }

  public removePostProcessEffect(effect: PostEffectName): void {
    this.postProcessEffects.delete(effect);
  }

  public clearPostProcessEffects(): void {
    this.postProcessEffects.clear();
  }

  // === Background Postprocessing API ===
  public setBackgroundPostProcessEffects(effects: { effect: PostEffectName; params?: EffectParams }[]): void {
    this.backgroundPostProcessEffects.clear();
    for (const { effect, params } of effects) {
      this.backgroundPostProcessEffects.set(effect, params);
    }
  }

  public addBackgroundPostProcessEffect(effect: PostEffectName, params?: EffectParams): void {
    this.backgroundPostProcessEffects.set(effect, params);
  }

  public removeBackgroundPostProcessEffect(effect: PostEffectName): void {
    this.backgroundPostProcessEffects.delete(effect);
  }

  public clearBackgroundPostProcessEffects(): void {
    this.backgroundPostProcessEffects.clear();
  }

  // === Other API methods ===
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

  public getSpecialFxController(): SpecialFxController {
    return this.specialFxController;
  }

  public getPostProcessPass(): PostProcessPass {
    return this.postProcessPass;
  }

  public getBackgroundPostProcessPass(): PostProcessPass {
    return this.backgroundPostProcessPass;
  }
}