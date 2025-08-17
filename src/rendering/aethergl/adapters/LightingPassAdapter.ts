// src/rendering/aethergl/adapters/LightingPassAdapter.ts

import { LightingPass } from '../passes/LightingPass';

export function createLightingAdapter(): PassCtor {
  return ({ id, params }) => {
    let impl: LightingPass;
    return {
      id, kind: 'LightingPass',
      reads: [], writes: ['lightTex'], target: 'lightFbo',
      setup(ctx) {
        const cameraUBO = ctx.getUBO(0)!; // already created by AetherGLRenderer
        impl = new LightingPass(ctx.gl, cameraUBO);
        if (typeof params?.resolutionScale === 'number') {
          impl.setResolutionScale(params.resolutionScale);
        }
      },
      render(ctx) {
        const v = ctx.getParam<any>('frame.visibleLights');
        const cam = ctx.getParam<any>('frame.camera');
        const tex = impl.generateLightBuffer(v, cam);
        // tex is bound to lightTex via ResourceManager; no extra blit needed
      },
      resize(){ impl.resize(); },
      destroy(){ impl.destroy(); }
    };
  };
}
