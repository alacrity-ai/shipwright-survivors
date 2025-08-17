// src/rendering/aethergl/core/PassRegistry.ts

import type { RenderPass } from './interfaces';

export type PassCtor = (spec: {
  id: string; params?: Record<string, unknown>;
}) => RenderPass;

export class PassRegistry {
  private map = new Map<string, PassCtor>();
  register(kind: string, ctor: PassCtor) { this.map.set(kind, ctor); }
  create(kind: string, id: string, params?: Record<string, unknown>) {
    const ctor = this.map.get(kind);
    if (!ctor) throw new Error(`Unknown pass kind: ${kind}`);
    return ctor({ id, params });
  }
}
