// src/ui/menus/helpers/getDropdownHoverInfo.ts

import { CRTDropDown } from '@/ui/primitives/CRTDropDown';
import { isMouseOverRect } from './isMouseOverRect';

interface MousePoint {
  x: number;
  y: number;
}

interface DropdownHoverInfo {
  isHovered: boolean;
  hoverIndex?: number;
}

/**
 * Computes hover state and item hover index for a CRTDropDown.
 *
 * @param dropdown - The dropdown to evaluate
 * @param mouse - Mouse position in screen space
 * @param scale - UI scaling factor
 * @returns Hover info
 */
export function getDropdownHoverInfo(
  dropdown: CRTDropDown,
  mouse: MousePoint,
  scale: number
): DropdownHoverInfo {
  const { x, y, width, height, isOpen, items } = dropdown;

  const baseRect = { x, y, width, height };
  const isHovered = isMouseOverRect(mouse.x, mouse.y, baseRect, scale);

  if (!isOpen) {
    return { isHovered };
  }

  const itemHeight = height * scale;

  for (let i = 0; i < items.length; i++) {
    const itemY = y + height * scale + i * itemHeight;
    const itemRect = { x, y: itemY, width, height };
    if (isMouseOverRect(mouse.x, mouse.y, itemRect, scale)) {
      return { isHovered, hoverIndex: i };
    }
  }

  return { isHovered };
}
