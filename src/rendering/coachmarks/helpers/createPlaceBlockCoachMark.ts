// src/rendering/coachmarks/helpers/createPlaceBlockCoachMark.ts

import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';
import type { CoachMarkManager } from '@/rendering/coachmarks/CoachMarkManager';

import { getUniformScaleFactor } from '@/config/view';

export function createPlaceBlockCoachMark(
  coachMarkManager: CoachMarkManager,
  screenX: number,
  screenY: number
): void {
  const lastUsedDevice = InputDeviceTracker.getInstance().getLastUsed(); // 'keyboard' | 'gamepad'

  const scale = getUniformScaleFactor();

  // Create text coachmark
  coachMarkManager.createScreenCoachMark(
    'Attach Block!',
    200 * scale,
    200 * scale,
    {
      type: 'text',
      textColor: '#00FFFF',
      fontSize: 24,
      duration: Infinity,
    }
  );

  // Draw Arrow pointing to button
  coachMarkManager.createScreenCoachMark(
    '',
    360,
    600,
    {
      type: 'arrow',
      arrowDirection: 'down',
      arrowLength: 32,
      arrowColor: '#00FFFF',
      duration: Infinity,
    }
  );

  if (lastUsedDevice === 'gamepad') {
    coachMarkManager.createScreenCoachMark(
      '',
      screenX,
      screenY,
      {
        type: 'gamepadFaceButtons',
        highlightButton: 'A',
        radius: 50,
        fontSize: 18,
        borderColor: '#00FF66',
        fillColor: '#001a00',
        highlightColor: '#00FF66',
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
        keyLabel: 'Q',
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
