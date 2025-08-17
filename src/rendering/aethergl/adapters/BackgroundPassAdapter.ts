// src/rendering/aethergl/adapters/BackgroundPassAdapter.ts

import { BackgroundPass } from '../passes/BackgroundPass';

export function createBackgroundAdapter(): PassCtor {
  return ({ id }) => {
    let impl: BackgroundPass;
    return {
      id, kind: 'BackgroundPass',
      reads: [], writes: ['backgroundTex'], target: 'backgroundFbo',
      setup(ctx) { impl = new BackgroundPass(ctx.gl); },
      render(ctx) {
        // offset from frame params to mirror current behavior
        const off = ctx.getParam<[number,number]>('frame.cameraOffset') ?? [0,0];
        ctx.gl.bindFramebuffer(ctx.gl.FRAMEBUFFER, ctx.getFbo('backgroundFbo'));
        impl.render({ x: off[0], y: off[1] });
      },
      destroy() { impl.destroy(); }
    };
  };
}
