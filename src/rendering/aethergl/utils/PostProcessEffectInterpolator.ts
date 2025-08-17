// src/rendering/unified/utils/PostProcessEffectInterpolator.ts

import type { PostEffectName } from '@/rendering/unified/passes/PostProcessPass';
import type { EffectParams } from '@/core/interfaces/EventTypes';

type InterpolatedEffect = {
  effect: PostEffectName;
  from: EffectParams | undefined;
  to: EffectParams | undefined;
};

export class PostProcessEffectInterpolator {
  private startTime = 0;
  private duration = 1.0;
  private active = false;
  private effectList: InterpolatedEffect[] = [];
  private readonly lerpedEffects = new Map<PostEffectName, EffectParams>();
  private onCompleteCallback: (() => void) | null = null;

  public isActive(): boolean {
    return this.active;
  }

  public getLerpedEffects(): Map<PostEffectName, EffectParams> {
    return this.lerpedEffects;
  }

  public startTransition(
    from: Map<PostEffectName, EffectParams>,
    to: Map<PostEffectName, EffectParams>,
    duration: number,
    onComplete?: () => void
  ): void {
    this.duration = duration;
    this.startTime = performance.now() / 1000;
    this.active = true;
    this.onCompleteCallback = onComplete ?? null;

    this.effectList = [];

    const allKeys = new Set<PostEffectName>([
      ...from.keys(),
      ...to.keys(),
    ]);

    for (const key of allKeys) {
      this.effectList.push({
        effect: key,
        from: from.get(key),
        to: to.get(key),
      });
    }
  }

  public update(): void {
    if (!this.active) return;

    const now = performance.now() / 1000;
    const t = Math.min((now - this.startTime) / this.duration, 1);

    this.lerpedEffects.clear();

    for (const entry of this.effectList) {
      if (entry.from === undefined && entry.to === undefined) continue;
      if (entry.from === undefined) {
        this.lerpedEffects.set(entry.effect, entry.to);
        continue;
      }
      if (entry.to === undefined) {
        this.lerpedEffects.set(entry.effect, entry.from);
        continue;
      }

      const result: Record<string, number> = {};
      for (const key of Object.keys(entry.to)) {
        const fromVal = (entry.from as any)[key] ?? 0;
        const toVal = (entry.to as any)[key] ?? 0;
        result[key] = fromVal + (toVal - fromVal) * t;
      }
      this.lerpedEffects.set(entry.effect, result);
    }

    if (t >= 1.0) {
      this.active = false;

      // Invoke the transition finalizer safely
      this.onCompleteCallback?.();
      this.onCompleteCallback = null;
    }
  }
}
