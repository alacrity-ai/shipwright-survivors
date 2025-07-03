// src/rendering/coachmarks/helpers/createOpenTradePostCoachMark.ts

import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';
import type { CoachMarkManager } from '@/rendering/coachmarks/CoachMarkManager';

/**
 * Creates a coach mark for opening trade post communications.
 * Will show either the "C" keyboard key or the "A" face button on a gamepad.
 */
export function createOpenTradePostCoachMark(
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
        keyLabel: 'C',
        width: 50,
        height: 50,
        fontSize: 24,
        borderColor: '#00FF66',
        fillColor: '#001a00',
        textColor: '#00FF66',
        duration: Infinity,
      }
    );
  }
}
