// src/rendering/aethergl/AetherGLRenderer.ts

// AetherGLRenderer.ts
import { PipelineFactory } from './core/PipelineFactory';
import { PassRegistry } from './core/PassRegistry';
import { ParamStore } from './core/ParamStore';
import baseline from './schema/examples/baseline.pipeline.json';
import { registerAllAdapters } from './adapters/registerAllAdapters';
import { attachParams } from './core/PassContext';
import { createCameraUBO, updateCameraUBO } from './CameraUBO';
import { CanvasManager } from '@/core/CanvasManager';
import type { Camera } from '@/core/Camera';
import type { SpriteRenderRequest } from '@/rendering/unified/interfaces/SpriteRenderRequest';
import type { ParticleSOA } from '@/systems/fx/ParticleManager';
import type { LightSOA } from '@/lighting/interfaces/LightSOA';
import type { LightningSegment } from '@/rendering/unified/passes/fx/LightningPass';
import type { FireSOA } from '@/rendering/unified/passes/fx/FirePass';
import type { ShockwaveSOA } from '@/systems/fx/ShockwaveManager';
import type { DamageTextSOA } from '@/systems/damagetext/interfaces/DamageTextSOA';
import type { CanvasLayer } from '@/core/CanvasManager';

export class AetherGLRenderer {
  private gl: WebGL2RenderingContext;
  private params = new ParamStore();
  private registry = new PassRegistry();
  private factory: PipelineFactory;
  private executor!: ReturnType<PipelineFactory['create']>;

  private cameraUBO!: WebGLBuffer;
  private lightUBO?: WebGLBuffer;

  constructor(private canvasKey: CanvasLayer = 'unifiedgl2') {
    const cm = CanvasManager.getInstance();
    this.gl = cm.getWebGL2Context(canvasKey);
    this.factory = new PipelineFactory(this.gl, this.registry);

    // 1) Register adapters (do this once at startup)
    registerAllAdapters(this.registry);

    // 2) Create UBOs equivalent to your current binding points
    this.cameraUBO = createCameraUBO(this.gl);
    // (If you also keep a light UBO ref, add it.)

    // 3) Build baseline pipeline
    this.executor = this.factory.create(baseline);
    // Inject UBO handles into PassContext (inside makePassContext)
    // Bind camera UBO to binding=0 for all passes:
    this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, 0, this.cameraUBO);
  }

  render(
    dt: number,
    camera: Camera,
    visibleLights: { soa: LightSOA; indices: Uint16Array; count: number },
    sprites: SpriteRenderRequest[],
    particleSOAs: ParticleSOA[],
    lightningSegments: LightningSegment[],
    fireSOA: FireSOA,
    shockwaveSOA: ShockwaveSOA,
    damageTextSOA: DamageTextSOA
  ): void {
    // 1) Update shared UBOs
    updateCameraUBO(this.gl, this.cameraUBO, camera);

    // 2) Populate per-frame params (replacing the old bus)
    this.params.clear();
    this.params.set('frame.camera', camera);
    this.params.set('frame.cameraOffset', camera.getLogicalOffset());
    this.params.set('frame.visibleLights', visibleLights);
    this.params.set('frame.sprites', sprites);
    this.params.set('frame.particles', particleSOAs);
    this.params.set('frame.lightning', lightningSegments);
    this.params.set('frame.fireSOA', fireSOA);
    this.params.set('frame.shockwaveSOA', shockwaveSOA);
    this.params.set('frame.damageTextSOA', damageTextSOA);
    // Optional: 'frame.postChain' if you drive postprocess here.

    // 3) Execute graph
    this.executor.ctx = attachParams(this.executor.ctx, this.params); // shallow wrapper or replace getParam
    this.executor.executor.render(this.executor.ctx);
  }

  resize(): void {
    const w = this.gl.drawingBufferWidth;
    const h = this.gl.drawingBufferHeight;
    this.executor.executor.resize(this.executor.ctx, w, h);
  }

  destroy(): void {
    this.executor.executor.destroy(this.executor.ctx);
    this.gl.deleteBuffer(this.cameraUBO);
  }
}
