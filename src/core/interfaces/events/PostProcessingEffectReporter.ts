// src/core/interfaces/events/PostProcessingEffectReporter.ts

import { GlobalEventBus } from '@/core/EventBus';
import type { PostEffectName, CinematicGradingParams } from '@/rendering/unified/passes/PostProcessPass';

export function setPostProcessEffect(
  effectChain: { effect: PostEffectName; params?: CinematicGradingParams }[]
): void {
  GlobalEventBus.emit('postprocess:effect:set', { effectChain });
}

export function addPostProcessEffect(
  effect: PostEffectName,
  params?: CinematicGradingParams
): void {
  GlobalEventBus.emit('postprocess:effect:add', { effect, params });
}

export function removePostProcessEffect(effect: PostEffectName): void {
  GlobalEventBus.emit('postprocess:effect:remove', { effect });
}

export function clearPostProcessEffects(): void {
  GlobalEventBus.emit('postprocess:effect:clear', undefined);
}

// BEST YET
export function applyWarmCinematicEffect(): void {
  GlobalEventBus.emit('postprocess:effect:set', {
    effectChain: [
      {
        effect: 'cinematicGrading',
        params: {
          exposure: 1.9,
          contrast: 1.0,
          saturation: 1.15,
          temperature: 0.25,
          tint: -0.05,
          vignetteStrength: 0.25,
          filmGrainStrength: 0.08,
          shadowsLift: -0.01,
          highlightsGain: 0.4,
          cinematicIntensity: 0.002,
        },
      },
    ],
  });
}


// BEST YET
// export function applyWarmCinematicEffect(): void {
//   GlobalEventBus.emit('postprocess:effect:set', {
//     effectChain: [
//       {
//         effect: 'cinematicGrading',
//         params: {
//           exposure: 1.9,
//           contrast: 1.0,
//           saturation: 1.15,
//           temperature: 0.45,
//           tint: -0.05,
//           vignetteStrength: 0.25,
//           filmGrainStrength: 0.08,
//           shadowsLift: -0.01,
//           highlightsGain: 0.4,
//           cinematicIntensity: 0.014,
//         },
//       },
//     ],
//   });
// }


export function applyCoolCinematicEffect(): void {
  GlobalEventBus.emit('postprocess:effect:set', {
    effectChain: [
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
    ],
  });
}

export function applyVintageFilmEffect(): void {
  GlobalEventBus.emit('postprocess:effect:set', {
    effectChain: [
      {
        effect: 'cinematicGrading',
        params: {
          exposure: 0.5,
          contrast: 1.0,
          saturation: 1.2,
          temperature: 0.25,
          tint: -0.1,
          vignetteStrength: 0.5,
          filmGrainStrength: 0.2,
          shadowsLift: 0.1,
          highlightsGain: 0.9,
          cinematicIntensity: 0.7,
        },
      },
    ],
  });
}

export function applyLightCinematicEffect(): void {
  GlobalEventBus.emit('postprocess:effect:set', {
    effectChain: [
      {
        effect: 'cinematicGrading',
        params: {
          exposure: 1.02,             // Slight lift
          contrast: 1.08,             // Mild pop to midtones
          saturation: 1.03,           // Barely more vivid
          temperature: 0.05,          // Gentle warm push
          tint: 0.0,
          vignetteStrength: 0.15,     // Very subtle darkening at edges
          filmGrainStrength: 0.04,    // Imperceptible unless looking
          shadowsLift: 0.01,          // Slight lift to blacks
          highlightsGain: 1.01,        // Gentle white gain
          cinematicIntensity: 0.5,    // Half intensity
        },
      },
    ],
  });
}
