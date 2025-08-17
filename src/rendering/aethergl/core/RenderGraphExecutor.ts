// src/rendering/aethergl/core/RenderGraphExecutor.ts

import type { ResourceRef, RenderPass, PassContext } from './interfaces';
import { ResourceManager } from './ResourceManager';

export class RenderGraphExecutor {
  constructor(
    private gl: WebGL2RenderingContext,
    private rm: ResourceManager,
    private passes: RenderPass[],
    private present: ResourceRef | 'default',
    private ubos: Map<number, WebGLBuffer>
  ) {}
  setupAll(ctx: PassContext) { for (const p of this.passes) p.setup(ctx); }
  render(ctx: PassContext) { for (const p of this.passes) p.render(ctx); }
  resize(ctx: PassContext, w: number, h: number) { for (const p of this.passes) p.resize?.(ctx,w,h); }
  destroy(ctx: PassContext) { for (const p of this.passes.reverse()) p.destroy?.(ctx); }
}
