// src/rendering/coachmarks/helpers/createToggleFiringModeCoachMark.ts

import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';
import type { CoachMarkManager } from '@/rendering/coachmarks/CoachMarkManager';

/**
 * Creates a coach mark for toggling firing mode, based on the last used input device.
 * Will show either a keyboard "X" key or a gamepad "X" face button.
 */
export function createToggleFiringModeCoachMark(
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
        type: 'gamepadFaceButtons',
        highlightButton: 'X',
        radius: 50,
        fontSize: 18,
        borderColor: '#00FFFF',
        fillColor: '#001122',
        highlightColor: '#00FFFF',
        textColor: '#FFFFFF',
        duration: Infinity,
      }
    );
  } else {
    coachMarkManager.createScreenCoachMark(
      '',
      screenX,
      screenY,
      {
        type: 'key',
        keyLabel: 'X',
        width: 50,
        height: 50,
        fontSize: 24,
        borderColor: '#00FFFF',
        fillColor: '#001122',
        textColor: '#00FFFF',
        duration: Infinity,
      }
    );
  }
}
