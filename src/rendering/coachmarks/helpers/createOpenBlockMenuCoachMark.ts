// src/rendering/coachmarks/helpers/createOpenBlockMenuCoachMark.ts

import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';
import type { CoachMarkManager } from '@/rendering/coachmarks/CoachMarkManager';

export function createOpenBlockMenuCoachMark(
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
        highlightButton: 'Y',
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
        keyLabel: 'Tab',
        width: 50, // Wider for longer label
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
