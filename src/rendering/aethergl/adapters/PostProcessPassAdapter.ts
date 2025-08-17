// src/rendering/aethergl/adapters/PostProcessPassAdapter.ts

import { PostProcessPass } from '../passes/PostProcessPass';

export function createPostProcessAdapter(): PassCtor {
  return ({ id, params }) => {
    let impl: PostProcessPass;
    return {
      id, kind: 'PostProcessPass',
      reads: ['sceneTexA'], writes: [], target: null,
      setup(ctx) { impl = new PostProcessPass(ctx.gl, ctx.gl.drawingBufferWidth, ctx.gl.drawingBufferHeight); },
      render(ctx) {
        const chain = (params?.chain as any[]) ?? ctx.getParam<any[]>('frame.postChain') ?? [];
        const inputTex = ctx.getTex('sceneTexA');
        impl.run(inputTex, chain, null); // null = default framebuffer
      },
      resize(ctx,w,h){ /* if you choose to add resize() to PostProcessPass, call it here */ },
      destroy(){ impl.destroy(); }
    };
  };
}
