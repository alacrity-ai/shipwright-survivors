// src/rendering/coachmarks/helpers/createFirePrimaryCoachMark.ts

import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';
import type { CoachMarkManager } from '@/rendering/coachmarks/CoachMarkManager';

export function createFirePrimaryCoachMark(coachMarkManager: CoachMarkManager, screenX: number, screenY: number): void {
  const inputDevice = InputDeviceTracker.getInstance().getLastUsed();

  if (inputDevice === 'gamepad') {
    coachMarkManager.createScreenCoachMark(
      '',
      screenX,
      screenY,
      {
        type: 'gamepadShoulders',
        highlighted: ['rightBumper'],
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
        type: 'mouse',
        interactionMode: 'leftClick',
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
