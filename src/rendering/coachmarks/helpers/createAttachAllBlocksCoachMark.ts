// src/rendering/coachmarks/helpers/createAttachAllBlocksCoachMark.ts

import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';
import type { CoachMarkManager } from '@/rendering/coachmarks/CoachMarkManager';

import { getUniformScaleFactor } from '@/config/view';

export function createAttachAllBlocksCoachMark(
  coachMarkManager: CoachMarkManager,
  screenX: number,
  screenY: number
): void {
  const lastUsedDevice = InputDeviceTracker.getInstance().getLastUsed(); // 'keyboard' | 'gamepad'

  const scale = getUniformScaleFactor();

  // Create text coachmark
  coachMarkManager.createScreenCoachMark(
    'Attach All Blocks!',
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
    310,
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
        highlightButton: 'B',
        radius: 50,
        fontSize: 18,
        borderColor: '#ff0000ff',
        fillColor: '#001a00',
        highlightColor: '#c40f0fff',
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
        keyLabel: 'E',
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
