// src/rendering/aethergl/core/PipelineFactory.ts

import { PassRegistry } from './PassRegistry';
import { ResourceManager } from './ResourceManager';
import { RenderGraphExecutor } from './RenderGraphExecutor';
import { validateGraph } from './graphValidation';
import { makePassContext } from './PassContext';
import { z } from 'zod'; // schema/pipeline.schema.ts defines ZodPipeline

export class PipelineFactory {
  constructor(private gl: WebGL2RenderingContext, private reg: PassRegistry) {}
  create(cfgRaw: unknown) {
    const cfg = ZodPipeline.parse(cfgRaw);        // validate once
    const rm  = new ResourceManager(this.gl);
    const ubos = new Map<number, WebGLBuffer>();  // Camera@0, Light@2 if provided

    // allocate resources per cfg.resources (textures/FBOs)
    // instantiate passes via registry
    const passes = cfg.passes.map(p => this.reg.create(p.kind, p.id, p.params));

    // topological validation (resources produced before consumed)
    validateGraph(cfg, passes); // throw with helpful errors

    // create PassContext object bound to rm + ubos + params
    const ctx = makePassContext(this.gl, rm, ubos);

    const executor = new RenderGraphExecutor(this.gl, rm, passes, cfg.outputs.present, ubos);
    executor.setupAll(ctx);
    return { executor, ctx, rm, ubos, cfg };
  }
}
