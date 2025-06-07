// src/ui/menus/helpers/isMouseOverRect.ts

export function isMouseOverRect(
  mouseX: number,
  mouseY: number,
  rect: { x: number; y: number; width: number; height: number },
  scale: number
): boolean {
  const sx = rect.x; // unscaled
  const sy = rect.y;
  const sw = rect.width * scale;
  const sh = rect.height * scale;

  return mouseX >= sx && mouseX <= sx + sw &&
         mouseY >= sy && mouseY <= sy + sh;
}
