// src/rendering/coachmarks/helpers/createAfterBurnerCoachMark.ts

import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';
import type { CoachMarkManager } from '@/rendering/coachmarks/CoachMarkManager';

export function createAfterBurnerCoachMark(coachMarkManager: CoachMarkManager, screenX: number, screenY: number): void {
  const inputDevice = InputDeviceTracker.getInstance().getLastUsed();

  if (inputDevice === 'gamepad') {
    coachMarkManager.createScreenCoachMark(
      '',
      screenX,
      screenY,
      {
        type: 'gamepadShoulders',
        highlighted: ['leftBumper'],
        width: 160,
        height: 80,
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
        type: 'key',
        keyLabel: 'Shift',
        width: 60,
        height: 60,
        fontSize: 24,
        borderColor: '#00FFFF',
        fillColor: '#001122',
        textColor: '#00FFFF',
        duration: Infinity,
      }
    );
  }
}
