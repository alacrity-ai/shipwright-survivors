// src/rendering/unified/controllers/SpecialFxController.ts

import { GlobalEventBus } from '@/core/EventBus';
import type { SpecialFxInstance } from '@/rendering/unified/interfaces/SpecialFxInstance';

export class SpecialFxController {
  private activeFx: SpecialFxInstance[] = [];

  constructor() {
    GlobalEventBus.on('fx:spawn', this.onFxSpawn);
    GlobalEventBus.on('fx:clear', this.onFxClear);
  }

  destroy(): void {
    GlobalEventBus.off('fx:spawn', this.onFxSpawn);
    GlobalEventBus.off('fx:clear', this.onFxClear);
  }

  update(deltaSeconds: number): void {
    for (const fx of this.activeFx) fx.time += deltaSeconds;
    this.activeFx = this.activeFx.filter(fx => fx.time < fx.duration);
  }

  getActiveFx(): SpecialFxInstance[] {
    return this.activeFx;
  }

  spawnFx(params: Omit<SpecialFxInstance, 'time'>): void {
    this.activeFx.push({ ...params, time: 0 });
  }

  clear(): void {
    this.activeFx.length = 0;
  }

  get count(): number {
    return this.activeFx.length;
  }

  private readonly onFxSpawn = (params: Omit<SpecialFxInstance, 'time'>): void => {
    this.spawnFx(params);
  };

  private readonly onFxClear = (): void => {
    this.clear();
  };
}
