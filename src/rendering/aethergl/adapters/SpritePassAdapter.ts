// src/rendering/aethergl/adapters/SpritePassAdapter.ts

import { SpritePass } from '../passes/SpritePass';

export function createSpriteAdapter(): PassCtor {
  return ({ id }) => {
    let impl: SpritePass;
    return {
      id, kind: 'SpritePass',
      reads: ['sceneTexA'], writes: ['sceneTexA'], target: 'sceneFboA',
      setup(ctx) {
        const cameraUBO = ctx.getUBO(0)!;
        impl = new SpritePass(ctx.gl, cameraUBO);
      },
      render(ctx) {
        const sprites = ctx.getParam<any[]>('frame.sprites') ?? [];
        // impl.renderBatch by texture is inside current pass, so just forward batches
        // If needed, group here and call impl.renderBatch per texture.
        // Or keep your existing grouping in the adapter.
        // This adapter can access the same GlobalEventBus-driven textures you already cache.
        // For parity: reuse the same sprite data shape.
        // (Omitted for brevity; follow current UnifiedSceneRendererGL batching.)
      },
      destroy(){ impl.destroy(); }
    };
  };
}
