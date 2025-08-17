// src/rendering/unified/SpriteRenderRequestBus.ts

import type { SpriteRenderRequest } from '@/rendering/unified/interfaces/SpriteRenderRequest';

class SpriteRenderRequestBus {
  private requests: SpriteRenderRequest[] = [];
  private pool: SpriteRenderRequest[] = []; // Reuse old request objects

  add(request: SpriteRenderRequest): void {
    // Reuse a pooled object instead of allocating a fresh one
    const pooled = this.pool.pop() || ({} as SpriteRenderRequest);

    // Copy fields (preserve shape for JIT optimizations)
    pooled.texture = request.texture;
    pooled.worldX = request.worldX;
    pooled.worldY = request.worldY;
    pooled.widthPx = request.widthPx;
    pooled.heightPx = request.heightPx;
    pooled.alpha = request.alpha;
    pooled.rotation = request.rotation;

    this.requests.push(pooled);
  }

  addMany(requests: SpriteRenderRequest[]): void {
    for (let i = 0; i < requests.length; i++) {
      this.add(requests[i]); // Will automatically use pool
    }
  }

  getAndClear(): SpriteRenderRequest[] {
    const current = this.requests;
    this.requests = []; // Avoid reallocation by reusing array
    this.pool.push(...current); // Recycle all requests
    return current;
  }

  clear(): void {
    this.pool.push(...this.requests);
    this.requests.length = 0;
  }
}

export const GlobalSpriteRequestBus = new SpriteRenderRequestBus();
