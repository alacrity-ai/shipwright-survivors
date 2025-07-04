// src/rendering/coachmarks/helpers/createZoomCoachMark.ts

import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';
import type { CoachMarkManager } from '@/rendering/coachmarks/CoachMarkManager';

/**
 * Creates a zoom-related coach mark at a given screen position,
 * depending on the last used input device:
 * - 🖱️ Mouse: scroll wheel (interactionMode: 'scroll')
 * - 🎮 Gamepad: up/down D-pad highlights
 */
export function createZoomCoachMark(
  coachMarkManager: CoachMarkManager,
  screenX: number,
  screenY: number
): void {
  const lastUsedDevice = InputDeviceTracker.getInstance().getLastUsed(); // 'keyboard' | 'gamepad'

  if (lastUsedDevice === 'gamepad') {
    coachMarkManager.createScreenCoachMark(
      '',
      screenX,
      screenY,
      {
        type: 'gamepadDpad',
        highlightDirections: ['up', 'down'],
        size: 60,
        borderColor: '#00FFFF',
        fillColor: '#001122',
        highlightColor: '#00FFFF',
        duration: Infinity,
      }
    );
  } else {
    coachMarkManager.createScreenCoachMark(
      '',
      screenX,
      screenY,
      {
        type: 'mouse',
        interactionMode: 'scroll',
        width: 60,
        height: 90,
        borderColor: '#00FFFF',
        fillColor: '#001122',
        highlightColor: '#00FFFF',
        duration: Infinity,
      }
    );
  }
}
