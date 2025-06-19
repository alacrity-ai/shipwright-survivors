// src/rendering/coachmarks/helpers/createBlockDropDecisionMenuCoachMark.ts

import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';
import type { CoachMarkManager } from '@/rendering/coachmarks/CoachMarkManager';

const BUTTON_RADIUS = 12;
const BUTTON_FONT_SIZE = 12;

const KEY_WIDTH = 20;
const KEY_HEIGHT = 20;
const KEY_FONT_SIZE = 12;

const GAP_X = 76;
const GAP_Y = 24;

export function createBlockDropDecisionMenuCoachMark(
  coachMarkManager: CoachMarkManager,
  baseX: number = 200,
  baseY: number = 300
): void {
  const inputDevice = InputDeviceTracker.getInstance().getLastUsed();

  if (inputDevice === 'gamepad') {
    // Xbox standard face button colors
    const buttonStyles: Record<string, { fillColor: string; borderColor: string; highlightColor: string }> = {
      Y: {
        fillColor: '#f9d600',       // Yellow
        borderColor: '#a58d00',
        highlightColor: '#ffff66',
      },
      B: {
        fillColor: '#ff3c28',       // Red
        borderColor: '#99231b',
        highlightColor: '#ff7a6f',
      },
      X: {
        fillColor: '#3c7fff',       // Blue
        borderColor: '#104fa9',
        highlightColor: '#81aaff',
      },
      A: {
        fillColor: '#00cc00',       // Green
        borderColor: '#006600',
        highlightColor: '#66ff66',
      },
    };

    const sharedBase = {
      type: 'gamepadFaceButton' as const,
      radius: BUTTON_RADIUS,
      fontSize: BUTTON_FONT_SIZE,
      textColor: '#FFFFFF',
      duration: Infinity,
    };

    coachMarkManager.createScreenCoachMark(
      '',
      baseX - GAP_X,
      baseY - GAP_Y,
      {
        ...sharedBase,
        label: 'Y',
        ...buttonStyles.Y,
      }
    );

    coachMarkManager.createScreenCoachMark(
      '',
      baseX + GAP_X,
      baseY - GAP_Y,
      {
        ...sharedBase,
        label: 'B',
        ...buttonStyles.B,
      }
    );

    coachMarkManager.createScreenCoachMark(
      '',
      baseX - GAP_X,
      baseY + GAP_Y,
      {
        ...sharedBase,
        label: 'X',
        ...buttonStyles.X,
      }
    );

    coachMarkManager.createScreenCoachMark(
      '',
      baseX + GAP_X,
      baseY + GAP_Y,
      {
        ...sharedBase,
        label: 'A',
        ...buttonStyles.A,
      }
    );
  } else {
    const sharedStyle = {
      type: 'key' as const,
      width: KEY_WIDTH,
      height: KEY_HEIGHT,
      fontSize: KEY_FONT_SIZE,
      borderColor: '#00FFFF',
      fillColor: '#001122',
      textColor: '#00FFFF',
      duration: Infinity,
    };

    coachMarkManager.createScreenCoachMark(
      '',
      baseX - GAP_X,
      baseY - GAP_Y,
      {
        ...sharedStyle,
        keyLabel: 'W',
      }
    );

    coachMarkManager.createScreenCoachMark(
      '',
      baseX + GAP_X,
      baseY - GAP_Y,
      {
        ...sharedStyle,
        keyLabel: 'D',
      }
    );

    coachMarkManager.createScreenCoachMark(
      '',
      baseX - GAP_X,
      baseY + GAP_Y,
      {
        ...sharedStyle,
        keyLabel: 'A',
      }
    );

    coachMarkManager.createScreenCoachMark(
      '',
      baseX + GAP_X,
      baseY + GAP_Y,
      {
        ...sharedStyle,
        keyLabel: 'S',
      }
    );
  }
}
