// src/ui/primitives/WindowBox.ts

export interface WindowTab {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export function drawWindow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  title?: string,
  tabs?: WindowTab[],
  mouse?: { x: number; y: number },
  clicked?: boolean
): boolean { // Return whether a tab was clicked
  // === Draw window background ===
  ctx.fillStyle = '#111';
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.stroke();

  if (title) {
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(title, x + 42, y + 16);
  }

  let tabWasClicked = false;

  if (tabs && tabs.length > 0) {
    const tabHeight = 24;
    const tabWidth = Math.floor((width - 16) / tabs.length);

    // Loop through all the tabs to determine if one was clicked
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const tx = x + 8 + i * tabWidth;
      const ty = y - tabHeight;
      const tw = tabWidth - 4;

      const isHovered =
        mouse &&
        mouse.x >= tx &&
        mouse.x <= tx + tw &&
        mouse.y >= ty &&
        mouse.y <= ty + tabHeight;

      // Fire tab click if mouse is clicked
      if (clicked && isHovered) {
        tabs.forEach(t => t.isActive = false); // Reset all tabs
        tab.isActive = true; // Set clicked tab as active
        tab.onClick();
        tabWasClicked = true;
      }

      // Render the tab based on its active state
      ctx.fillStyle = tab.isActive ? '#333' : '#222';
      ctx.strokeStyle = '#555';
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, tabHeight, [8, 8, 0, 0]);
      ctx.fill();
      ctx.stroke();

      // Draw the tab label with active/inactive colors
      ctx.fillStyle = tab.isActive ? '#fff' : '#aaa';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tab.label, tx + tw / 2, ty + tabHeight / 2);
    }

    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  return tabWasClicked;
}
