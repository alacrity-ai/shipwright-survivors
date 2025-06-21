// src/core/interfaces/events/PostProcessingEffectReporter.ts

import { GlobalEventBus } from '@/core/EventBus';
import type {
  PostEffectName,
  CinematicGradingParams,
  UnderwaterParams
} from '@/rendering/unified/passes/PostProcessPass';
import type { EventTypes } from '@/core/interfaces/EventTypes';

type EffectParams = CinematicGradingParams | UnderwaterParams | undefined;

function getEventName(base: string, background?: boolean): string {
  return background ? `postprocess:background:${base}` : `postprocess:${base}`;
}

export function setPostProcessEffect(
  effectChain: { effect: PostEffectName; params?: EffectParams }[],
  background?: boolean
): void {
  GlobalEventBus.emit(getEventName('effect:set', background) as keyof EventTypes, { effectChain });
}

export function addPostProcessEffect(
  effect: PostEffectName,
  params?: EffectParams,
  background?: boolean
): void {
  GlobalEventBus.emit(getEventName('effect:add', background) as keyof EventTypes, { effect, params });
}

export function removePostProcessEffect(
  effect: PostEffectName,
  background?: boolean
): void {
  GlobalEventBus.emit(getEventName('effect:remove', background) as keyof EventTypes, { effect });
}

export function clearPostProcessEffects(background?: boolean): void {
  GlobalEventBus.emit(getEventName('effect:clear', background) as keyof EventTypes, undefined);
}

// === Example Presets ===

export function applyWarmCinematicEffect(background?: boolean): void {
  setPostProcessEffect([
    { effect: 'chromaticAberration' },
    {
      effect: 'cinematicGrading',
      params: {
        exposure: 2.0,
        contrast: 1.0,
        saturation: 1.4,
        temperature: 0.85,
        tint: -0.05,
        vignetteStrength: 1.45,
        filmGrainStrength: 0.08,
        shadowsLift: 0.01,
        highlightsGain: 0.4,
        cinematicIntensity: 0.002,
      },
    },
  ], background);
}

export function applyCoolCinematicEffect(background?: boolean): void {
  setPostProcessEffect([
    {
      effect: 'cinematicGrading',
      params: {
        exposure: 0.95,
        contrast: 1.0,
        saturation: 0.9,
        temperature: -0.2,
        tint: 0.1,
        vignetteStrength: 0.4,
        filmGrainStrength: 0.12,
        shadowsLift: -0.05,
        highlightsGain: 1.1,
        cinematicIntensity: 0.8,
      },
    },
  ], background);
}

export function applyUnderwaterEffectHard(background?: boolean): void {
  setPostProcessEffect([
    {
      effect: 'underwater',
      params: {
        waveIntensity: 0.008,
        waveSpeed: 0.03,
        causticIntensity: 0.005,
        depthTint: 0.65,
        bubbleIntensity: 0.00,
        distortionAmount: 0.42,
      },
    },
  ], background);
}

export function applyUnderwaterEffect(background?: boolean): void {
  setPostProcessEffect([
    {
      effect: 'underwater',
      params: {
        waveIntensity: 0.008,
        waveSpeed: 0.03,
        causticIntensity: 0.005,
        depthTint: 0.35,
        bubbleIntensity: 0.00,
        distortionAmount: 0.08,
      },
    },
  ], background);
}