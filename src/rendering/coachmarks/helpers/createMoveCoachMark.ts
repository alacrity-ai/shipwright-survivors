// src/rendering/coachmarks/helpers/createMoveCoachMark.ts

import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';
import type { CoachMarkManager } from '@/rendering/coachmarks/CoachMarkManager';

import { getUniformScaleFactor } from '@/config/view';

export function createMoveCoachMark(coachMarkManager: CoachMarkManager, screenX: number, screenY: number): void {
  const inputDevice = InputDeviceTracker.getInstance().getLastUsed();

  const scale = getUniformScaleFactor();

  // Create text coachmark
  coachMarkManager.createScreenCoachMark(
    'Move Ship!',
    200 * scale,
    200 * scale,
    {
      type: 'text',
      textColor: '#00FFFF',
      fontSize: 24,
      duration: Infinity,
    }
  );

  if (inputDevice === 'gamepad') {
    coachMarkManager.createScreenCoachMark(
      '',
      screenX,
      screenY,
      {
        type: 'gamepadSticks',
        wiggleStick: 'left',
        highlightStick: 'left',
        width: 120,
        height: 60,
        borderColor: '#00FFFF',
        fillColor: '#001122',
        highlightColor: '#00FFFF',
        duration: Infinity,
      }
    );
  } else {
    const offset = 80;

    const keyStyle = {
      type: 'key' as const,
      width: 50,
      height: 50,
      fontSize: 24,
      borderColor: '#00FFFF',
      fillColor: '#001122',
      textColor: '#00FFFF',
      duration: Infinity,
    };

    // W (top center)
    coachMarkManager.createScreenCoachMark(
      '',
      screenX,
      screenY - offset,
      {
        ...keyStyle,
        keyLabel: 'W',
      }
    );

    // A (left)
    coachMarkManager.createScreenCoachMark(
      '',
      screenX - offset,
      screenY,
      {
        ...keyStyle,
        keyLabel: 'A',
      }
    );

    // S (center)
    coachMarkManager.createScreenCoachMark(
      '',
      screenX,
      screenY,
      {
        ...keyStyle,
        keyLabel: 'S',
      }
    );

    // D (right)
    coachMarkManager.createScreenCoachMark(
      '',
      screenX + offset,
      screenY,
      {
        ...keyStyle,
        keyLabel: 'D',
      }
    );
  }
}
