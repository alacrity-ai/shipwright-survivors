/**
 * Global browser input guards to prevent default behaviors
 * that interfere with canvas-based games.
 */
export function bootstrapGlobalGuards(): void {
  // Disable right-click context menu
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  // Disable drag-and-drop file opening in browser
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  // Prevent arrow keys and spacebar from scrolling the page
  window.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;

    // Allow if typing in inputs or editable content
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    switch (e.code) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Space':
      case 'Tab':
        e.preventDefault();
        break;
    }
  });

  // Disable middle mouse button scroll (auto-scroll wheel click)
  window.addEventListener('mousedown', (e) => {
    if (e.button === 1) {
      e.preventDefault();
    }
  });
}
