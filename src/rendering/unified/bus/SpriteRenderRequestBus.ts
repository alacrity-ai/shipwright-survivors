// src/rendering/unified/SpriteRenderRequestBus.ts

import type { SpriteRenderRequest } from '@/rendering/unified/interfaces/SpriteRenderRequest';

class SpriteRenderRequestBus {
  private requests: SpriteRenderRequest[] = [];

  add(request: SpriteRenderRequest): void {
    this.requests.push(request);
  }

  addMany(requests: SpriteRenderRequest[]): void {
    this.requests.push(...requests);
  }

  getAndClear(): SpriteRenderRequest[] {
    const current = this.requests;
    this.requests = []; // GC-free if re-used
    return current;
  }

  clear(): void {
    this.requests = [];
  }
}

export const GlobalSpriteRequestBus = new SpriteRenderRequestBus();
