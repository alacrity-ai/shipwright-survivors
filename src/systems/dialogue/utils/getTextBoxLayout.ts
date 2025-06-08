// src/systems/dialogue/utils/getTextBoxLayout.ts

import { getUniformScaleFactor } from '@/config/view';
import { MenuManager } from '@/ui/MenuManager';

type DialogueLayoutOptions = {
  mode: 'inPerson' | 'transmission';
  side: 'left' | 'right';
  fontOverride?: string;
  forceErgonomic?: boolean; // <-- new
};

export function getTextBoxLayout(options: DialogueLayoutOptions) {
  const { mode, fontOverride, forceErgonomic = true } = options;

  const uiScale = getUniformScaleFactor();
  const isInPerson = mode === 'inPerson';

  // Ergonomic override: force 'right' if any menu is open
  let side: 'left' | 'right' = options.side;
  if (forceErgonomic && MenuManager.getInstance().anyOpen()) {
    side = 'right';
  }

  const isRightSide = side === 'right';

  const textBoxRect = isInPerson
    ? {
        x: 320 * uiScale,
        y: 120 * uiScale,
        width: 520 * uiScale,
        height: 140 * uiScale,
      }
    : isRightSide
      ? {
          x: 590 * uiScale,
          y: 20 * uiScale,
          width: 500 * uiScale,
          height: 120 * uiScale,
        }
      : {
          x: 180 * uiScale,
          y: 20 * uiScale,
          width: 500 * uiScale,
          height: 120 * uiScale,
        };

  const position = isInPerson
    ? { x: 80 * uiScale, y: 420 * uiScale }
    : isRightSide
      ? { x: 1130 * uiScale, y: 20 * uiScale }
      : { x: 20 * uiScale, y: 20 * uiScale };

  const baseFontSize = isInPerson ? 24 : 20;
  const font = fontOverride ?? `${Math.round(baseFontSize * uiScale)}px monospace`;

  return { textBoxRect, position, font };
}
